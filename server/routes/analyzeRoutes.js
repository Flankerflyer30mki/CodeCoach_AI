import { Router } from "express";
import { analyzeUser } from "../controllers/analyzeController.js";

const router = Router();

router.post("/analyze", analyzeUser);

export default router;
