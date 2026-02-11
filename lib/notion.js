import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

export async function getVideos() {
    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
        return [];
    }

    try {
        const response = await notion.databases.query({
            database_id: databaseId,
            sorts: [
                {
                    timestamp: 'created_time',
                    direction: 'descending',
                },
            ],
        });

        return response.results.map((page) => {
            const props = page.properties;
            return {
                id: page.id,
                yarnId: props['keyword']?.rich_text[0]?.plain_text || 'No Link', // using keyword for link/id
                title: props['이름']?.title[0]?.plain_text || 'Untitled',
                videoUrl: '', // DB doesn't have direct video URL column anymore, user can open source link
                thumbUrl: props['media']?.files[0]?.external?.url || props['media']?.files[0]?.file?.url || '',
                clipUrl: props['keyword']?.rich_text[0]?.plain_text || '',
            };
        });
    } catch (error) {
        console.error('Error fetching from Notion:', error);
        return [];
    }
}
