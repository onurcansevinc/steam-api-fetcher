import SteamAPI from '../src/index';

// Utility function to add delay between requests (rate limiting)
const delay = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

// Example 1: Single inventory fetch
async function exampleSingleFetch() {
    console.log('\n=== Example 1: Single Inventory Fetch ===');
    const api = new SteamAPI({
        requestTimeout: 10000,
        retryDelay: 1000,
    });

    try {
        const startTime = Date.now();
        const result = await api.getPlayerInventory(
            '76561199099521803', // Example SteamID64
            440, // TF2 appid
            2, // default contextid
            false, // tradableOnly?
            2, // retries
            'english' // language
        );

        const duration = Date.now() - startTime;
        console.log('✅ Success!');
        console.log('Inventory items:', result.inventory.length);
        console.log('Currency items:', result.currency.length);
        console.log('Total count:', result.total_inventory_count);
        console.log(`⏱️  Duration: ${duration}ms`);
    } catch (err: any) {
        console.error('❌ Error:', err.message);
        if (err.statusCode) {
            console.error('Status Code:', err.statusCode);
        }
    }
}

// Example 2: Multiple inventories with rate limiting
// Steam API has rate limits, so we add delays between requests
async function exampleMultipleFetches() {
    console.log('\n=== Example 2: Multiple Inventories (with Rate Limiting) ===');

    const steamIDs = [
        '76561199099521803',
        '76561198114402400',
        '76561197966756586',
        '76561198244962432',
        '76561198061836787',
        '76561198181044895',
        '76561198247640596',
        '76561198114545227',
        '76561198328282971',
        '76561198039659875',
    ];

    const api = new SteamAPI({
        requestTimeout: 10000,
        retryDelay: 1000,
    });

    type Result =
        | {
              steamID: string;
              success: true;
              inventoryCount: number;
              currencyCount: number;
              totalCount: number;
              duration: number;
          }
        | {
              steamID: string;
              success: false;
              error: string;
              statusCode?: number;
          };

    const results: Result[] = [];
    const delayBetweenRequests = 2000; // 2 seconds between requests (recommended: 1-3 seconds)

    for (let i = 0; i < steamIDs.length; i++) {
        const steamID = steamIDs[i];
        console.log(`\nFetching inventory ${i + 1}/${steamIDs.length} for ${steamID}...`);

        try {
            const startTime = Date.now();
            const result = await api.getPlayerInventory(steamID, 440, 2, false, 2, 'english');
            const duration = Date.now() - startTime;

            results.push({
                steamID,
                success: true,
                inventoryCount: result.inventory.length,
                currencyCount: result.currency.length,
                totalCount: result.total_inventory_count,
                duration,
            });

            console.log(`✅ Success! Items: ${result.inventory.length}, Duration: ${duration}ms`);
        } catch (err: any) {
            results.push({
                steamID,
                success: false,
                error: err.message,
                statusCode: err.statusCode,
            });
            console.error(`❌ Error: ${err.message}`);
        }

        // Rate limiting: wait before next request (except for last one)
        if (i < steamIDs.length - 1) {
            console.log(`⏳ Waiting ${delayBetweenRequests}ms before next request...`);
            await delay(delayBetweenRequests);
        }
    }

    console.log('\n📊 Summary:');
    console.log(`Total requests: ${steamIDs.length}`);
    console.log(`Successful: ${results.filter((r) => r.success).length}`);
    console.log(`Failed: ${results.filter((r) => !r.success).length}`);
}

// Example 3: Different games/apps
async function exampleDifferentGames() {
    console.log('\n=== Example 3: Different Games ===');

    const games = [
        { name: 'Team Fortress 2', appid: 440, contextid: 2 },
        { name: 'Counter-Strike: Global Offensive', appid: 730, contextid: 2 },
        { name: 'Dota 2', appid: 570, contextid: 2 },
        // Add more games as needed
    ];

    const api = new SteamAPI({
        requestTimeout: 10000,
        retryDelay: 1000,
    });

    const steamID = '76561199099521803';

    for (const game of games) {
        console.log(`\nFetching ${game.name} inventory...`);

        try {
            const result = await api.getPlayerInventory(
                steamID,
                game.appid,
                game.contextid,
                false,
                2,
                'english'
            );
            console.log(`✅ ${game.name}: ${result.inventory.length} items`);
        } catch (err: any) {
            console.error(`❌ ${game.name}: ${err.message}`);
        }

        // Rate limiting between different games
        await delay(2000);
    }
}

