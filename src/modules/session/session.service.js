import prisma from "../../config/db.js";
import { createCalendarEventService } from "../calendar/calendar.service.js";
import { getGoogleConnection } from "../calendar/calendar.repository.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Creates a 400 Bad Request error with the given message.
 * @param {string} message
 * @returns {Error}
 */
const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

/**
 * Validates and parses session start/end times.
 * - Both values must be present.
 * - Both must parse to valid Date objects.
 * - startTime must be in the future.
 * - endTime must be strictly after startTime.
 *
 * @param {{ startTime: unknown, endTime: unknown }} param0
 * @returns {{ start: Date, end: Date }}
 */
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

/**
 * Asserts that a session is in SCHEDULED status.
 * Throws a 400 error if the session has any other status.
 *
 * @param {{ status: string }} session
 */
export const requireScheduled = (session) => {
  if (session.status !== "SCHEDULED") {
    const error = new Error("Session is not in SCHEDULED status");
    error.statusCode = 400;
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Service functions will be added in subsequent tasks.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// createSessionService
// ---------------------------------------------------------------------------

/**
 * Creates a new session for an active mentorship.
 *
 * @param {string} userId - The authenticated user's ID (must be the mentor).
 * @param {{ mentorshipId: string, startTime: unknown, endTime: unknown }} body
 * @returns {Promise<object>} The created session record.
 */
export const createSessionService = async (userId, body) => {
  const { mentorshipId, startTime, endTime } = body;

  // 1. Fetch the mentorship with the mentor's userId and the mentee's email.
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

  // 2. Throw 404 if not found.
  if (!mentorship) {
    const error = new Error("Mentorship not found");
    error.statusCode = 404;
    throw error;
  }

  // 3. Throw 403 if the caller is not the mentor.
  if (mentorship.mentorProfile.userId !== userId) {
    const error = new Error("Only the mentor can create sessions for this mentorship");
    error.statusCode = 403;
    throw error;
  }

  // 4. Throw 400 if the mentorship is not ACTIVE.
  if (mentorship.status !== "ACTIVE") {
    const error = new Error("Mentorship is not active");
    error.statusCode = 400;
    throw error;
  }

  // 5. Validate and parse times.
  const { start, end } = resolveSessionTimes({ startTime, endTime });

  // 6. Attempt calendar event creation (non-blocking).
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
      // non-blocking: calendar failure does not fail the session operation
    }
  }

  // 7. Persist the session record.
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

  // 8. Return the created session.
  return session;
};

/**
 * Returns all sessions for a given mentorship, ordered by startTime ascending.
 * Throws 404 if the mentorship is not found.
 * Throws 403 if the requesting user is neither the mentor nor the mentee.
 *
 * @param {string} userId - The ID of the requesting user.
 * @param {string} mentorshipId - The ID of the mentorship.
 * @returns {Promise<Session[]>}
 */
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

// ---------------------------------------------------------------------------
// completeSessionService
// ---------------------------------------------------------------------------

/**
 * Marks a session as COMPLETED.
 *
 * Authorization: only the mentor of the parent mentorship may complete a session.
 * Status guard: the session must currently be in SCHEDULED status.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 *
 * @param {string} userId  - ID of the authenticated user (must be the mentor)
 * @param {string} sessionId - ID of the session to complete
 * @returns {Promise<import("@prisma/client").Session>} The updated session record
 */
export const completeSessionService = async (userId, sessionId) => {
  // Fetch session with mentorship and mentorProfile.userId for ownership check
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

  // 404 if session does not exist
  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  // 403 if the caller is not the mentor
  if (session.mentorship.mentorProfile.userId !== userId) {
    const error = new Error("Forbidden: only the mentor can complete this session");
    error.statusCode = 403;
    throw error;
  }

  // 400 if the session is not in SCHEDULED status
  requireScheduled(session);

  // Persist the status change
  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { status: "COMPLETED" },
  });

  return updated;
};

// ---------------------------------------------------------------------------
// getUpcomingSessionsService
// ---------------------------------------------------------------------------

/**
 * Returns all upcoming SCHEDULED sessions for the given user across all their
 * ACTIVE mentorships (as either mentor or mentee), ordered by startTime ASC.
 *
 * @param {string} userId
 * @returns {Promise<import("@prisma/client").Session[]>}
 */
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

// ---------------------------------------------------------------------------
// cancelSessionService
// ---------------------------------------------------------------------------

/**
 * Cancels a scheduled session.
 *
 * Authorization: only the mentor of the session's mentorship may cancel.
 * Status guard: session must be in SCHEDULED status.
 *
 * @param {string} userId - The authenticated user's ID (must be the mentor).
 * @param {string} sessionId - The ID of the session to cancel.
 * @returns {Promise<import("@prisma/client").Session>} The updated session record.
 *
 * @throws {Error} 404 if the session does not exist.
 * @throws {Error} 403 if the authenticated user is not the mentor.
 * @throws {Error} 400 if the session is not in SCHEDULED status.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export const cancelSessionService = async (userId, sessionId) => {
  // Fetch session with mentorship and mentorProfile.userId for auth check
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

  // Requirement 6.3 — 404 if session not found
  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  // Requirement 6.2 — 403 if not the mentor
  if (session.mentorship.mentorProfile.userId !== userId) {
    const error = new Error("Forbidden: only the mentor can cancel this session");
    error.statusCode = 403;
    throw error;
  }

  // Requirement 6.4 — 400 if not SCHEDULED
  requireScheduled(session);

  // Requirement 6.5 — persist status: "CANCELLED"
  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { status: "CANCELLED" },
  });

  return updated;
};

// ---------------------------------------------------------------------------
// rescheduleSessionService
// ---------------------------------------------------------------------------

/**
 * Reschedules an existing session to new start/end times.
 *
 * Authorization: only the mentor of the session's mentorship may reschedule.
 * Guards:
 *   - 404 if session not found
 *   - 403 if caller is not the mentor
 *   - 400 if session status is not SCHEDULED
 *   - 400 if parent mentorship status is not ACTIVE
 *   - 400 if new times are invalid (via resolveSessionTimes)
 *
 * Calendar update is attempted non-blocking: failures are swallowed and the
 * session is still persisted with the new times.
 *
 * @param {string} userId       - Authenticated user's ID (must be the mentor)
 * @param {string} sessionId    - ID of the session to reschedule
 * @param {{ startTime: unknown, endTime: unknown }} body
 * @returns {Promise<import("@prisma/client").Session>} Updated session record
 */
export const rescheduleSessionService = async (userId, sessionId, body) => {
  // 1. Fetch session with mentorship and mentorProfile.userId
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

  // 2. 404 if not found
  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  const { mentorship } = session;

  // 3. 403 if caller is not the mentor
  if (mentorship.mentorProfile.userId !== userId) {
    const error = new Error("Forbidden: only the mentor can reschedule this session");
    error.statusCode = 403;
    throw error;
  }

  // 4. 400 if session is not SCHEDULED
  requireScheduled(session);

  // 5. 400 if mentorship is not ACTIVE
  if (mentorship.status !== "ACTIVE") {
    throw badRequest("Cannot reschedule a session for an inactive mentorship");
  }

  // 6. Validate and parse new times
  const { start, end } = resolveSessionTimes(body);

  // 7. Attempt calendar update (non-blocking)
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

      // Pass existingEventId when the session already has a calendar event
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
    // Calendar failure is non-blocking — session update proceeds regardless
  }

  // 8. Persist updated session
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