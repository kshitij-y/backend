import prisma from "../../config/db.js";
import streamClient from "../../config/stream.js";

const buildStreamUser = (user) => ({
  id: user.id,
  name: user.name,
  image: user.avatar || undefined,
});

const ensureStreamUsers = async (users) => {
  await streamClient.upsertUsers(
    users.map(buildStreamUser)
  );
};

export const ensureStreamUserService = async (user) => {
  await ensureStreamUsers([user]);
};

export const getChatTokenService = async (user) => {
  await ensureStreamUserService(user);

  return streamClient.createToken(user.id);
};

export const createMentorshipChannelService = async (
  userId,
  mentorshipId
) => {
  const mentorship = await prisma.mentorship.findUnique({
    where: { id: mentorshipId },
    include: {
      mentorProfile: {
        include: {
          user: true,
        },
      },
      mentee: true,
    },
  });

  if (!mentorship) {
    const error = new Error("Mentorship not found");
    error.statusCode = 404;
    throw error;
  }

  const mentorUser = mentorship.mentorProfile.user;
  const menteeUser = mentorship.mentee;

  if (mentorUser.id !== userId && menteeUser.id !== userId) {
    const error = new Error("Unauthorized");
    error.statusCode = 403;
    throw error;
  }

  await ensureStreamUsers([mentorUser, menteeUser]);

  const channelId =
    mentorship.streamChannelId ||
    `mentorship-${mentorship.id}`;

  const channel = streamClient.channel(
    "messaging",
    channelId,
    {
      created_by_id: menteeUser.id,
      members: [mentorUser.id, menteeUser.id],
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

  if (!mentorship.streamChannelId) {
    await prisma.mentorship.update({
      where: { id: mentorship.id },
      data: { streamChannelId: channelId },
    });
  }

  return {
    channelId,
    mentorshipId: mentorship.id,
  };
};
