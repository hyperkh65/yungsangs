import { getVideos } from '../../../lib/notion';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const videos = await getVideos();
        return NextResponse.json(videos);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
    }
}
