import express from "express";
import {
  signup,
  login,
  logout,
  getMe,
} from "./auth.controller.js";

import authMiddleware from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authMiddleware, getMe);

export default router;