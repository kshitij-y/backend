import {
  createUser,
  loginUser,
} from "./auth.service.js";

import { signToken } from "../../utils/jwt.js";
import { setAuthCookie, clearAuthCookie } from "../../utils/cookies.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { sendResponse } from "../../utils/response.js";


export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    const error = new Error("All fields are required");
    error.statusCode = 400;
    throw error;
  }

  const user = await createUser({ name, email, password, role });

  const token = signToken({ id: user.id });

  setAuthCookie(res, token);

  sendResponse(res, 201, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }, "User created successfully");
});


export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const user = await loginUser({ email, password });

  const token = signToken({ id: user.id });

  setAuthCookie(res, token);

  sendResponse(res, 200, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }, "Login successful");
});


export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);

  sendResponse(res, 200, null, "Logged out successfully");
});


export const getMe = asyncHandler(async (req, res) => {
  const user = req.user;

  sendResponse(res, 200, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});