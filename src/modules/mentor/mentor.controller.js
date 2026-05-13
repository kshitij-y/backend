import asyncHandler from "../../shared/utils/asyncHandler.js";
import { sendResponse } from "../../shared/utils/response.js";

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

  getOnboardingStatusService,

  getMentorMenteesService
} from "./mentor.service.js";

//
// --------------------
// PROFILE
// --------------------
//

export const getMentorMentees = async (req, res, next) => {
  try {
    const mentees =
      await getMentorMenteesService(
        req.user.id
      );

      console.log(
        "MENTEES:",
        mentees
      );

    return sendResponse(
      res,
      200,
      mentees,
      "Mentor mentees fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};


export const createProfile = asyncHandler(async (req, res) => {
  const { headline, about, experienceYears, isAvailable } = req.body;

  const profile = await createMentorProfileService(req.user.id, {
    headline,
    about,
    experienceYears,
    isAvailable,
  });

  sendResponse(res, 201, profile, "Profile created");
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await getMyProfileService(req.user.id);

  sendResponse(res, 200, profile);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { headline, about, experienceYears, isAvailable } = req.body;

  const profile = await updateProfileService(req.user.id, {
    headline,
    about,
    experienceYears,
    isAvailable,
  });

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
  const { duration, price, title, description, isActive } = req.body;

  const newPlan = await createPlanService(req.user.id, {
    duration,
    price,
    title,
    description,
    isActive,
  });

  sendResponse(res, 201, newPlan, "Plan created");
});

export const getMyPlans = asyncHandler(async (req, res) => {
  const plans = await getMyPlansService(req.user.id);

  sendResponse(res, 200, plans);
});

export const updatePlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const { price, title, description, isActive } = req.body;

  const updated = await updatePlanService(req.user.id, planId, {
    price,
    title,
    description,
    isActive,
  });

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

export const getOnboardingStatus =
  async (req, res, next) => {
    try {
      const data =
        await getOnboardingStatusService(
          req.user.id
        );

      sendResponse(
        res,
        200,
        data,
        "Onboarding status fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };