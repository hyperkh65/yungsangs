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
                        content: item.clipUrl || item.videoUrl || ''
                    }
                }
            ]
        },
        'media': {
            files: [
                {
                    name: `${item.id}.jpg`,
                    type: 'external',
                    external: {
                        url: item.thumbUrl
                    }
                }
            ]
        }
    }
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
