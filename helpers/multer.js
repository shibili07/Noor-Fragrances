const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create folder if it doesn't exist
const createFolderIfNotExist = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

// Disk storage for profile pictures
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../public/uploads/profile-pictures");
    createFolderIfNotExist(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});


const memoryStorage = multer.memoryStorage();


const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"), false);
  }
  cb(null, true);
};


const uploadDisk = multer({
  storage: diskStorage,
  fileFilter,
});

const uploadMemory = multer({
  storage: memoryStorage,
  fileFilter,
});



module.exports = { uploadDisk, uploadMemory };