const { chromium } = require('playwright');
const axios = require('axios');
const { uploadToNotion } = require('./notion_uploader');
const { uploadToCloudinary } = require('./cloudinary_helper');

async function fetchFileBuffer(url) {
    if (!url) return null;
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer', // Important for binary data
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return response.data;
    } catch (e) {
        console.error(`Error downloading ${url}:`, e.message);
        return null;
    }
}

async function scrapeAndSave(platform, query) {
    console.log(`Starting ${platform} scrape for "${query}"...`);

    let browser;
    try {
        // Vercel / Remote Browser Logic
        if (process.env.BROWSER_WS_ENDPOINT) {
            console.log('Connecting to remote browser...');
            browser = await chromium.connect(process.env.BROWSER_WS_ENDPOINT);
        } else {
            // Local Development Logic
            console.log('Launching local browser...');
            browser = await chromium.launch({ headless: true }); // Vercel can't do headed anyway
        }
    } catch (e) {
        console.error('Failed to launch browser. If on Vercel, make sure BROWSER_WS_ENDPOINT is set.', e);
        return { error: 'Browser launch failed' };
    }

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

            try {
                await page.waitForSelector('[data-e2e="search-card-video-item"]', { timeout: 15000 });
            } catch (e) {
                console.log('Timeout waiting for Douyin selector');
            }

            // Scroll for lazy load
            await page.evaluate(() => window.scrollBy(0, 500));
            await page.waitForTimeout(2000);

            const videoElements = await page.$$('[data-e2e="search-card-video-item"]');
            const limit = Math.min(videoElements.length, 3);

            for (let i = 0; i < limit; i++) {
                const el = videoElements[i];
                const text = await el.innerText();
                const linkEl = await el.querySelector('a');
                let link = linkEl ? await linkEl.getAttribute('href') : '';

                if (link && !link.startsWith('http')) {
                    link = 'https://www.douyin.com' + link;
                }

                const imgEl = await el.querySelector('img');
                const src = imgEl ? await imgEl.getAttribute('src') : '';

                // Try for video src
                const videoEl = await el.querySelector('video');
                const videoSrc = videoEl ? await videoEl.getAttribute('src') : null;

                // Process in memory
                let thumbCloudUrl = '';
                let videoCloudUrl = '';

                if (src) {
                    const buffer = await fetchFileBuffer(src);
                    if (buffer) {
                        thumbCloudUrl = await uploadToCloudinary(buffer, 'douyin_thumbs');
                    }
                }

                if (videoSrc && videoSrc.startsWith('http')) {
                    const buffer = await fetchFileBuffer(videoSrc);
                    if (buffer) {
                        videoCloudUrl = await uploadToCloudinary(buffer, 'douyin_videos');
                    }
                }

                results.push({
                    id: `douyin_${Date.now()}_${i}`,
                    title: text.split('\n')[0] || query,
                    videoUrl: videoCloudUrl || link,
                    thumbUrl: thumbCloudUrl || src,
                    clipUrl: link
                });
            }

        } else if (platform === 'taobao') {
            const url = `https://s.taobao.com/search?q=${encodeURIComponent(query)}`;
            await page.goto(url);

            try {
                await page.waitForSelector('.Content--content--15Fr8o1', { timeout: 15000 });
            } catch (e) {
                console.log('Timeout waiting for Taobao selector.');
            }

            const items = await page.$$('a[href*="item.htm"]');
            const limit = Math.min(items.length, 3);

            for (let i = 0; i < limit; i++) {
                const el = items[i];
                const link = await el.getAttribute('href');
                const title = await el.innerText();
                const imgEl = await el.querySelector('img');
                const src = imgEl ? await imgEl.getAttribute('src') : '';

                let thumbCloudUrl = '';
                const properSrc = src.startsWith('http') ? src : 'https:' + src;

                if (src) {
                    const buffer = await fetchFileBuffer(properSrc);
                    if (buffer) {
                        thumbCloudUrl = await uploadToCloudinary(buffer, 'taobao_thumbs');
                    }
                }

                results.push({
                    id: `taobao_${Date.now()}_${i}`,
                    title: title || query,
                    videoUrl: link.startsWith('http') ? link : 'https:' + link,
                    thumbUrl: thumbCloudUrl || properSrc,
                    clipUrl: link.startsWith('http') ? link : 'https:' + link
                });
            }
        }
    } catch (error) {
        console.error('Scraping error:', error);
    } finally {
        if (browser) await browser.close();
    }

    // Save to Notion
    if (results.length > 0) {
        console.log(`Found ${results.length} items. Uploading to Notion...`);
        await uploadToNotion(results);
        return { success: true, count: results.length };
    } else {
        console.log('No results found.');
        return { success: false, count: 0 };
    }
}

// Ensure function is exported
module.exports = { scrapeAndSave };
