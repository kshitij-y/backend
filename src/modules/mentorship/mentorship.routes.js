import express from "express";
import {
  createMentorship,
  getMyMentorships,
  getMentorshipById,
  updateMentorshipStatus,
} from "./mentorship.controller.js";

import authMiddleware from "../../shared/middleware/auth.middleware.js";

const router = express.Router();

//
// PROTECTED
//
router.post("/", authMiddleware, createMentorship);

router.get("/me", authMiddleware, getMyMentorships);

router.get("/:id", authMiddleware, getMentorshipById);

router.patch("/:id/status", authMiddleware, updateMentorshipStatus);

export default router;