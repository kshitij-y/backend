import express from "express";
import {
    createProfile, getMyProfile, updateProfile,

    addExpertise, removeExpertise, getMentorExpertise,

    createPlan, getMyPlans, updatePlan, deletePlan,

    getAllMentors, getMentorById, getMentorPlans,

    getOnboardingStatus,
} from "./mentor.controller.js";

import authMiddleware from "../../shared/middleware/auth.middleware.js";
import roleMiddleware from "../../shared/middleware/role.middleware.js";

const router = express.Router();

//
// PUBLIC
//
router.get("/", getAllMentors);

router.get("/onboarding-status", authMiddleware, roleMiddleware("MENTOR"), getOnboardingStatus);

router.get("/:mentorId/plans", getMentorPlans);
router.get("/:mentorId/expertise", getMentorExpertise);
router.get("/:mentorId", getMentorById);

//
// PROTECTED (MENTOR ONLY)
//




router.post("/profile", authMiddleware, roleMiddleware("MENTOR"), createProfile);

router.get("/profile/me", authMiddleware, roleMiddleware("MENTOR"), getMyProfile);

router.put("/profile", authMiddleware, roleMiddleware("MENTOR"), updateProfile);

//
// EXPERTISE
//
router.post("/expertise",authMiddleware,roleMiddleware("MENTOR"), addExpertise);

router.delete("/expertise/:expertiseId", authMiddleware, roleMiddleware("MENTOR"), removeExpertise );

//
// PLANS
//
router.post( "/plans", authMiddleware, roleMiddleware("MENTOR"), createPlan);

router.get( "/plans/me", authMiddleware, roleMiddleware("MENTOR"), getMyPlans);

router.put("/plans/:planId", authMiddleware, roleMiddleware("MENTOR"), updatePlan);

router.delete( "/plans/:planId", authMiddleware, roleMiddleware("MENTOR"), deletePlan);

export default router;