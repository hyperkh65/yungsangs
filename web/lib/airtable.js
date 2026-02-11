import Airtable from 'airtable';

// Initialize Airtable
// Note: In Next.js server components/API routes, process.env works.
// Client-side exposure of API key is bad practice, but this file is intended for server-side usage (API routes).

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

export async function getVideos() {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
        return [];
    }

    try {
        const records = await base('Videos').select({
            maxRecords: 50
        }).all();

        return records.map((record) => {
            const fields = record.fields;
            // Get first attachment as image/video
            const media = fields['media'] || [];
            const thumb = media.length > 0 ? media[0].url : '';
            const video = media.length > 1 ? media[1].url : ''; // Assuming second attachment might be video

            return {
                id: record.id,
                yarnId: fields['keyword'] || '',
                title: fields['이름'] || 'Untitled',
                videoUrl: video,
                thumbUrl: thumb,
                clipUrl: fields['keyword'] || '',
            };
        });
    } catch (error) {
        console.error('Error fetching from Airtable:', error);
        return [];
    }
}
