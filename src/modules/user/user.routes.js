import express from "express";
import {
  getProfile,
  updateProfile,
} from "./user.controller.js";

import authMiddleware from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", authMiddleware, getProfile);
router.put("/me", authMiddleware, updateProfile);

export default router;