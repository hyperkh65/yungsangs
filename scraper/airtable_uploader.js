require('dotenv').config();
const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function uploadToAirtable(results) {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
        console.error('Airtable API Key or Base ID missing in .env file.');
        return;
    }

    console.log(`Uploading ${results.length} items to Airtable...`);

    // Airtable only allows 10 records per request.
    const chunkArray = (arr, size) =>
        arr.length > size
            ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
            : [arr];

    const chunks = chunkArray(results, 10);

    for (const chunk of chunks) {
        try {
            const records = chunk.map(item => ({
                fields: {
                    '이름': item.title || item.id,
                    'keyword': item.clipUrl || item.videoUrl || item.id,
                    'media': [
                        // For Airtable attachments, we just provide the URL to the image/video
                        { url: item.thumbUrl },
                        ...(item.videoUrl && item.videoUrl.startsWith('http') ? [{ url: item.videoUrl }] : [])
                    ]
                }
            }));

            await base('Videos').create(records);
            console.log(`Uploaded batch of ${chunk.length} items.`);
        } catch (error) {
            console.error('Airtable upload error:', error);
        }
    }
    console.log('Airtable upload complete.');
}

module.exports = { uploadToAirtable };
