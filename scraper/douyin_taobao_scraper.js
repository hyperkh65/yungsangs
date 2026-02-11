const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { uploadToNotion } = require('./notion_uploader'); // Use Notion uploader, not Airtable
const { uploadToCloudinary } = require('./cloudinary_helper');

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
    const browser = await chromium.launch({ headless: false });
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
                console.log('Timeout waiting for specific Douyin selector, checking for generic list...');
            }

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

                // Download locally first
                let thumbPath = '';
                let videoPath = '';
                let thumbCloudUrl = '';
                let videoCloudUrl = '';

                if (src) {
                    thumbPath = path.join(downloadRootDir, `douyin_${i}_thumb.jpg`);
                    await downloadFile(src, thumbPath);
                    // Upload to Cloudinary
                    thumbCloudUrl = await uploadToCloudinary(thumbPath, 'douyin_thumbs');
                }

                if (videoSrc && videoSrc.startsWith('http')) {
                    videoPath = path.join(downloadRootDir, `douyin_${i}_video.mp4`);
                    await downloadFile(videoSrc, videoPath);
                    // Upload to Cloudinary
                    videoCloudUrl = await uploadToCloudinary(videoPath, 'douyin_videos');
                }

                results.push({
                    id: `douyin_${Date.now()}_${i}`,
                    title: text.split('\n')[0] || query,
                    videoUrl: videoCloudUrl || link, // Use Cloudinary URL if available
                    thumbUrl: thumbCloudUrl || src, // Use Cloudinary URL if available
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

                let thumbPath = '';
                let thumbCloudUrl = '';
                let properSrc = src.startsWith('http') ? src : 'https:' + src;

                if (src) {
                    thumbPath = path.join(downloadRootDir, `taobao_${i}_thumb.jpg`);
                    await downloadFile(properSrc, thumbPath);
                    thumbCloudUrl = await uploadToCloudinary(thumbPath, 'taobao_thumbs');
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
        await browser.close();
    }

    // Save to Notion (using Cloudinary URLs)
    if (results.length > 0) {
        console.log(`Found ${results.length} items. Uploading to Notion...`);
        console.log(`Local files saved to: ${downloadRootDir}`);
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
