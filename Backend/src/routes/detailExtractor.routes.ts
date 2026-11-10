import { Router } from "express";
import { pdfUpload } from "../middlewares/multer.middleware.js";
import { uploadAndParseDoctorCV } from "../controllers/detailExtractor.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js"; // Assuming you have this

const router = Router();

// Notice the order: Auth -> Multer Upload -> Your Controller
router.post(
  "/extract-cv",
  requireAuth,
  pdfUpload.single("cvFile"),
  uploadAndParseDoctorCV
);

export default router;