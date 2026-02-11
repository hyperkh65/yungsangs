require('dotenv').config();
const { scrapeYarn } = require('./scraper/yarn_scraper');
const { uploadToNotion } = require('./scraper/notion_uploader');
const fs = require('fs-extra');
const path = require('path');

async function main() {
    const query = process.argv[2];
    if (!query) {
        console.log('Usage: node run.js <search_term>');
        process.exit(1);
    }

    try {
        console.log(`=== Starting Workflow for "${query}" ===`);

        // 1. Scrape
        const results = await scrapeYarn(query, 3);

        if (results.length === 0) {
            console.log('No results found or captcha challenge not solved.');
            return;
        }

        // 2. Save results
        const resultsPath = path.join(__dirname, 'results.json');
        await fs.writeJson(resultsPath, results, { spaces: 2 });
        console.log(`Saved ${results.length} items to results.json`);

        // 3. Upload to Notion
        await uploadToNotion(results);

        console.log('=== Workflow Complete ===');
        console.log('You can now view the results in your Notion database and the Web Gallery.');
    } catch (err) {
        console.error('Workflow failed:', err);
    }
}

main();
