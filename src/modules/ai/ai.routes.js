import express from "express";

import authMiddleware from "../../shared/middleware/auth.middleware.js";
import roleMiddleware from "../../shared/middleware/role.middleware.js";

import { mentorSearchController } from "./ai.controller.js";

const router = express.Router();

router.post(
  "/mentor-search",
//   authMiddleware,
//   roleMiddleware("MENTEE"),
  mentorSearchController
);

export default router;
