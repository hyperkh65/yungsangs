const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

async function downloadFile(url, dest) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function scrapeYarn(searchTerm, maxPages = 3) {
    const downloadRootDir = path.join(__dirname, '..', 'downloads', searchTerm);
    await fs.ensureDir(downloadRootDir);

    const browser = await chromium.launch({ headless: false }); // User needs to solve captcha
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log(`Searching for "${searchTerm}"...`);

    let allResults = [];

    for (let p = 0; p < maxPages; p++) {
        const url = `https://getyarn.io/yarn-find?text=${encodeURIComponent(searchTerm)}&p=${p}`;
        console.log(`Navigating to Page ${p + 1}: ${url}`);

        await page.goto(url);

        // Wait for user to solve captcha if present
        if (await page.isVisible('text=Verify you are human') || await page.isVisible('iframe[src*="cloudflare"]')) {
            console.log('Cloudflare challenge detected. Please solve it in the browser window.');
            await page.waitForSelector('.y-video', { timeout: 0 }); // Wait indefinitely until search results appear
        } else {
            await page.waitForSelector('.y-video', { timeout: 10000 }).catch(() => console.log('Timeout waiting for results, might be no results or different UI.'));
        }

        const clips = await page.$$eval('.y-video', nodes => {
            return nodes.map(node => {
                const link = node.querySelector('a.yarn-link');
                const img = node.querySelector('img');
                const title = node.querySelector('.title')?.innerText || '';
                const id = link ? link.getAttribute('href').split('/').pop() : '';
                return {
                    id,
                    title,
                    clipUrl: link ? 'https://getyarn.io' + link.getAttribute('href') : '',
                    thumbUrl: img ? img.getAttribute('src') : ''
                };
            });
        });

        console.log(`Found ${clips.length} clips on page ${p + 1}.`);

        for (const clip of clips) {
            if (!clip.id) continue;

            // Video and Thumb URL patterns
            // Thumb: https://y.yarn.co/UUID_screenshot.jpg
            // Video: https://y.yarn.co/UUID.mp4
            const videoUrl = `https://y.yarn.co/${clip.id}.mp4`;
            const thumbUrl = clip.thumbUrl || `https://y.yarn.co/${clip.id}_screenshot.jpg`;

            const videoPath = path.join(downloadRootDir, `${clip.id}.mp4`);
            const thumbPath = path.join(downloadRootDir, `${clip.id}.jpg`);

            console.log(`Downloading ${clip.id}...`);
            try {
                await downloadFile(videoUrl, videoPath);
                await downloadFile(thumbUrl, thumbPath);

                allResults.push({
                    ...clip,
                    videoUrl,
                    thumbUrl,
                    localVideo: videoPath,
                    localThumb: thumbPath
                });
            } catch (err) {
                console.error(`Failed to download ${clip.id}:`, err.message);
            }
        }

        // Break if no more pages (optional: check for "Next" button)
        const hasNext = await page.isVisible('a:has-text("Next")');
        if (!hasNext) break;
    }

    await browser.close();
    console.log(`Scraping complete. Total items: ${allResults.length}`);
    return allResults;
}

// Example usage
if (require.main === module) {
    const query = process.argv[2] || 'happy';
    scrapeYarn(query).then(res => {
        fs.writeJsonSync(path.join(__dirname, '..', 'results.json'), res, { spaces: 2 });
    });
}

module.exports = { scrapeYarn };
