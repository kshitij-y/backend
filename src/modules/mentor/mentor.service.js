import prisma from "../../config/db.js";



//
// CREATE PROFILE
//
export const createMentorProfileService = async (userId, bio) => {
  const existing = await prisma.mentorProfile.findUnique({
    where: { userId },
  });

  if (existing) {
    const error = new Error("Profile already exists");
    error.statusCode = 400;
    throw error;
  }

  const profile = await prisma.mentorProfile.create({
    data: {
      userId,
      bio,
    },
  });

  return profile;
};

//
// GET MY PROFILE
//
export const getMyProfileService = async (userId) => {
  const profile = await prisma.mentorProfile.findUnique({
    where: { userId },
    include: {
      expertises: {
        include: {
          expertise: true,
        },
      },
    },
  });

  if (!profile) {
    const error = new Error("Profile not found");
    error.statusCode = 404;
    throw error;
  }

  return profile;
};

//
// UPDATE PROFILE
//
export const updateProfileService = async (userId, bio) => {
  const profile = await prisma.mentorProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    const error = new Error("Profile not found");
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.mentorProfile.update({
    where: { userId },
    data: {
      bio,
    },
  });

  return updated;
};


export const getAllMentorsService = async () => {
  const mentors = await prisma.user.findMany({
    where: {
      role: "MENTOR",
    },
    select: {
      id: true,
      name: true,

      mentorProfile: {
        select: {
          bio: true,
          expertises: {
            include: {
              expertise: true,
            },
          },
        },
      },

      mentorPlans: {
        select: {
          id: true,
          plan: true,
          price: true,
        },
      },
    },
  });

  return mentors;
};


export const getMentorByIdService = async (mentorId) => {
  const mentor = await prisma.user.findUnique({
    where: { id: mentorId },
    select: {
      id: true,
      name: true,
      role: true,

      mentorProfile: {
        select: {
          bio: true,
          expertises: {
            include: {
              expertise: true,
            },
          },
        },
      },

      mentorPlans: {
        select: {
          id: true,
          plan: true,
          price: true,
        },
      },
    },
  });

  if (!mentor || mentor.role !== "MENTOR") {
    const error = new Error("Mentor not found");
    error.statusCode = 404;
    throw error;
  }

  return mentor;
};

export const getMentorPlansService = async (mentorId) => {
  const plans = await prisma.mentorPlan.findMany({
    where: {
      mentorId,
    },
    select: {
      id: true,
      plan: true,
      price: true,
    },
  });

  return plans;
};

export const getMentorExpertiseService = async (mentorId) => {
  const profile = await prisma.mentorProfile.findUnique({
    where: {
      userId: mentorId,
    },
    include: {
      expertises: {
        include: {
          expertise: true,
        },
      },
    },
  });

  if (!profile) {
    const error = new Error("Mentor profile not found");
    error.statusCode = 404;
    throw error;
  }

  return profile.expertises.map((item) => item.expertise);
};





//
// ADD EXPERTISE
//
export const addExpertiseService = async (userId, name) => {
  if (!name || !name.trim()) {
    const error = new Error("Expertise name is required");
    error.statusCode = 400;
    throw error;
  }

  // 1. ensure mentor profile exists
  const profile = await prisma.mentorProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    const error = new Error("Mentor profile not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. find or create expertise
  let expertise = await prisma.expertise.findUnique({
    where: { name },
  });

  if (!expertise) {
    expertise = await prisma.expertise.create({
      data: { name },
    });
  }

  // 3. check duplicate link
  const existingLink = await prisma.mentorExpertise.findFirst({
    where: {
      mentorProfileId: profile.id,
      expertiseId: expertise.id,
    },
  });

  if (existingLink) {
    const error = new Error("Expertise already added");
    error.statusCode = 400;
    throw error;
  }

  // 4. create relation
  const link = await prisma.mentorExpertise.create({
    data: {
      mentorProfileId: profile.id,
      expertiseId: expertise.id,
    },
    include: {
      expertise: true,
    },
  });

  return link.expertise;
};

//
// REMOVE EXPERTISE
//
export const removeExpertiseService = async (userId, expertiseId) => {
  const profile = await prisma.mentorProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    const error = new Error("Mentor profile not found");
    error.statusCode = 404;
    throw error;
  }

  const existingLink = await prisma.mentorExpertise.findFirst({
    where: {
      mentorProfileId: profile.id,
      expertiseId,
    },
  });

  if (!existingLink) {
    const error = new Error("Expertise not found for this mentor");
    error.statusCode = 404;
    throw error;
  }

  await prisma.mentorExpertise.delete({
    where: {
      id: existingLink.id,
    },
  });

  return { success: true };
};


export const createPlanService = async (mentorId, plan, price) => {
  if (!plan || !price) {
    const error = new Error("Plan and price are required");
    error.statusCode = 400;
    throw error;
  }

  // check duplicate (important for clean error instead of DB crash)
  const existing = await prisma.mentorPlan.findFirst({
    where: {
      mentorId,
      plan,
    },
  });

  if (existing) {
    const error = new Error("Plan already exists for this mentor");
    error.statusCode = 400;
    throw error;
  }

  const newPlan = await prisma.mentorPlan.create({
    data: {
      mentorId,
      plan,
      price,
    },
  });

  return newPlan;
};

//
// GET MY PLANS
//
export const getMyPlansService = async (mentorId) => {
  return await prisma.mentorPlan.findMany({
    where: { mentorId },
    select: {
      id: true,
      plan: true,
      price: true,
    },
  });
};

//
// UPDATE PLAN
//
export const updatePlanService = async (mentorId, planId, price) => {
  const existing = await prisma.mentorPlan.findUnique({
    where: { id: planId },
  });

  if (!existing || existing.mentorId !== mentorId) {
    const error = new Error("Plan not found or unauthorized");
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.mentorPlan.update({
    where: { id: planId },
    data: {
      price,
    },
  });

  return updated;
};

//
// DELETE PLAN
//
export const deletePlanService = async (mentorId, planId) => {
  const existing = await prisma.mentorPlan.findUnique({
    where: { id: planId },
  });

  if (!existing || existing.mentorId !== mentorId) {
    const error = new Error("Plan not found or unauthorized");
    error.statusCode = 404;
    throw error;
  }

  // OPTIONAL: block deletion if active mentorship exists
  const active = await prisma.mentorship.findFirst({
    where: {
      planId,
      status: "ACTIVE",
    },
  });

  if (active) {
    const error = new Error("Cannot delete plan with active mentorship");
    error.statusCode = 400;
    throw error;
  }

  await prisma.mentorPlan.delete({
    where: { id: planId },
  });

  return { success: true };
};