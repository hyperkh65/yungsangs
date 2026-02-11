const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { uploadToNotion } = require('./notion_uploader');

async function downloadFile(url, dest) {
    if (!url) return;
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(dest);
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (e) {
        console.error(`Error downloading ${url}:`, e.message);
    }
}

async function scrapeAndSave(platform, query) {
    const downloadRootDir = path.join(__dirname, '..', 'downloads', `${platform}_${query}`);
    await fs.ensureDir(downloadRootDir);

    console.log(`Starting ${platform} scrape for "${query}"...`);
    const browser = await chromium.launch({ headless: false }); // Visible for CAPTCHA handling
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    let results = [];

    try {
        if (platform === 'douyin') {
            const url = `https://www.douyin.com/search/${encodeURIComponent(query)}`;
            await page.goto(url);

            // Wait for results to load - Douyin is heavy on JS
            // Trying to find video cards. The selectors might change, generic approach is safer.
            // Look for elements that look like video containers
            try {
                await page.waitForSelector('[data-e2e="search-card-video-item"]', { timeout: 15000 });
            } catch (e) {
                console.log('Timeout waiting for specific Douyin selector, checking for generic list...');
            }

            // Scroll down a bit to trigger lazy loading
            await page.evaluate(() => window.scrollBy(0, 500));
            await page.waitForTimeout(2000);

            const videoElements = await page.$$('[data-e2e="search-card-video-item"]');

            // Limit to first 3 results to be polite and fast
            const limit = Math.min(videoElements.length, 3);

            for (let i = 0; i < limit; i++) {
                const el = videoElements[i];
                const text = await el.innerText();
                const linkEl = await el.querySelector('a');
                let link = linkEl ? await linkEl.getAttribute('href') : '';

                if (link && !link.startsWith('http')) {
                    link = 'https://www.douyin.com' + link;
                }

                // Extracting thumbnail often requires digging into style or img src
                const imgEl = await el.querySelector('img');
                const src = imgEl ? await imgEl.getAttribute('src') : '';

                results.push({
                    id: `douyin_${Date.now()}_${i}`,
                    title: text.split('\n')[0] || query,
                    videoUrl: link, // Douyin direct video links are hard to get without network interception, saving page link for now
                    thumbUrl: src,
                    clipUrl: link
                });

                // Download thumb
                if (src) {
                    await downloadFile(src, path.join(downloadRootDir, `douyin_${i}_thumb.jpg`));
                }
            }

        } else if (platform === 'taobao') {
            const url = `https://s.taobao.com/search?q=${encodeURIComponent(query)}`;
            await page.goto(url);

            // Taobao often pushes login. 
            // We wait for a specific item container.
            try {
                await page.waitForSelector('.Content--content--15Fr8o1', { timeout: 15000 }); // Varies often
            } catch (e) {
                console.log('Timeout waiting for Taobao selector (login might be required).');
            }

            // Fallback to searching for any link with item id
            const items = await page.$$('a[href*="item.htm"]');
            const limit = Math.min(items.length, 3);

            for (let i = 0; i < limit; i++) {
                const el = items[i];
                const link = await el.getAttribute('href');
                const title = await el.innerText();
                const imgEl = await el.querySelector('img');
                const src = imgEl ? await imgEl.getAttribute('src') : '';

                results.push({
                    id: `taobao_${Date.now()}_${i}`,
                    title: title || query,
                    videoUrl: link.startsWith('http') ? link : 'https:' + link, // Taobao items might not be videos, treating as "clip"
                    thumbUrl: src.startsWith('http') ? src : 'https:' + src,
                    clipUrl: link.startsWith('http') ? link : 'https:' + link
                });

                // Download thumb
                if (src) {
                    const validSrc = src.startsWith('http') ? src : 'https:' + src;
                    await downloadFile(validSrc, path.join(downloadRootDir, `taobao_${i}_thumb.jpg`));
                }
            }
        }
    } catch (error) {
        console.error('Scraping error:', error);
    } finally {
        await browser.close();
    }

    // Save to Notion
    if (results.length > 0) {
        console.log(`Found ${results.length} items. Uploading to Notion...`);
        // Map to expected notion uploader format
        // existing uploader expects { id, title, videoUrl, thumbUrl, clipUrl }
        await uploadToNotion(results);
        return results;
    } else {
        console.log('No results found.');
        return [];
    }
}

// Allow running directly
if (require.main === module) {
    const platform = process.argv[2];
    const query = process.argv[3];

    if (!platform || !query) {
        console.log('Usage: node douyin_taobao_scraper.js <douyin|taobao> <search_term>');
    } else {
        scrapeAndSave(platform, query);
    }
}

module.exports = { scrapeAndSave };
