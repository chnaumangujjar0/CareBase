import multer from "multer";
import path from "path";
import fs from "fs"
import { ApiError } from "../utils/apiError";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "./public/temp";

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
})
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/x-icon"]);

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, cb) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      return cb(new ApiError(400, "Only JPEG, PNG, WebP, and ICO images are supported"));
    }
    cb(null, true);
  },
});