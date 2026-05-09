import asyncHandler from "../../utils/asyncHandler.js";
import { sendResponse } from "../../utils/response.js";

import { generateStreamTokenService } from "./stream.service.js";

export const generateStreamToken = asyncHandler(async (req, res) => {
  const data = await generateStreamTokenService(req.user);

  sendResponse(res, 200, data);
});