import express from "express";
import authMiddleware from "../../shared/middleware/auth.middleware.js";
import {
  createSession,
  rescheduleSession,
  cancelSession,
  completeSession,
  getSessionsByMentorship,
  getUpcomingSessions,
  getSessionHistory,
} from "./session.controller.js";

const router = express.Router();

router.post("/", authMiddleware, createSession);
router.get("/upcoming", authMiddleware, getUpcomingSessions);
router.get("/history", authMiddleware,getSessionHistory);
router.get("/mentorship/:mentorshipId", authMiddleware, getSessionsByMentorship);
router.patch("/:id/reschedule", authMiddleware, rescheduleSession);
router.patch("/:id/cancel", authMiddleware, cancelSession);
router.patch("/:id/complete", authMiddleware, completeSession);

export default router;
