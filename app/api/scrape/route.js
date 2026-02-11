import { NextResponse } from 'next/server';
// Directly import the function. This ensures it's bundled by Vercel.
import { scrapeAndSave } from '../../../scraper/douyin_taobao_scraper';

export async function POST(req) {
    try {
        const { query, platform } = await req.json();

        if (!query || !platform) {
            return NextResponse.json({ error: 'Query and platform are required' }, { status: 400 });
        }

        if (!['douyin', 'taobao'].includes(platform)) {
            return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
        }

        console.log(`Starting in-process scrape for ${platform}: ${query}`);

        // Call function directly (await result)
        // Note: On Vercel, this might timeout if it takes > 10s (Hobby plan) or 60s (Pro).
        // Scrapers often take longer. Background jobs are better but for simple setup:
        const result = await scrapeAndSave(platform, query);

        return NextResponse.json({
            success: true,
            message: `Scraped results for "${query}" on ${platform}`,
            data: result
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message
        }, { status: 500 });
    }
}
