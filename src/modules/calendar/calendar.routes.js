import express from "express";

import authMiddleware from "../../shared/middleware/auth.middleware.js";
import roleMiddleware from "../../shared/middleware/role.middleware.js";

import {
  connectGoogleCalendar,
  disconnectCalendar,
  getConnectionStatus,
  handleGoogleCallback,
} from "./calendar.controller.js";

const router = express.Router();

router.get(
  "/google/connect",
  authMiddleware,
  roleMiddleware("MENTOR"),
  connectGoogleCalendar
);

router.get(
  "/google/callback",
  authMiddleware,
  roleMiddleware("MENTOR"),
  handleGoogleCallback
);

router.delete(
  "/disconnect",
  authMiddleware,
  roleMiddleware("MENTOR"),
  disconnectCalendar
);

router.get(
  "/status",
  authMiddleware,
  roleMiddleware("MENTOR"),
  getConnectionStatus
);

export default router;