// Example 4: Tradable items only
async function exampleTradableOnly() {
    console.log('\n=== Example 4: Tradable Items Only ===');

    const api = new SteamAPI({
        requestTimeout: 10000,
        retryDelay: 1000,
    });

    try {
        // Get all items
        const allItems = await api.getPlayerInventory(
            '76561199099521803',
            440,
            2,
            false,
            2,
            'english'
        );

        // Get only tradable items
        const tradableOnly = await api.getPlayerInventory(
            '76561199099521803',
            440,
            2,
            true,
            2,
            'english'
        );

        console.log(`All items: ${allItems.inventory.length}`);
        console.log(`Tradable items: ${tradableOnly.inventory.length}`);
        console.log(`Non-tradable: ${allItems.inventory.length - tradableOnly.inventory.length}`);
    } catch (err: any) {
        console.error('❌ Error:', err.message);
    }
}

// Example 5: With proxy support
async function exampleWithProxy() {
    console.log('\n=== Example 5: With Proxy Support ===');

    // Example proxy configuration
    const api = new SteamAPI({
        proxy: [
            // 'http://proxy1.example.com:8080',
            // 'http://proxy2.example.com:8080',
            // Add your proxy URLs here
        ],
        proxyRepeat: 1, // How many times to use each proxy before rotating
        requestTimeout: 10000,
        retryDelay: 1000,
    });

    try {
        const result = await api.getPlayerInventory(
            '76561199099521803',
            440,
            2,
            false,
            2,
            'english'
        );
        console.log('✅ Success with proxy!');
        console.log('Items:', result.inventory.length);
    } catch (err: any) {
        console.error('❌ Error:', err.message);
    }
}

// Example 6: Performance testing
async function examplePerformanceTest() {
    console.log('\n=== Example 6: Performance Test ===');

    const api = new SteamAPI({
        requestTimeout: 10000,
        retryDelay: 1000,
    });

    const iterations = 3;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
        try {
            const startTime = Date.now();
            await api.getPlayerInventory('76561199099521803', 440, 2, false, 2, 'english');
            const duration = Date.now() - startTime;
            times.push(duration);
            console.log(`Run ${i + 1}: ${duration}ms`);

            // Wait between iterations
            if (i < iterations - 1) {
                await delay(2000);
            }
        } catch (err: any) {
            console.error(`Run ${i + 1} failed:`, err.message);
        }
    }

    if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);

        console.log('\n📊 Performance Stats:');
        console.log(`Average: ${avg.toFixed(2)}ms`);
        console.log(`Min: ${min}ms`);
        console.log(`Max: ${max}ms`);
    }
}

// Example 7: Get player summaries
async function exampleGetPlayerSummaries() {
    console.log('\n=== Example 7: Get Player Summaries ===');

    // Note: You need a Steam Web API key from https://steamcommunity.com/dev/apikey
    const api = new SteamAPI({
        apiKey: process.env.STEAM_API_KEY || '', // Set STEAM_API_KEY environment variable
        requestTimeout: 10000,
        retryDelay: 1000,
    });

    try {
        const steamIDs = [
            '76561199099521803',
            '76561198114402400',
            // Add more SteamIDs here (up to 100 per request)
        ];

        console.log(`Fetching player summaries for ${steamIDs.length} players...`);
        const players = await api.getPlayerSummaries(steamIDs);

        console.log(`✅ Success! Retrieved ${players.length} player summaries:`);
        players.forEach((player) => {
            console.log(`  - ${player.personaname} (${player.steamid})`);
            console.log(`    Profile: ${player.profileurl}`);
            if (player.realname) {
                console.log(`    Real name: ${player.realname}`);
            }
        });
    } catch (err: any) {
        console.error('❌ Error:', err.message);
        if (err.statusCode) {
            console.error('Status Code:', err.statusCode);
        }
        if (err.message.includes('API key')) {
            console.error(
                '\n💡 Tip: Get a Steam Web API key from https://steamcommunity.com/dev/apikey'
            );
            console.error('   Then set it: export STEAM_API_KEY=your_api_key');
        }
    }
}

// Main test runner
(async () => {
    console.log('🚀 Steam Inventory Fetcher - Test Suite\n');

    // Run examples (comment/uncomment as needed)
    await exampleSingleFetch();
    await exampleMultipleFetches();
    // await exampleDifferentGames();
    // await exampleTradableOnly();
    // await exampleWithProxy();
    // await examplePerformanceTest();
    // await exampleGetPlayerSummaries(); // Requires Steam Web API key

    console.log('\n✅ Tests completed!');
})();
