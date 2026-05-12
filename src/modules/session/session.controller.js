import asyncHandler from "../../shared/utils/asyncHandler.js";
import { sendResponse } from "../../shared/utils/response.js";
import {
  createSessionService,
  rescheduleSessionService,
  cancelSessionService,
  completeSessionService,
  getSessionsByMentorshipService,
  getUpcomingSessionsService,
} from "./session.service.js";

//
// CREATE
//
export const createSession = asyncHandler(async (req, res) => {
  const session = await createSessionService(req.user.id, req.body);
  sendResponse(res, 201, session, "Session created");
});

//
// RESCHEDULE
//
export const rescheduleSession = asyncHandler(async (req, res) => {
  const session = await rescheduleSessionService(req.user.id, req.params.id, req.body);
  sendResponse(res, 200, session, "Session rescheduled");
});

//
// CANCEL
//
export const cancelSession = asyncHandler(async (req, res) => {
  const session = await cancelSessionService(req.user.id, req.params.id);
  sendResponse(res, 200, session, "Session cancelled");
});

//
// COMPLETE
//
export const completeSession = asyncHandler(async (req, res) => {
  const session = await completeSessionService(req.user.id, req.params.id);
  sendResponse(res, 200, session, "Session completed");
});

//
// GET BY MENTORSHIP
//
export const getSessionsByMentorship = asyncHandler(async (req, res) => {
  const sessions = await getSessionsByMentorshipService(req.user.id, req.params.mentorshipId);
  sendResponse(res, 200, sessions);
});

//
// GET UPCOMING
//
export const getUpcomingSessions = asyncHandler(async (req, res) => {
  const sessions = await getUpcomingSessionsService(req.user.id);
  sendResponse(res, 200, sessions);
});
