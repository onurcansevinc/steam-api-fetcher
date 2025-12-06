// credits to DoctorMcKay
// from node-steamcommunity which is licensed under MIT License
// https://github.com/DoctorMcKay/node-steamcommunity/blob/master/classes/CEconItem.js

export interface CEconItemTag {
    internal_name: string;
    name: string;
    category: string;
    color: string;
    category_name: string;
}

export interface CEconItemOwnerDescription {
    value?: string;
    [key: string]: any;
}

export interface CEconItemAction {
    [key: string]: any;
}

export interface CEconItemOwner {
    [key: string]: any;
}

// CEconItem - Represents a Steam economy item
// Based on DoctorMcKay's node-steamcommunity CEconItem class
export default class CEconItem {
    // Asset properties
    public assetid?: string;
    public id!: string;
    public currencyid?: string;
    public classid!: string;
    public instanceid!: string;
    public amount!: number;
    public contextid!: string;
    public pos?: number;

    // Currency flag
    public is_currency!: boolean;

    // Tradeability flags
    public tradable!: boolean;
    public marketable!: boolean;
    public commodity!: boolean;
    public market_tradable_restriction!: number;
    public market_marketable_restriction!: number;

    // Descriptions and metadata
    public fraudwarnings!: any[];
    public descriptions!: any[];
    public tags?: CEconItemTag[];
    public owner?: CEconItemOwner | null;
    public owner_descriptions?: CEconItemOwnerDescription[];

    // Market properties
    public market_hash_name?: string;
    public market_fee_app?: number;
    public appid?: number | string;

    // Expiration
    public cache_expiration?: string;
    public item_expiration?: string;

    // Actions
    public actions?: CEconItemAction[] | string;

    // Image URLs
    public icon_url?: string;
    public icon_url_large?: string;

    // Additional properties from description
    [key: string]: any;

    // Creates a new CEconItem instance
    constructor(item: any, description: any, contextID: number | string) {
        // Copy all properties from item
        for (const key in item) {
            if (item.hasOwnProperty(key)) {
                (this as any)[key] = item[key];
            }
        }

        const isCurrency =
            !!(this.is_currency || (this as any).currency) ||
            typeof this.currencyid !== 'undefined';

        if (isCurrency) this.currencyid = this.id = this.id || this.currencyid || '';
        else this.assetid = this.id = this.id || this.assetid || '';

        this.instanceid = this.instanceid || '0';
        this.amount = parseInt(String(this.amount), 10);
        this.contextid = this.contextid || String(contextID);

        // Merge the description
        if (description) {
            // Is this a listing of descriptions?
            if (
                description[this.classid + '_' + this.instanceid] &&
                typeof description === 'object'
            )
                description = description[this.classid + '_' + this.instanceid];

            for (const key in description) {
                if (description.hasOwnProperty(key) && !this.hasOwnProperty(key))
                    (this as any)[key] = description[key];
            }
        }

        this.is_currency = isCurrency;
        this.tradable = !!this.tradable;
        this.marketable = !!this.marketable;
        this.commodity = !!this.commodity;
        this.market_tradable_restriction = this.market_tradable_restriction
            ? parseInt(String(this.market_tradable_restriction), 10)
            : 0;
        this.market_marketable_restriction = this.market_marketable_restriction
            ? parseInt(String(this.market_marketable_restriction), 10)
            : 0;
        this.fraudwarnings = this.fraudwarnings || [];
        this.descriptions = this.descriptions || [];

        if (this.owner && JSON.stringify(this.owner) === '{}') {
            this.owner = null;
        }

        // Restore old property names of tags
        if (this.tags && Array.isArray(this.tags)) {
            this.tags = this.tags.map((tag: any) => {
                return {
                    internal_name: tag.internal_name,
                    name: tag.localized_tag_name || tag.name,
                    category: tag.category,
                    color: tag.color || '',
                    category_name: tag.localized_category_name || tag.category_name,
                };
            });
        }

        // Restore market_fee_app, if applicable
        let match: RegExpMatchArray | null = null;
        if (
            this.appid == 753 &&
            this.contextid == '6' &&
            this.market_hash_name &&
            (match = this.market_hash_name.match(/^(\d+)\-/))
        ) {
            this.market_fee_app = parseInt(match[1], 10);
        }

        // Restore cache_expiration, if we can (for CS:GO items)
        if (this.appid == 730 && this.contextid == '2' && this.owner_descriptions) {
            const description = this.owner_descriptions.find(
                (d) => d.value && d.value.indexOf('Tradable/Marketable After ') === 0
            );
            if (description && description.value) {
                const date = new Date(description.value.substring(26).replace(/[,()]/g, ''));
                if (date && !isNaN(date.getTime())) {
                    this.cache_expiration = date.toISOString();
                }
            }
        }

        // If we have item_expiration, also set cache_expiration to the same value
        if (this.item_expiration) {
            this.cache_expiration = this.item_expiration;
        }

        if (this.actions === '') {
            this.actions = [];
        }

        // One wouldn't think that we need this if statement, but apparently v8 has a weird bug/quirk where deleting a
        // property results in greatly increased memory usage. Because that makes sense.
        if ((this as any).currency) {
            delete (this as any).currency;
        }
    }

    // Gets the image URL for this item
    public getImageURL(): string {
        return 'https://steamcommunity-a.akamaihd.net/economy/image/' + this.icon_url + '/';
    }

    // Gets the large image URL for this item
    public getLargeImageURL(): string {
        if (!this.icon_url_large) {
            return this.getImageURL();
        }

        return 'https://steamcommunity-a.akamaihd.net/economy/image/' + this.icon_url_large + '/';
    }

    // Gets a tag by category
    public getTag(category: string): CEconItemTag | null {
        if (!this.tags) {
            return null;
        }

        for (let i = 0; i < this.tags.length; i++) {
            if (this.tags[i].category === category) {
                return this.tags[i];
            }
        }

        return null;
    }
}
