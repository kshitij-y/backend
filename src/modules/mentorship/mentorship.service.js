import prisma from "../../config/db.js";
import streamClient from "../../config/stream.js";
import {
	createCalendarEventService,
} from "../calendar/calendar.service.js";
//
// CREATE MENTORSHIP
//
export const createMentorshipService = async (menteeId, mentorId, planId) => {
	// 1. mentor must exist
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

	// 2. plan must belong to mentor
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

	// 3. prevent duplicate ACTIVE mentorship
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

	// 4. calculate dates
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

	// 5. create mentorship
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

//
// GET MY MENTORSHIPS
//
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

//
// GET SINGLE
//
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

	// security: only participants can view
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

//
// UPDATE STATUS
//
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

	// only mentor can update
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

const resolveScheduleTimes = ({ startDate, endDate, durationMinutes }) => {
	if (!startDate) {
		const error = new Error("Start date is required");
		error.statusCode = 400;
		throw error;
	}

	const start = new Date(startDate);
	if (Number.isNaN(start.getTime())) {
		const error = new Error("Invalid start date");
		error.statusCode = 400;
		throw error;
	}

	let end = null;
	if (endDate) {
		end = new Date(endDate);
	} else if (durationMinutes) {
		end = new Date(
			start.getTime() + Number(durationMinutes) * 60 * 1000
		);
	}

	if (!end || Number.isNaN(end.getTime())) {
		const error = new Error("Invalid end date");
		error.statusCode = 400;
		throw error;
	}

	if (end <= start) {
		const error = new Error("End date must be after start date");
		error.statusCode = 400;
		throw error;
	}

	return { start, end };
};

const buildSessionDescription = ({ planTitle, menteeName, notes }) => {
	const parts = [
		`Mentorship session with ${menteeName}.`,
		planTitle ? `Plan: ${planTitle}.` : null,
		notes ? `Notes: ${notes}` : null,
	].filter(Boolean);

	return parts.join("\n");
};

export const scheduleMentorshipService = async (
	userId,
	mentorshipId,
	{ startDate, endDate, durationMinutes, notes }
) => {
	const mentorship = await prisma.mentorship.findUnique({
		where: { id: mentorshipId },
		include: {
			mentorProfile: {
				select: {
					userId: true,
					user: {
						select: { id: true, name: true },
					},
				},
			},
			mentee: {
				select: { id: true, name: true, email: true, avatar: true },
			},
			mentorPlan: true,
		},
	});

	if (!mentorship) {
		const error = new Error("Mentorship not found");
		error.statusCode = 404;
		throw error;
	}

	if (mentorship.mentorProfile.userId !== userId) {
		const error = new Error("Only mentors can schedule sessions");
		error.statusCode = 403;
		throw error;
	}

	const { start, end } = resolveScheduleTimes({
		startDate,
		endDate,
		durationMinutes,
	});

	const description = buildSessionDescription({
		planTitle: mentorship.mentorPlan?.title,
		menteeName: mentorship.mentee?.name || "mentee",
		notes,
	});

	let calendarEvent = null;
	try {
		calendarEvent = await createCalendarEventService(userId, {
			summary: `Mentorship session with ${mentorship.mentee?.name || "mentee"}`,
			description,
			start,
			end,
			attendees: mentorship.mentee?.email
				? [mentorship.mentee.email]
				: [],
			existingEventId: mentorship.googleEventId,
		});
	} catch (error) {
		const nextError = new Error("Failed to create calendar event");
		nextError.statusCode = error.statusCode || 500;
		throw nextError;
	}

	const updated = await prisma.mentorship.update({
		where: { id: mentorshipId },
		data: {
			startDate: start,
			endDate: end,
			status:
				mentorship.status === "PENDING" ? "ACTIVE" : mentorship.status,
			...(calendarEvent?.eventId && {
				googleEventId: calendarEvent.eventId,
			}),
			...(calendarEvent?.meetLink && {
				googleMeetLink: calendarEvent.meetLink,
			}),
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

	return updated;
};

export const attachStreamChannelToMentorshipService = async (
  mentorshipId
) => {
  //
  // 1. fetch mentorship
  //
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

  //
  // 2. already connected
  //
  if (mentorship.streamChannelId) {
    return mentorship;
  }

  //
  // 3. sync users to stream
  //
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

  //
  // 4. generate channel id
  //
	const streamChannelId = `mentorship-${mentorship.id}`;

  //
  // 5. create channel
  //
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

  //
  // 6. create/get channel
  //
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

  //
  // 7. save stream channel id
  //
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