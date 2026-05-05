import asyncHandler from "../../utils/asyncHandler.js";
import { sendResponse } from "../../utils/response.js";

import {
  createMentorshipService,
  getMyMentorshipsService,
  getMentorshipByIdService,
  updateMentorshipStatusService,
} from "./mentorship.service.js";

//
// CREATE
//
export const createMentorship = asyncHandler(async (req, res) => {
  const { mentorId, planId } = req.body;

  const mentorship = await createMentorshipService(
    req.user.id,
    mentorId,
    planId
  );

  sendResponse(res, 201, mentorship, "Mentorship created");
});

//
// GET MY
//
export const getMyMentorships = asyncHandler(async (req, res) => {
  const data = await getMyMentorshipsService(req.user.id);

  sendResponse(res, 200, data);
});

//
// GET BY ID
//
export const getMentorshipById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await getMentorshipByIdService(req.user.id, id);

  sendResponse(res, 200, data);
});

//
// UPDATE STATUS
//
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