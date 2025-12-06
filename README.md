# steam-inventory-fetcher

A TypeScript library for fetching Steam user inventories and player data with proxy support and retry mechanisms.

## Features

- 🔍 **Fetch Steam Inventories** - Get user inventories for any Steam game
- 👤 **Get Player Summaries** - Retrieve player profile information via Steam Web API
- 🔄 **Automatic Retry** - Built-in retry mechanism for failed requests
- 🌐 **Proxy Support** - Rotate through multiple proxies with configurable repeat counts
- 📦 **TypeScript** - Full TypeScript support with comprehensive type definitions
- ⚡ **Modern** - Built with async/await and modern JavaScript features
- 🛡️ **Error Handling** - Comprehensive error handling with custom error types

## Installation

```bash
npm install steam-inventory-fetcher
```

## Quick Start

### Basic Inventory Fetch

```typescript
import SteamAPI from 'steam-inventory-fetcher';

const api = new SteamAPI({
    requestTimeout: 10000,
    retryDelay: 1000,
});

// Fetch TF2 inventory
const result = await api.getPlayerInventory(
    '76561199099521803', // SteamID64
    440, // TF2 appid
    2, // contextid
    false, // tradableOnly
    2, // retries
    'english' // language
);

console.log(`Found ${result.inventory.length} items`);
console.log(`Total count: ${result.total_inventory_count}`);
```

### Get Player Summaries

```typescript
import SteamAPI from 'steam-inventory-fetcher';

const api = new SteamAPI({
    apiKey: 'YOUR_STEAM_WEB_API_KEY', // Get from https://steamcommunity.com/dev/apikey
    requestTimeout: 10000,
});

// Get player summaries
const players = await api.getPlayerSummaries(['76561199099521803', '76561198114402400']);

players.forEach((player) => {
    console.log(`${player.personaname} - ${player.profileurl}`);
});
```

## API Reference

### Constructor Options

```typescript
interface SteamAPIOptions {
    apiKey?: string; // Steam Web API key for GetPlayerSummaries
    proxy?: string | string[]; // Proxy URL(s) for requests
    proxyRepeat?: number; // How many times to use each proxy before rotating (default: 1)
    retryDelay?: number; // Delay between retries in ms (default: 0)
    requestOptions?: RequestOptions; // Custom request options
    requestTimeout?: number; // Request timeout in ms (default: 9000)
}
```

### Methods

#### `getPlayerInventory(steamid, appid, contextid, tradableOnly?, retries?, language?)`

Fetches a user's inventory for a specific game.

**Parameters:**

- `steamid` (string | SteamID): SteamID64 string or SteamID object
- `appid` (number): Steam application ID (e.g., 440 for TF2, 730 for CS:GO)
- `contextid` (number): Context ID within the app (usually 2)
- `tradableOnly` (boolean, optional): Filter to only tradable items (default: false)
- `retries` (number, optional): Number of retry attempts (default: 1)
- `language` (string, optional): Language for item descriptions (default: 'english')

**Returns:** `Promise<InventoryResult>`

```typescript
interface InventoryResult {
    inventory: CEconItem[]; // Array of inventory items
    currency: CEconItem[]; // Array of currency items
    total_inventory_count: number; // Total item count
}
```

**Example:**

```typescript
const result = await api.getPlayerInventory('76561199099521803', 440, 2, false, 2, 'english');

// Access items
result.inventory.forEach((item) => {
    console.log(item.market_hash_name);
    console.log(item.getImageURL());
});
```

#### `getPlayerSummaries(steamids, retries?)`

Fetches player summaries from Steam Web API.

**Parameters:**

- `steamids` (string | string[]): Single SteamID64 or array of SteamID64s (max 100 per request)
- `retries` (number, optional): Number of retry attempts (default: 1)

**Returns:** `Promise<PlayerSummary[]>`

**Example:**

```typescript
const players = await api.getPlayerSummaries(['76561199099521803', '76561198114402400']);

players.forEach((player) => {
    console.log(player.personaname);
    console.log(player.avatarfull);
    console.log(player.realname);
});
```

## Configuration Examples

