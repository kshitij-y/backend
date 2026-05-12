import prisma from "../../config/db.js";
import streamClient from "../../config/stream.js";
import { attachStreamChannelToMentorshipService } from "../mentorship/mentorship.service.js";

export const ensureStreamUserService = async (user) => {
  await streamClient.upsertUsers([
    {
      id: user.id,
      name: user.name,
      image: user.avatar || undefined,
    },
  ]);
};

export const getChatTokenService = async (user) => {
  await ensureStreamUserService(user);

  return streamClient.createToken(user.id);
};

export const createMentorshipChannelService = async (userId, mentorshipId) => {
  // Verify the caller is a participant before delegating
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

  if (mentorship.mentorProfile.userId !== userId && mentorship.mentee.id !== userId) {
    const error = new Error("Unauthorized");
    error.statusCode = 403;
    throw error;
  }

  const updated = await attachStreamChannelToMentorshipService(mentorshipId);
  return { channelId: updated.streamChannelId, mentorshipId: updated.id };
};
