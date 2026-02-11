import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(req) {
    try {
        const { query, platform } = await req.json();

        if (!query || !platform) {
            return NextResponse.json({ error: 'Query and platform are required' }, { status: 400 });
        }

        if (!['douyin', 'taobao'].includes(platform)) {
            return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
        }

        // Execute the scraper script
        const scraperPath = path.resolve(process.cwd(), '../scraper/douyin_taobao_scraper.js');

        // Wrap exec in a promise
        const runScraper = () => new Promise((resolve, reject) => {
            exec(`node "${scraperPath}" ${platform} "${query}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    reject(error);
                }
                console.log(`stdout: ${stdout}`);
                console.error(`stderr: ${stderr}`);
                resolve(stdout);
            });
        });

        await runScraper();

        return NextResponse.json({ success: true, message: `Scraped and saved results for "${query}" on ${platform}` });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
