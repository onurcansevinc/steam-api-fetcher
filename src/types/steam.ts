import CEconItem from '../classes/CEconItem';

// Options for configuring the SteamAPI instance
export interface SteamAPIOptions {
    apiKey?: string; // Steam Web API key for GetPlayerSummaries
    proxy?: string | string[];
    proxyRepeat?: number;
    retryDelay?: number;
    requestOptions?: RequestOptions;
    requestTimeout?: number;
}

// Options for customizing HTTP requests
export interface RequestOptions {
    uri?: (steamid: string, appid: number, contextid: number) => string;
    url?: (steamid: string, appid: number, contextid: number) => string;
    qs?: Record<string, any>;
    headers?: Record<string, string>;
    timeout?: number;
    [key: string]: any;
}

// Response structure from Steam inventory API
export interface SteamInventoryResponse {
    success: boolean;
    total_inventory_count: number;
    assets: SteamAsset[];
    descriptions: SteamDescription[];
    more_items?: boolean;
    last_assetid?: string;
    error?: string;
    Error?: string;
}

// Asset data structure from Steam API
export interface SteamAsset {
    assetid: string;
    classid: string;
    instanceid: string;
    amount: string;
    currencyid?: string;
    pos?: number;
}

// Description data structure from Steam API
export interface SteamDescription {
    classid: string;
    instanceid?: string;
    tradable?: number;
    [key: string]: any;
}

// Result structure returned by the get() method
export interface InventoryResult {
    inventory: CEconItem[];
    currency: CEconItem[];
    total_inventory_count: number;
}

// Custom error type for Steam API errors
export interface SteamAPIError extends Error {
    statusCode?: number;
    code?: number;
}

// Player summary from Steam API
export interface PlayerSummary {
    steamid: string;
    communityvisibilitystate: number;
    profilestate: number;
    personaname: string;
    profileurl: string;
    avatar: string;
    avatarmedium: string;
    avatarfull: string;
    avatarhash: string;
    lastlogoff?: number;
    personastate?: number;
    realname?: string;
    primaryclanid?: string;
    timecreated?: number;
    personastateflags?: number;
    loccountrycode?: string;
    locstatecode?: string;
    loccityid?: number;
}

// Response structure from GetPlayerSummaries API
export interface GetPlayerSummariesResponse {
    response: {
        players: PlayerSummary[];
    };
}
