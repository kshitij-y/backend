import prisma from "../../config/db.js";
import { createCalendarEventService } from "../calendar/calendar.service.js";
import { getGoogleConnection } from "../calendar/calendar.repository.js";


const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};


export const resolveSessionTimes = ({ startTime, endTime }) => {
  if (!startTime || !endTime) throw badRequest("startTime and endTime are required");

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime())) throw badRequest("Invalid startTime");
  if (isNaN(end.getTime())) throw badRequest("Invalid endTime");
  if (start <= new Date()) throw badRequest("startTime must be in the future");
  if (end <= start) throw badRequest("endTime must be after startTime");

  return { start, end };
};

export const requireScheduled = (session) => {
  if (session.status !== "SCHEDULED") {
    const error = new Error("Session is not in SCHEDULED status");
    error.statusCode = 400;
    throw error;
  }
};


export const createSessionService = async (userId, body) => {
  const { mentorshipId, startTime, endTime } = body;

  const mentorship = await prisma.mentorship.findUnique({
    where: { id: mentorshipId },
    include: {
      mentorProfile: {
        select: { userId: true },
      },
      mentee: {
        select: { email: true },
      },
    },
  });

  if (!mentorship) {
    const error = new Error("Mentorship not found");
    error.statusCode = 404;
    throw error;
  }

  if (mentorship.mentorProfile.userId !== userId) {
    const error = new Error("Only the mentor can create sessions for this mentorship");
    error.statusCode = 403;
    throw error;
  }

  if (mentorship.status !== "ACTIVE") {
    const error = new Error("Mentorship is not active");
    error.statusCode = 400;
    throw error;
  }

  const { start, end } = resolveSessionTimes({ startTime, endTime });

  let googleEventId = null;
  let googleMeetLink = null;

  const connection = await getGoogleConnection(userId);
  if (connection?.connected) {
    try {
      const result = await createCalendarEventService(userId, {
        summary: `Mentorship session`,
        description: `Scheduled mentorship session`,
        start,
        end,
        attendees: mentorship.mentee?.email ? [mentorship.mentee.email] : [],
      });
      if (result?.eventId) {
        googleEventId = result.eventId;
        googleMeetLink = result.meetLink ?? null;
      }
    } catch {
    }
  }

  const session = await prisma.session.create({
    data: {
      mentorshipId,
      startTime: start,
      endTime: end,
      status: "SCHEDULED",
      googleEventId,
      googleMeetLink,
    },
  });

  return session;
};

export const getSessionsByMentorshipService = async (userId, mentorshipId) => {
  const mentorship = await prisma.mentorship.findUnique({
    where: { id: mentorshipId },
    include: {
      mentorProfile: { select: { userId: true } },
      mentee: { select: { id: true } },
    },
  });

  if (!mentorship) {
    const error = new Error("Mentorship not found");
    error.statusCode = 404;
    throw error;
  }

  const isMentor = mentorship.mentorProfile.userId === userId;
  const isMentee = mentorship.mentee.id === userId;

  if (!isMentor && !isMentee) {
    const error = new Error("Forbidden");
    error.statusCode = 403;
    throw error;
  }

  return prisma.session.findMany({
    where: { mentorshipId },
    orderBy: { startTime: "asc" },
  });
};

export const completeSessionService = async (userId, sessionId) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      mentorship: {
        include: {
          mentorProfile: {
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  if (session.mentorship.mentorProfile.userId !== userId) {
    const error = new Error("Forbidden: only the mentor can complete this session");
    error.statusCode = 403;
    throw error;
  }

  requireScheduled(session);

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { status: "COMPLETED" },
  });

  return updated;
};

export const getUpcomingSessionsService = async (userId) => {
  return prisma.session.findMany({
    where: {
      status: "SCHEDULED",
      startTime: { gt: new Date() },
      mentorship: {
        status: "ACTIVE",
        OR: [
          { mentorProfile: { userId } },
          { menteeId: userId },
        ],
      },
    },
    orderBy: { startTime: "asc" },
    include: {
      mentorship: {
        include: {
          mentee: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          mentorPlan: {
            select: {
              title: true,
              duration: true,
            },
          },
        },
      },
    },
  });
};


export const cancelSessionService = async (userId, sessionId) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      mentorship: {
        include: {
          mentorProfile: {
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  if (session.mentorship.mentorProfile.userId !== userId) {
    const error = new Error("Forbidden: only the mentor can cancel this session");
    error.statusCode = 403;
    throw error;
  }

  requireScheduled(session);

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { status: "CANCELLED" },
  });

  return updated;
};


export const rescheduleSessionService = async (userId, sessionId, body) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      mentorship: {
        include: {
          mentorProfile: { select: { userId: true } },
          mentee: { select: { email: true } },
        },
      },
    },
  });

  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  const { mentorship } = session;

  if (mentorship.mentorProfile.userId !== userId) {
    const error = new Error("Forbidden: only the mentor can reschedule this session");
    error.statusCode = 403;
    throw error;
  }

  requireScheduled(session);

  if (mentorship.status !== "ACTIVE") {
    throw badRequest("Cannot reschedule a session for an inactive mentorship");
  }

  const { start, end } = resolveSessionTimes(body);

  let googleEventId = session.googleEventId ?? null;
  let googleMeetLink = session.googleMeetLink ?? null;

  try {
    const connection = await getGoogleConnection(userId);
    if (connection?.connected) {
      const calendarPayload = {
        summary: "Mentorship Session",
        description: "Scheduled mentorship session",
        start,
        end,
        attendees: mentorship.mentee?.email ? [mentorship.mentee.email] : [],
      };

      if (session.googleEventId) {
        calendarPayload.existingEventId = session.googleEventId;
      }

      const result = await createCalendarEventService(userId, calendarPayload);

      if (result?.eventId) {
        googleEventId = result.eventId;
        googleMeetLink = result.meetLink ?? null;
      }
    }
  } catch {
  }

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: {
      startTime: start,
      endTime: end,
      googleEventId,
      googleMeetLink,
    },
  });

  return updated;
};


export const getSessionHistoryService =
  async (userId) => {
    return prisma.session.findMany({
      where: {
        mentorship: {
          mentorProfile: {
            userId,
          },
        },

        status: {
          in: [
            "COMPLETED",
            "CANCELLED",
            "MISSED",
          ],
        },
      },

      include: {
        mentorship: {
          include: {
            mentee: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },

      orderBy: {
        startTime: "desc",
      },
    });
  };