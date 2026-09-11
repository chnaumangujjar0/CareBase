import { v2 as cloudinary } from "cloudinary";
import fs from "node:fs/promises";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const uploadToCloudinary = async (localFilePath: string) => {
    if (!localFilePath) return null;

    try {
        return await cloudinary.uploader.upload(localFilePath, {
            folder: "tenant_folder",
            resource_type: "image",
        });
    } catch (uploadError) {
        console.error("Cloudinary upload failed:", uploadError);
        return null;
    } finally {
        try {
            await fs.unlink(localFilePath);
        } catch (cleanupError) {
            const errorCode = cleanupError as NodeJS.ErrnoException;
            if (errorCode.code !== "ENOENT") {
                console.error("Unable to remove temporary upload:", cleanupError);
            }
        }
    }
};