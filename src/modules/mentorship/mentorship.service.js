import prisma from "../../config/db.js";
import streamClient from "../../config/stream.js";

export const createMentorshipService = async (menteeId, mentorId, planId) => {
	const mentor = await prisma.user.findUnique({
		where: { id: mentorId },
	});

	if (!mentor || mentor.role !== "MENTOR") {
		const error = new Error("Invalid mentor");
		error.statusCode = 400;
		throw error;
	}
	if (mentorId === menteeId) {
		const error = new Error("You cannot mentor yourself");
		error.statusCode = 400;
		throw error;
	}

	const mentorProfile = await prisma.mentorProfile.findUnique({
		where: { userId: mentorId },
		select: { id: true },
	});

	if (!mentorProfile) {
		const error = new Error("Mentor profile not found");
		error.statusCode = 400;
		throw error;
	}

	const plan = await prisma.mentorPlan.findUnique({
		where: { id: planId },
	});

	if (!plan || plan.mentorProfileId !== mentorProfile.id) {
		const error = new Error("Invalid plan for this mentor");
		error.statusCode = 400;
		throw error;
	}


	const existing = await prisma.mentorship.findFirst({
		where: {
			mentorProfileId: mentorProfile.id,
			menteeId,
			status: "ACTIVE",
		},
	});

	if (existing) {
		const error = new Error("Active mentorship already exists");
		error.statusCode = 400;
		throw error;
	}

	const startDate = new Date();
	const endDate = new Date();

	switch (plan.duration) {
		case "THREE_MONTH":
			endDate.setMonth(endDate.getMonth() + 3);
			break;
		case "SIX_MONTH":
			endDate.setMonth(endDate.getMonth() + 6);
			break;
		case "TWELVE_MONTH":
			endDate.setMonth(endDate.getMonth() + 12);
			break;
		default:
			throw new Error("Invalid plan type");
	}

	const mentorship = await prisma.mentorship.create({
		data: {
			mentorProfileId: mentorProfile.id,
			menteeId,
			mentorPlanId: planId,
			startDate,
			endDate,
		},
		include: {
			mentorProfile: {
				include: {
					user: {
						select: { id: true, name: true, avatar: true },
					},
				},
			},
			mentorPlan: true,
		},
	});

	return mentorship;
};


export const getMyMentorshipsService = async (userId) => {
	return await prisma.mentorship.findMany({
		where: {
			OR: [
				{ mentorProfile: { userId } },
				{ menteeId: userId },
			],
		},
		include: {
			mentorProfile: {
				select: {
					headline: true,
					experienceYears: true,
					isAvailable: true,
					user: {
						select: { id: true, name: true, avatar: true },
					},
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
				},
			},
			mentee: {
				select: { id: true, name: true, avatar: true },
			},
			mentorPlan: true,
		},
	});
};


export const getMentorshipByIdService = async (userId, id) => {
	const mentorship = await prisma.mentorship.findUnique({
		where: { id },
		include: {
			mentorProfile: {
				include: {
					user: true,
				},
			},
			mentee: true,
			mentorPlan: true,
		},
	});

	if (!mentorship) {
		const error = new Error("Mentorship not found");
		error.statusCode = 404;
		throw error;
	}

	if (
		mentorship.mentorProfile.userId !== userId &&
		mentorship.menteeId !== userId
	) {
		const error = new Error("Unauthorized");
		error.statusCode = 403;
		throw error;
	}

	return mentorship;
};

export const updateMentorshipStatusService = async (userId, id, status) => {
	const mentorship = await prisma.mentorship.findUnique({
		where: { id },
		include: {
			mentorProfile: {
				select: { userId: true },
			},
		},
	});

	if (!mentorship) {
		const error = new Error("Mentorship not found");
		error.statusCode = 404;
		throw error;
	}

	if (mentorship.mentorProfile.userId !== userId) {
		const error = new Error("Only mentor can update status");
		error.statusCode = 403;
		throw error;
	}

	const updated = await prisma.mentorship.update({
		where: { id },
		data: { status },
	});

	return updated;
};

export const attachStreamChannelToMentorshipService = async (
	mentorshipId
) => {

	const mentorship = await prisma.mentorship.findUnique({
		where: {
			id: mentorshipId,
		},

		include: {
			mentorProfile: {
				include: {
					user: true,
				},
			},
			mentee: true,
			mentorPlan: true,
		},
	});

	if (!mentorship) {
		const error = new Error("Mentorship not found");
		error.statusCode = 404;
		throw error;
	}


	if (mentorship.streamChannelId) {
		return mentorship;
	}

	await streamClient.upsertUsers([
		{
			id: mentorship.mentorProfile.user.id,
			name: mentorship.mentorProfile.user.name,
			image: mentorship.mentorProfile.user.avatar || undefined,
		},

		{
			id: mentorship.mentee.id,
			name: mentorship.mentee.name,
			image: mentorship.mentee.avatar || undefined,
		},
	]);

	const streamChannelId = `mentorship-${mentorship.id}`;

	const channel = streamClient.channel(
		"messaging",
		streamChannelId,
		{
			created_by_id: mentorship.mentee.id,

			members: [
				mentorship.mentorProfile.user.id,
				mentorship.mentee.id,
			],
		}
	);


	try {
		await channel.create();
	} catch (error) {
		const message =
			typeof error?.message === "string"
				? error.message
				: "";
		const isAlreadyExists =
			error?.code === 16 ||
			message.toLowerCase().includes("already exists");

		if (!isAlreadyExists) {
			throw error;
		}
	}

	const updatedMentorship = await prisma.mentorship.update({
		where: {
			id: mentorship.id,
		},

		data: {
			streamChannelId,
		},

		include: {
			mentorProfile: {
				include: {
					user: {
						select: {
							id: true,
							name: true,
							avatar: true,
						},
					},
				},
			},

			mentee: {
				select: {
					id: true,
					name: true,
					avatar: true,
				},
			},

			mentorPlan: true,
		},
	});

	return updatedMentorship;
};