import asyncHandler from "../../utils/asyncHandler.js";
import { sendResponse } from "../../utils/response.js";

import {
  // PROFILE
  createMentorProfileService,
  getMyProfileService,
  updateProfileService,

  // EXPERTISE
  addExpertiseService,
  removeExpertiseService,
  getMentorExpertiseService,

  // PLANS
  createPlanService,
  getMyPlansService,
  updatePlanService,
  deletePlanService,
  getMentorPlansService,

  // PUBLIC
  getAllMentorsService,
  getMentorByIdService,
} from "./mentor.service.js";

//
// --------------------
// PROFILE
// --------------------
//

export const createProfile = asyncHandler(async (req, res) => {
  const { bio } = req.body;

  const profile = await createMentorProfileService(req.user.id, bio);

  sendResponse(res, 201, profile, "Profile created");
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await getMyProfileService(req.user.id);

  sendResponse(res, 200, profile);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { bio } = req.body;

  const profile = await updateProfileService(req.user.id, bio);

  sendResponse(res, 200, profile, "Profile updated");
});

//
// --------------------
// EXPERTISE
// --------------------
//

export const addExpertise = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const expertise = await addExpertiseService(req.user.id, name);

  sendResponse(res, 201, expertise, "Expertise added");
});

export const removeExpertise = asyncHandler(async (req, res) => {
  const { expertiseId } = req.params;

  await removeExpertiseService(req.user.id, expertiseId);

  sendResponse(res, 200, null, "Expertise removed");
});

export const getMentorExpertise = asyncHandler(async (req, res) => {
  const { mentorId } = req.params;

  const expertise = await getMentorExpertiseService(mentorId);

  sendResponse(res, 200, expertise);
});

//
// --------------------
// PLANS
// --------------------
//

export const createPlan = asyncHandler(async (req, res) => {
  const { plan, price } = req.body;

  const newPlan = await createPlanService(req.user.id, plan, price);

  sendResponse(res, 201, newPlan, "Plan created");
});

export const getMyPlans = asyncHandler(async (req, res) => {
  const plans = await getMyPlansService(req.user.id);

  sendResponse(res, 200, plans);
});

export const updatePlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const { price } = req.body;

  const updated = await updatePlanService(req.user.id, planId, price);

  sendResponse(res, 200, updated, "Plan updated");
});

export const deletePlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;

  await deletePlanService(req.user.id, planId);

  sendResponse(res, 200, null, "Plan deleted");
});

export const getMentorPlans = asyncHandler(async (req, res) => {
  const { mentorId } = req.params;

  const plans = await getMentorPlansService(mentorId);

  sendResponse(res, 200, plans);
});

//
// --------------------
// PUBLIC (DISCOVERY)
// --------------------
//

export const getAllMentors = asyncHandler(async (req, res) => {
  const mentors = await getAllMentorsService();

  sendResponse(res, 200, mentors);
});

export const getMentorById = asyncHandler(async (req, res) => {
  const { mentorId } = req.params;

  const mentor = await getMentorByIdService(mentorId);

  sendResponse(res, 200, mentor);
});