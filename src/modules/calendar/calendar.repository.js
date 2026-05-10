import prisma from "../../config/db.js";

const PROVIDER_GOOGLE = "google";

export const getGoogleConnection = async (userId) => {
  return prisma.oAuthConnection.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: PROVIDER_GOOGLE,
      },
    },
  });
};

export const upsertGoogleConnection = async (data) => {
  return prisma.oAuthConnection.upsert({
    where: {
      userId_provider: {
        userId: data.userId,
        provider: PROVIDER_GOOGLE,
      },
    },
    update: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiryDate: data.expiryDate,
      scopes: data.scopes,
      connected: true,
    },
    create: {
      userId: data.userId,
      provider: PROVIDER_GOOGLE,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiryDate: data.expiryDate,
      scopes: data.scopes,
      connected: true,
    },
  });
};

export const updateGoogleConnectionTokens = async (
  userId,
  update
) => {
  return prisma.oAuthConnection.update({
    where: {
      userId_provider: {
        userId,
        provider: PROVIDER_GOOGLE,
      },
    },
    data: {
      accessToken: update.accessToken,
      refreshToken: update.refreshToken,
      expiryDate: update.expiryDate,
      scopes: update.scopes,
      connected: update.connected,
    },
  });
};

export const disconnectGoogleConnection = async (userId) => {
  return prisma.oAuthConnection.update({
    where: {
      userId_provider: {
        userId,
        provider: PROVIDER_GOOGLE,
      },
    },
    data: {
      connected: false,
      accessToken: null,
      refreshToken: null,
      expiryDate: null,
      scopes: [],
    },
  });
};
