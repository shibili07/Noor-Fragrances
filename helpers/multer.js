const multer = require("multer")
const path = require("path")
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../public/uploads/product-images');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Set the correct path to public/uploads/product-images
        cb(null, path.join(__dirname, '../public/uploads/product-images'));
    },
    filename: function(req, file, cb) {
        // Add file extension to avoid potential issues
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

module.exports = storage;