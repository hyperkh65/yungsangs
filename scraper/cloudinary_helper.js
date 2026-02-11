const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadToCloudinary(filePath, folder = 'douyin_taobao') {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
        console.error('Cloudinary not configured!');
        return null; // Fallback
    }

    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
            resource_type: "auto" // Detect if it's image or video automatically
        });
        console.log(`Uploaded to Cloudinary: ${result.secure_url}`);
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary upload failed:', error.message);
        return null;
    }
}

module.exports = { uploadToCloudinary };
