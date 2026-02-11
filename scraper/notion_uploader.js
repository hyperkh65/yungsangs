require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('fs-extra');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

async function uploadToNotion(results) {
    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
        console.error('Notion API Key or Database ID missing in .env file.');
        return;
    }

    console.log(`Uploading ${results.length} items to Notion...`);

    for (const item of results) {
        try {
            // Prepare children blocks for the page content
            const children = [];

            // Add Video block if we have a valid video URL (Cloudinary or otherwise)
            if (item.videoUrl && item.videoUrl.startsWith('http')) {
                children.push({
                    object: 'block',
                    type: 'video',
                    video: {
                        type: 'external',
                        external: {
                            url: item.videoUrl
                        }
                    }
                });
            } else if (item.thumbUrl && item.thumbUrl.startsWith('http')) {
                // Fallback to image if no video
                children.push({
                    object: 'block',
                    type: 'image',
                    image: {
                        type: 'external',
                        external: {
                            url: item.thumbUrl
                        }
                    }
                });
            }

            // Create the page
            await notion.pages.create({
                parent: { database_id: databaseId },
                properties: {
                    '이름': {
                        title: [
                            {
                                text: {
                                    content: item.title || item.id
                                }
                            }
                        ]
                    },
                    'keyword': {
                        rich_text: [
                            {
                                text: {
                                    content: item.videoUrl || item.clipUrl || ''
                                }
                            }
                        ]
                    },
                    'media': {
                        files: [
                            {
                                name: `${item.id}_thumb.jpg`,
                                type: 'external',
                                external: {
                                    url: item.thumbUrl || 'https://via.placeholder.com/150'
                                }
                            }
                        ]
                    }
                },
                children: children
            });
            console.log(`Successfully uploaded: ${item.title}`);
        } catch (error) {
            console.error(`Failed to upload ${item.id} to Notion:`, error.message);
        }
    }
    console.log('Notion upload complete.');
}

if (require.main === module) {
    const resultsPath = path.join(__dirname, '..', 'results.json');
    if (fs.existsSync(resultsPath)) {
        const results = fs.readJsonSync(resultsPath);
        uploadToNotion(results);
    } else {
        console.error('results.json not found. Run the scraper first.');
    }
}

module.exports = { uploadToNotion };
