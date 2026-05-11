import asyncHandler from "../../shared/utils/asyncHandler.js";
import { sendResponse } from "../../shared/utils/response.js";

import { mentorSearchService } from "./ai.service.js";

export const mentorSearchController = asyncHandler(
  async (req, res) => {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      const error = new Error("Prompt is required");
      error.statusCode = 400;
      throw error;
    }

    const data = await mentorSearchService(
      prompt.trim()
    );

    sendResponse(res, 200, data);
  }
);
