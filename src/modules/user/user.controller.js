import asyncHandler from "../../utils/asyncHandler.js";
import { sendResponse } from "../../utils/response.js";

import {
  getUserProfileService,
  updateUserProfileService,
} from "./user.service.js";

export const getProfile = asyncHandler(async (req, res) => {
  const user = await getUserProfileService(req.user.id);

  sendResponse(res, 200, user);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const updated = await updateUserProfileService(req.user.id, req.body);

  sendResponse(res, 200, updated, "Profile updated");
});