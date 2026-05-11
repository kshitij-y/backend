import express from "express";

import authMiddleware from "../../shared/middleware/auth.middleware.js";

import {
  createMentorshipChannel,
  getChatToken,
} from "./chat.controller.js";

const router = express.Router();

router.get("/token", authMiddleware, getChatToken);

router.post(
  "/channel",
  authMiddleware,
  createMentorshipChannel
);

export default router;
