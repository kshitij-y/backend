import asyncHandler from "../../shared/utils/asyncHandler.js";
import { sendResponse } from "../../shared/utils/response.js";

import {
  createMentorshipChannelService,
  getChatTokenService,
} from "./chat.service.js";

export const getChatToken = asyncHandler(
  async (req, res) => {
    const token = await getChatTokenService(
      req.user
    );

    sendResponse(res, 200, { token });
  }
);

export const createMentorshipChannel = asyncHandler(
  async (req, res) => {
    const { mentorshipId } = req.body;

    if (!mentorshipId) {
      const error = new Error(
        "Mentorship id is required"
      );
      error.statusCode = 400;
      throw error;
    }

    const data =
      await createMentorshipChannelService(
        req.user.id,
        mentorshipId
      );

    sendResponse(res, 200, data);
  }
);
