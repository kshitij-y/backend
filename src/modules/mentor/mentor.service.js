import prisma from "../../config/db.js";

const isNonEmptyString = (value) =>
	typeof value === "string" && value.trim().length > 0;

const isProfileCompleted = ({
	headline,
	about,
	experienceYears,
}) => {
	return (
		isNonEmptyString(headline) &&
		isNonEmptyString(about) &&
		experienceYears !== null &&
		experienceYears !== undefined
	);
};

const toSlug = (value) => {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
};

const buildOnboardingStatus = async (userId) => {
	const mentorProfile = await prisma.mentorProfile.findUnique({
		where: {
			userId,
		},
		include: {
			expertise: true,
			mentorPlans: true,
		},
	});

	const googleConnection = await prisma.oAuthConnection.findUnique({
		where: {
			userId_provider: {
				userId,
				provider: "google",
			},
		},
		select: {
			connected: true,
		},
	});

	if (!mentorProfile) {
		return {
			completed: false,
			steps: {
				profile: false,
				expertise: false,
				plans: false,
				googleCalendar: Boolean(googleConnection?.connected),
			},
			calendarConnected: Boolean(googleConnection?.connected),
		};
	}

	const profileCompleted = isProfileCompleted(mentorProfile);
	const expertiseCompleted = mentorProfile.expertise.length > 0;
	const plansCompleted = mentorProfile.mentorPlans.length > 0;
	const googleCalendarCompleted = Boolean(googleConnection?.connected);

	return {
		completed: profileCompleted && expertiseCompleted && plansCompleted,
		steps: {
			profile: profileCompleted,
			expertise: expertiseCompleted,
			plans: plansCompleted,
			googleCalendar: googleCalendarCompleted,
		},
		calendarConnected: googleCalendarCompleted,
	};
};

const syncOnboardingCompletion = async (userId) => {
	const status = await buildOnboardingStatus(userId);

	await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			onboardingCompleted: status.completed,
		},
	});

	return status;
};



/**
 * onboarding route for mentor
 */
export const getOnboardingStatusService =
  async (userId) => {
		return syncOnboardingCompletion(userId);
  };

//////////////////////////////////////////////////////////////////////////

//
// CREATE PROFILE
//
export const createMentorProfileService = async (userId, data) => {
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
			headline: data.headline,
			about: data.about,
			experienceYears: data.experienceYears,
			isAvailable:
				data.isAvailable !== undefined
					? data.isAvailable
					: true,
			profileCompleted: isProfileCompleted({
				headline: data.headline,
				about: data.about,
				experienceYears: data.experienceYears,
			}),
		},
	});

	await syncOnboardingCompletion(userId);

	return profile;
};

//
// GET MY PROFILE
//
export const getMyProfileService = async (userId) => {
	const profile = await prisma.mentorProfile.findUnique({
		where: { userId },
		select: {
			id: true,
			userId: true,
			headline: true,
			about: true,
			experienceYears: true,
			isAvailable: true,
			profileCompleted: true,
			createdAt: true,
			updatedAt: true,

			expertise: {
				select: {
					expertise: {
						select: {
							id: true,
							name: true,
							slug: true,
						},
					},
				},
			},

			mentorPlans: {
				select: {
					id: true,
					duration: true,
					title: true,
					description: true,
					price: true,
					isActive: true,
					createdAt: true,
					updatedAt: true,
				},
			},
		},
	});

	if (!profile) {
		const error = new Error("Profile not found");
		error.statusCode = 404;
		throw error;
	}

	return {
		...profile,
		expertise: profile.expertise.map((item) => item.expertise),
	};
};

//
// UPDATE PROFILE
//
export const updateProfileService = async (userId, data) => {
	const profile = await prisma.mentorProfile.findUnique({
		where: { userId },
	});

	if (!profile) {
		const error = new Error("Profile not found");
		error.statusCode = 404;
		throw error;
	}

	const nextValues = {
		headline:
			data.headline !== undefined
				? data.headline
				: profile.headline,
			about:
				data.about !== undefined
					? data.about
					: profile.about,
			experienceYears:
			data.experienceYears !== undefined
				? data.experienceYears
				: profile.experienceYears,
	};

	const updated = await prisma.mentorProfile.update({
		where: { userId },
		data: {
			...(data.headline !== undefined && {
				headline: data.headline,
			}),
			...(data.about !== undefined && {
				about: data.about,
			}),
			...(data.experienceYears !== undefined && {
				experienceYears: data.experienceYears,
			}),
			...(data.isAvailable !== undefined && {
				isAvailable: data.isAvailable,
			}),
			profileCompleted: isProfileCompleted(nextValues),
		},
	});

	await syncOnboardingCompletion(userId);

	return updated;
};


export const getAllMentorsService = async () => {
	const mentors = await prisma.user.findMany({
		where: {
			role: "MENTOR",
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			avatar: true,

			mentorProfile: {
				select: {
					headline: true,
					about: true,
					experienceYears: true,
					isAvailable: true,
					profileCompleted: true,

					expertise: {
						select: {
							expertise: {
								select: {
									id: true,
									name: true,
									slug: true,
								},
							},
						},
					},

					mentorPlans: {
						select: {
							id: true,
							duration: true,
							title: true,
							description: true,
							price: true,
							isActive: true,
						},
					},
				},
			},
		},
	});

	return mentors.map((mentor) => ({
		...mentor,
		mentorProfile: mentor.mentorProfile
			? {
				...mentor.mentorProfile,
				expertise: mentor.mentorProfile.expertise.map(
					(item) => item.expertise
				),
			}
			: null,
	}));
};


