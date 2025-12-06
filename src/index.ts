import SteamID from 'steamid';
import CEconItem from './classes/CEconItem';
import { HttpsProxyAgent } from 'https-proxy-agent';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import type {
    SteamAPIOptions,
    RequestOptions,
    SteamInventoryResponse,
    SteamDescription,
    InventoryResult,
    SteamAPIError,
    PlayerSummary,
    GetPlayerSummariesResponse,
} from './types';

declare const setTimeout: (callback: () => void, ms: number) => any;

// Maximum items per page in Steam inventory API
export const ITEMS_PER_PAGE = 2000;

// SteamAPI - Fetches Steam user inventories and player data with proxy support and retry mechanisms
export class SteamAPI {
    public static CEconItem: typeof CEconItem = CEconItem;

    private apiKey?: string;
    private useProxy: boolean;
    private proxys?: string[];
    private proxyRepeat: number;
    private proxy: () => string | undefined;
    private retryDelay: number;
    private requestOptions: RequestOptions;
    private requestTimeout: number;

    // A Steam API instance
    constructor(options: SteamAPIOptions = {}) {
        this.apiKey = options.apiKey;
        this.useProxy = !!options.proxy;

        if (Array.isArray(options.proxy)) {
            this.proxys = options.proxy;
        } else if (options.proxy) {
            this.proxys = [options.proxy];
        }

        this.proxyRepeat = options.proxyRepeat || 1;
        this.proxy = rotate(this.proxys || [], this.proxyRepeat);

        this.retryDelay = options.retryDelay || 0;
        this.requestOptions = options.requestOptions || {};
        this.requestTimeout = options.requestTimeout || 9000;
    }

    // Utility: sleep for given ms
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Utility: build axios request config from default + user requestOptions
    private buildRequestConfig(
        steamID64: string,
        appid: number,
        contextid: number,
        language: string,
        start?: string
    ): AxiosRequestConfig {
        // Default URL (can be overridden by requestOptions.uri or url)
        let url = `https://steamcommunity.com/inventory/${steamID64}/${appid}/${contextid}`;

        if (this.requestOptions.uri) {
            url = this.requestOptions.uri(steamID64, appid, contextid);
        } else if (this.requestOptions.url) {
            url = this.requestOptions.url(steamID64, appid, contextid);
        }

        const defaultHeaders = {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36',
            Referer: `https://steamcommunity.com/profiles/${steamID64}/inventory`,
        };

        const defaultParams: Record<string, any> = {
            l: language, // Default language
            count: ITEMS_PER_PAGE, // Max items per 'page'
            start_assetid: start,
        };

        // Merge user-provided query parameters with defaults (user params take precedence)
        const params = { ...defaultParams, ...(this.requestOptions.qs || {}) };

        const headers = { ...defaultHeaders, ...(this.requestOptions.headers || {}) };

        const config: AxiosRequestConfig = {
            url,
            method: 'GET',
            headers,
            params,
            timeout: this.requestTimeout,
            responseType: 'json',
        };

        // Support timeout override from requestOptions (for backward compatibility)
        if (typeof this.requestOptions.timeout === 'number') {
            config.timeout = this.requestOptions.timeout;
        }

        // Proxy support (via string URL)
        const proxyUrl = this.useProxy ? this.proxy() : undefined;
        if (proxyUrl) {
            // Use https-proxy-agent instead of axios's built-in proxy option for better control
            config.proxy = false;
            config.httpsAgent = new HttpsProxyAgent(proxyUrl);
        }

        return config;
    }

