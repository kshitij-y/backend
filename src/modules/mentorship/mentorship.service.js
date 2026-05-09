import prisma from "../../config/db.js";
import streamClient from "../../config/stream.js";
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
	const plan = await prisma.mentorPlan.findUnique({
		where: { id: planId },
	});

	if (!plan || plan.mentorId !== mentorId) {
		const error = new Error("Invalid plan for this mentor");
		error.statusCode = 400;
		throw error;
	}

	// 3. prevent duplicate ACTIVE mentorship
	const existing = await prisma.mentorship.findFirst({
		where: {
			mentorId,
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

	switch (plan.plan) {
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
			mentorId,
			menteeId,
			planId,
			startDate,
			endDate,
		},
		include: {
			mentor: {
				select: { id: true, name: true },
			},
			plan: true,
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
				{ mentorId: userId },
				{ menteeId: userId },
			],
		},
		include: {
			mentor: {
				select: { id: true, name: true },
			},
			mentee: {
				select: { id: true, name: true },
			},
			plan: true,
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
			mentor: true,
			mentee: true,
			plan: true,
		},
	});

	if (!mentorship) {
		const error = new Error("Mentorship not found");
		error.statusCode = 404;
		throw error;
	}

	// security: only participants can view
	if (
		mentorship.mentorId !== userId &&
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
	});

	if (!mentorship) {
		const error = new Error("Mentorship not found");
		error.statusCode = 404;
		throw error;
	}

	// only mentor can update
	if (mentorship.mentorId !== userId) {
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
  //
  // 1. fetch mentorship
  //
  const mentorship = await prisma.mentorship.findUnique({
    where: {
      id: mentorshipId,
    },

    include: {
      mentor: true,
      mentee: true,
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
      id: mentorship.mentor.id,
      name: mentorship.mentor.name,
    },

    {
      id: mentorship.mentee.id,
      name: mentorship.mentee.name,
    },
  ]);

  //
  // 4. generate channel id
  //
  const streamChannelId = `mentorship_${mentorship.id}`;

  //
  // 5. create channel
  //
  const channel = streamClient.channel(
    "messaging",
    streamChannelId,
    {
      created_by_id: mentorship.mentee.id,

      members: [
        mentorship.mentor.id,
        mentorship.mentee.id,
      ],
    }
  );

  //
  // 6. create/get channel
  //
  await channel.create();

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
      mentor: {
        select: {
          id: true,
          name: true,
        },
      },

      mentee: {
        select: {
          id: true,
          name: true,
        },
      },

      plan: true,
    },
  });

  return updatedMentorship;
};