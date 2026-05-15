import asyncHandler from "../../shared/utils/asyncHandler.js";
import { sendResponse } from "../../shared/utils/response.js";
import {
  createMentorshipService,
  getMyMentorshipsService,
  getMentorshipByIdService,
  updateMentorshipStatusService,
  attachStreamChannelToMentorshipService
} from "./mentorship.service.js";

//
// CREATE
//
export const createMentorship = asyncHandler(
  async (req, res) => {
    const { mentorId, planId } = req.body;


    const mentorship =
      await createMentorshipService(
        req.user.id,
        mentorId,
        planId
      );


    let updatedMentorship = mentorship;

    try {
      updatedMentorship =
        await attachStreamChannelToMentorshipService(
          mentorship.id
        );
    } catch (error) {
      console.error(
        "Stream sync failed:",
        error.message
      );
    }

    sendResponse(
      res,
      201,
      updatedMentorship,
      "Mentorship created"
    );
  }
);

export const getMyMentorships = asyncHandler(async (req, res) => {
  const data = await getMyMentorshipsService(req.user.id);

  sendResponse(res, 200, data);
});


export const getMentorshipById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await getMentorshipByIdService(req.user.id, id);

  sendResponse(res, 200, data);
});


export const updateMentorshipStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const updated = await updateMentorshipStatusService(
    req.user.id,
    id,
    status
  );

  sendResponse(res, 200, updated, "Status updated");
});


export const scheduleMentorship = asyncHandler(async (req, res) => {
  sendResponse(res, 410, null, "This endpoint is deprecated. Use /api/sessions instead.");
});