    // Get the contents of a users inventory. Designed to be the same as DoctorMcKay's getUserInventoryContents from node-steamcommunity (with retries)
    public async getPlayerInventory(
        steamid: SteamID | string,
        appid: number,
        contextid: number,
        tradableOnly?: boolean,
        retries: number = 1,
        language: string = 'english'
    ): Promise<InventoryResult> {
        if (!steamid) {
            throw new Error("The user's SteamID is invalid or missing.");
        }

        let steamIDObj: SteamID;
        try {
            steamIDObj = typeof steamid === 'string' ? new SteamID(steamid) : steamid;
            if (!steamIDObj.isValid()) {
                throw new Error("The user's SteamID is invalid.");
            }
        } catch (err) {
            if (err instanceof Error) {
                throw err;
            }
            throw new Error("The user's SteamID is invalid.");
        }

        const steamID64 = steamIDObj.getSteamID64();

        const inventory: CEconItem[] = [];
        const currency: CEconItem[] = [];

        let pos = 1; // Counter to hold the items position in the inventory starting from 1.
        let start: string | undefined = undefined;
        let totalInventoryCount = 0;

        // Global cache for faster description lookup across pages
        const quickDescriptionLookup: Record<string, SteamDescription | undefined> = {};

        const buildDescriptionMap = (descriptions: SteamDescription[]): void => {
            for (const d of descriptions) {
                const key = `${d.classid}_${d.instanceid || '0'}`;
                // Only add if not already cached (avoid overwriting)
                if (!quickDescriptionLookup[key]) {
                    quickDescriptionLookup[key] = d;
                }
            }
        };

        const getDescription = (
            classID: string,
            instanceID?: string
        ): SteamDescription | undefined => {
            const key = `${classID}_${instanceID || '0'}`;
            return quickDescriptionLookup[key];
        };

        let remainingRetries = retries;

        while (true) {
            try {
                const config = this.buildRequestConfig(
                    steamID64,
                    appid,
                    contextid,
                    language,
                    start
                );
                const response = await axios.request<SteamInventoryResponse>(config);
                const res = response.data;

                if (res && res.success && res.total_inventory_count === 0) {
                    // Empty inventory
                    return {
                        inventory: [],
                        currency: [],
                        total_inventory_count: 0,
                    };
                }

                if (!res || !res.success || !res.assets || !res.descriptions) {
                    const errorMessage =
                        res?.error || res?.Error || 'Malformed response from Steam API';
                    throw new Error(errorMessage);
                }

                totalInventoryCount = res.total_inventory_count;

                // Cache all descriptions from this page for faster lookups
                buildDescriptionMap(res.descriptions);

                for (const item of res.assets) {
                    const description = getDescription(item.classid, item.instanceid);

                    if (!tradableOnly || (description && description.tradable)) {
                        // Add position to item (used by CEconItem)
                        const itemWithPos = { ...item, pos: pos++ };
                        const targetArray = item.currencyid ? currency : inventory;
                        targetArray.push(new CEconItem(itemWithPos, description, contextid));
                    }
                }

                if (res.more_items) {
                    start = res.last_assetid;
                    // Continue loop to fetch next page
                    continue;
                }

                // Return result when last page is reached
                return {
                    inventory,
                    currency,
                    total_inventory_count: totalInventoryCount,
                };
            } catch (err: unknown) {
                // Handle axios network/HTTP errors
                if (axios.isAxiosError(err)) {
                    const axiosErr = err as AxiosError;
                    const status = axiosErr.response?.status;

                    // Private/not found errors should not be retried
                    if (status === 403 || status === 404) {
                        const error: SteamAPIError = new Error(
                            status === 403
                                ? 'Profile or inventory is private.'
                                : 'Profile could not be found.'
                        );
                        error.statusCode = status;
                        error.code = status;
                        throw error;
                    }

                    // Retry for other HTTP/network errors
                    if (remainingRetries > 1) {
                        remainingRetries -= 1;
                        await this.delay(this.retryDelay);
                        continue;
                    }

                    throw err;
                }

                // Non-axios errors (e.g., "Malformed response") should not be retried
                throw err;
            }
        }
    }

