import prisma from "../../config/db.js";

export const getUserProfileService = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
};

export const updateUserProfileService = async (userId, data) => {
  const { name, email } = data;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(email && { email }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return updated;
};