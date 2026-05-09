import express from "express";

import authMiddleware from "../../middleware/auth.middleware.js";

import { generateStreamToken } from "./stream.controller.js";

const router = express.Router();

router.get("/token", authMiddleware, generateStreamToken);

export default router;