### With Proxy

```typescript
const api = new SteamAPI({
    proxy: ['http://proxy1.example.com:8080', 'http://proxy2.example.com:8080'],
    proxyRepeat: 2, // Use each proxy 2 times before rotating
    requestTimeout: 10000,
});
```

### Custom Request Options

```typescript
const api = new SteamAPI({
    requestOptions: {
        headers: {
            'Custom-Header': 'value',
        },
        timeout: 15000,
    },
});
```

### Custom Endpoint

```typescript
const api = new SteamAPI({
    requestOptions: {
        uri: (steamid, appid, contextid) => {
            return `https://api.steamapis.com/steam/inventory/${steamid}/${appid}/${contextid}`;
        },
    },
});
```

## Error Handling

The library throws `SteamAPIError` for API-related errors:

```typescript
import { SteamAPIError } from 'steam-inventory-fetcher';

try {
    const result = await api.getPlayerInventory('76561199099521803', 440, 2);
} catch (err) {
    if (err instanceof SteamAPIError) {
        console.error('Status:', err.statusCode);
        console.error('Message:', err.message);
    }
}
```

**Common Errors:**

- `403` - Profile or inventory is private
- `404` - Profile could not be found
- `401` - Invalid Steam Web API key (for GetPlayerSummaries)

## CEconItem

Items are returned as `CEconItem` instances with useful methods:

```typescript
const item = result.inventory[0];

// Get image URLs
const imageUrl = item.getImageURL();
const largeImageUrl = item.getLargeImageURL();

// Get tag by category
const qualityTag = item.getTag('Quality');

// Access properties
console.log(item.market_hash_name);
console.log(item.tradable);
console.log(item.marketable);
```

## Rate Limiting

Steam API has rate limits. When fetching multiple inventories, add delays between requests:

```typescript
const steamIDs = ['76561199099521803', '76561198114402400'];

for (const steamID of steamIDs) {
    const result = await api.get(steamID, 440, 2);
    // Wait 2 seconds before next request
    await new Promise((resolve) => setTimeout(resolve, 2000));
}
```

## Common Game AppIDs

- **Team Fortress 2**: 440
- **Counter-Strike: Global Offensive**: 730
- **Dota 2**: 570
- **Rust**: 252490
- **PUBG**: 578080

Most games use `contextid: 2` for the main inventory context.

## Getting a Steam Web API Key

1. Visit https://steamcommunity.com/dev/apikey
2. Log in with your Steam account
3. Enter a domain name (localhost works for testing)
4. Copy your API key
5. Use it in the constructor:

```typescript
const api = new SteamAPI({
    apiKey: 'YOUR_API_KEY_HERE',
});
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import SteamAPI, {
    SteamAPIOptions,
    InventoryResult,
    PlayerSummary,
    SteamAPIError,
    CEconItem,
} from 'steam-inventory-fetcher';
```

## Examples

### Fetch Multiple Inventories

```typescript
const steamIDs = ['76561199099521803', '76561198114402400'];
const results = [];

for (const steamID of steamIDs) {
    try {
        const result = await api.getPlayerInventory(steamID, 440, 2);
        results.push({ steamID, success: true, count: result.inventory.length });
    } catch (err) {
        results.push({ steamID, success: false, error: err.message });
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
}
```

### Filter Tradable Items

```typescript
// Get only tradable items
const result = await api.getPlayerInventory('76561199099521803', 440, 2, true);

console.log(`Tradable items: ${result.inventory.length}`);
```

### Different Games

```typescript
const games = [
    { name: 'TF2', appid: 440, contextid: 2 },
    { name: 'CS:GO', appid: 730, contextid: 2 },
    { name: 'Dota 2', appid: 570, contextid: 2 },
];

for (const game of games) {
    const result = await api.getPlayerInventory('76561199099521803', game.appid, game.contextid);
    console.log(`${game.name}: ${result.inventory.length} items`);
}
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related Projects

- [node-steamcommunity](https://github.com/DoctorMcKay/node-steamcommunity) - Original inspiration for CEconItem class

## Support

For issues, questions, or contributions, please open an issue on GitHub.