export const getMentorByIdService = async (mentorId) => {
	const mentor = await prisma.user.findUnique({
		where: { id: mentorId },
		select: {
			id: true,
			name: true,
			role: true,
			avatar: true,

			mentorProfile: {
				select: {
					headline: true,
					about: true,
					experienceYears: true,
					isAvailable: true,
					profileCompleted: true,
					expertise: {
						include: {
							expertise: true,
						},
					},
					mentorPlans: {
						select: {
							id: true,
							duration: true,
							title: true,
							description: true,
							price: true,
							isActive: true,
						},
					},
				},
			},
		},
	});

	if (!mentor || mentor.role !== "MENTOR") {
		const error = new Error("Mentor not found");
		error.statusCode = 404;
		throw error;
	}

	return {
		...mentor,
		mentorProfile: mentor.mentorProfile
			? {
				...mentor.mentorProfile,
				expertise: mentor.mentorProfile.expertise.map(
					(item) => item.expertise
				),
			}
			: null,
	};
};

export const getMentorPlansService = async (mentorId) => {
	const profile = await prisma.mentorProfile.findUnique({
		where: { userId: mentorId },
		select: { id: true },
	});

	if (!profile) {
		return [];
	}

	return prisma.mentorPlan.findMany({
		where: {
			mentorProfileId: profile.id,
			isActive: true,
		},
		select: {
			id: true,
			duration: true,
			title: true,
			description: true,
			price: true,
			isActive: true,
		},
	});
};

export const getMentorExpertiseService = async (mentorId) => {
	const profile = await prisma.mentorProfile.findUnique({
		where: {
			userId: mentorId,
		},
		include: {
			expertise: {
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

	return profile.expertise.map((item) => item.expertise);
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

	const slug = toSlug(name);
	if (!slug) {
		const error = new Error("Expertise name is invalid");
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
		where: { slug },
	});

	if (!expertise) {
		expertise = await prisma.expertise.create({
			data: { name, slug },
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

	await syncOnboardingCompletion(userId);

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

	await syncOnboardingCompletion(userId);

	return { success: true };
};


export const createPlanService = async (
	userId,
	data
) => {
	const { duration, price, title, description, isActive } = data;

	if (!duration || price === undefined || price === null) {
		const error = new Error("Duration and price are required");
		error.statusCode = 400;
		throw error;
	}

	const profile = await prisma.mentorProfile.findUnique({
		where: { userId },
		select: { id: true },
	});

	if (!profile) {
		const error = new Error("Mentor profile not found");
		error.statusCode = 404;
		throw error;
	}

	// check duplicate (important for clean error instead of DB crash)
	const existing = await prisma.mentorPlan.findFirst({
		where: {
			mentorProfileId: profile.id,
			duration,
		},
	});

	if (existing) {
		const error = new Error("Plan already exists for this mentor");
		error.statusCode = 400;
		throw error;
	}

	const newPlan = await prisma.mentorPlan.create({
		data: {
			mentorProfileId: profile.id,
			duration,
			title,
			description,
			price,
			...(isActive !== undefined && { isActive }),
		},
	});

	await syncOnboardingCompletion(userId);

	return newPlan;
};

//
// GET MY PLANS
//
export const getMyPlansService = async (userId) => {
	const profile = await prisma.mentorProfile.findUnique({
		where: { userId },
		select: { id: true },
	});

	if (!profile) {
		return [];
	}

	return prisma.mentorPlan.findMany({
		where: { mentorProfileId: profile.id },
		select: {
			id: true,
			duration: true,
			title: true,
			description: true,
			price: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
		},
	});
};

//
// UPDATE PLAN
//
export const updatePlanService = async (userId, planId, data) => {
	const existing = await prisma.mentorPlan.findUnique({
		where: { id: planId },
		include: {
			mentorProfile: {
				select: { userId: true },
			},
		},
	});

	if (!existing || existing.mentorProfile.userId !== userId) {
		const error = new Error("Plan not found or unauthorized");
		error.statusCode = 404;
		throw error;
	}

	const updated = await prisma.mentorPlan.update({
		where: { id: planId },
		data: {
			...(data.price !== undefined && { price: data.price }),
			...(data.title !== undefined && { title: data.title }),
			...(data.description !== undefined && {
				description: data.description,
			}),
			...(data.isActive !== undefined && {
				isActive: data.isActive,
			}),
		},
	});

	await syncOnboardingCompletion(userId);

	return updated;
};

//
// DELETE PLAN
//
export const deletePlanService = async (userId, planId) => {
	const existing = await prisma.mentorPlan.findUnique({
		where: { id: planId },
		include: {
			mentorProfile: {
				select: { userId: true },
			},
		},
	});

	if (!existing || existing.mentorProfile.userId !== userId) {
		const error = new Error("Plan not found or unauthorized");
		error.statusCode = 404;
		throw error;
	}

	// OPTIONAL: block deletion if active mentorship exists
	const active = await prisma.mentorship.findFirst({
		where: {
			mentorPlanId: planId,
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

	await syncOnboardingCompletion(userId);

	return { success: true };
};


export const getMentorMenteesService =
  async (userId) => {
    const mentorships =
      await prisma.mentorship.findMany({
        where: {
          status: "ACTIVE",

          mentorProfile: {
            userId,
          },
        },

        select: {
          id: true,

          mentee: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return mentorships.map(
      (item) => ({
        mentorshipId: item.id,
        menteeId:
          item.mentee.id,
        name: item.mentee.name,
        avatar:
          item.mentee.avatar,
      })
    );
  };