    // Get player summaries from Steam Web API
    public async getPlayerSummaries(
        steamids: string | string[],
        retries: number = 1
    ): Promise<PlayerSummary[]> {
        if (!this.apiKey) {
            throw new Error('Steam Web API key is required. Set it in SteamAPIOptions.apiKey');
        }

        // Convert single steamid to array
        const steamidArray = Array.isArray(steamids) ? steamids : [steamids];

        if (steamidArray.length === 0) {
            throw new Error('At least one SteamID is required');
        }

        // Validate SteamIDs
        const validSteamIDs: string[] = [];
        for (const steamid of steamidArray) {
            try {
                const steamIDObj = typeof steamid === 'string' ? new SteamID(steamid) : steamid;
                if (steamIDObj.isValid()) {
                    validSteamIDs.push(steamIDObj.getSteamID64());
                }
            } catch {
                // Invalid SteamID, skip it
            }
        }

        if (validSteamIDs.length === 0) {
            throw new Error('No valid SteamIDs provided');
        }

        // Steam API allows up to 100 SteamIDs per request
        const maxSteamIDsPerRequest = 100;
        const allPlayers: PlayerSummary[] = [];
        let remainingRetries = retries;

        for (let i = 0; i < validSteamIDs.length; i += maxSteamIDsPerRequest) {
            const batch = validSteamIDs.slice(i, i + maxSteamIDsPerRequest);
            const steamidsParam = batch.join(',');

            while (true) {
                try {
                    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`;
                    const config: AxiosRequestConfig = {
                        url,
                        method: 'GET',
                        params: {
                            key: this.apiKey,
                            steamids: steamidsParam,
                        },
                        timeout: this.requestTimeout,
                        responseType: 'json',
                    };

                    // Proxy support
                    const proxyUrl = this.useProxy ? this.proxy() : undefined;
                    if (proxyUrl) {
                        config.proxy = false;
                        config.httpsAgent = new HttpsProxyAgent(proxyUrl);
                    }

                    const response = await axios.request<GetPlayerSummariesResponse>(config);
                    const data = response.data;

                    if (!data || !data.response || !Array.isArray(data.response.players)) {
                        throw new Error('Invalid response from Steam API');
                    }

                    allPlayers.push(...data.response.players);

                    // Success, break retry loop
                    break;
                } catch (err: unknown) {
                    // Handle axios network/HTTP errors
                    if (axios.isAxiosError(err)) {
                        const axiosErr = err as AxiosError;
                        const status = axiosErr.response?.status;

                        // 401 = Invalid API key, 403 = Forbidden, 404 = Not found
                        // These should not be retried
                        if (status === 401 || status === 403 || status === 404) {
                            const error: SteamAPIError = new Error(
                                status === 401
                                    ? 'Invalid Steam Web API key'
                                    : status === 403
                                      ? 'Access forbidden'
                                      : 'Steam API endpoint not found'
                            );
                            error.statusCode = status;
                            error.code = status;
                            throw error;
                        }

                        // Retry for other HTTP/network errors
                        if (remainingRetries > 1) {
                            remainingRetries -= 1;
                            await this.delay(this.retryDelay);
                            continue;
                        }

                        throw err;
                    }

                    // Non-axios errors should not be retried
                    throw err;
                }
            }

            // Reset retries for next batch
            remainingRetries = retries;

            // Add small delay between batches to respect rate limits
            if (i + maxSteamIDsPerRequest < validSteamIDs.length) {
                await this.delay(100);
            }
        }

        return allPlayers;
    }
}

// Creates a function that rotates through an array, repeating each element a specified number of times before moving to the next.
function rotate<T>(arr: T[], repeat: number): () => T | undefined {
    // Validate inputs
    if (!Array.isArray(arr) || arr.length === 0) {
        return () => undefined;
    }

    // Ensure repeat is at least 1
    const repeatCount = Math.max(1, Math.floor(repeat));

    let currentIndex = 0;
    let currentRepeat = 0;

    return (): T | undefined => {
        // Get current item
        const item = arr[currentIndex];

        // Increment repeat counter
        currentRepeat++;

        // If we've repeated enough times, move to next item
        if (currentRepeat >= repeatCount) {
            currentRepeat = 0;
            currentIndex = (currentIndex + 1) % arr.length; // Wrap around using modulo
        }

        return item;
    };
}

// CEconItem - the class used to represent an item. https://github.com/DoctorMcKay/node-steamcommunity/wiki/CEconItem
SteamAPI.CEconItem = CEconItem;

export default SteamAPI;
