import {
  GOOGLE_CALENDAR_SCOPES,
  createOAuthState,
  exchangeCodeForTokens,
  generateGoogleAuthUrl,
  refreshAccessToken,
  verifyOAuthState,
} from "../../integrations/google/googleClient.js";

import {
  disconnectGoogleConnection,
  getGoogleConnection,
  updateGoogleConnectionTokens,
  upsertGoogleConnection,
} from "./calendar.repository.js";

const PROVIDER = "google";
const REFRESH_THRESHOLD_MS = 60 * 1000;

const ensureMentor = (user) => {
  if (!user || user.role !== "MENTOR") {
    const error = new Error("Forbidden: Access denied");
    error.statusCode = 403;
    throw error;
  }
};

export const generateGoogleAuthUrlService = async (user) => {
  ensureMentor(user);

  const state = createOAuthState(user.id);

  return generateGoogleAuthUrl(state);
};

export const handleGoogleCallbackService = async (
  user,
  code,
  state
) => {
  ensureMentor(user);

  if (!code) {
    const error = new Error("Missing authorization code");
    error.statusCode = 400;
    throw error;
  }

  const decodedState = verifyOAuthState(state);
  if (
    !decodedState ||
    decodedState.userId !== user.id ||
    decodedState.purpose !== "google-calendar"
  ) {
    const error = new Error("Invalid OAuth state");
    error.statusCode = 400;
    throw error;
  }

  const tokens = await exchangeCodeForTokens(code);
  const existing = await getGoogleConnection(user.id);

  const refreshToken =
    tokens.refresh_token || existing?.refreshToken;

  if (!refreshToken) {
    const error = new Error(
      "Missing refresh token, reconnect the calendar"
    );
    error.statusCode = 400;
    throw error;
  }

  const accessToken = tokens.access_token || null;
  const expiryDate = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : existing?.expiryDate || null;

  const scopes = tokens.scope
    ? tokens.scope.split(" ")
    : GOOGLE_CALENDAR_SCOPES;

  await upsertGoogleConnection({
    userId: user.id,
    accessToken,
    refreshToken,
    expiryDate,
    scopes,
  });

  return {
    connected: true,
    provider: PROVIDER,
  };
};

export const disconnectCalendarService = async (userId) => {
  const existing = await getGoogleConnection(userId);

  if (!existing) {
    return {
      connected: false,
      provider: PROVIDER,
    };
  }

  await disconnectGoogleConnection(userId);

  return {
    connected: false,
    provider: PROVIDER,
  };
};

export const getConnectionStatusService = async (userId) => {
  const existing = await getGoogleConnection(userId);

  return {
    connected: Boolean(existing?.connected),
    provider: PROVIDER,
  };
};

export const refreshAccessTokenIfNeeded = async (connection) => {
  if (!connection || !connection.refreshToken) {
    return connection;
  }

  const expiresAt = connection.expiryDate
    ? connection.expiryDate.getTime()
    : 0;

  if (expiresAt && expiresAt - Date.now() > REFRESH_THRESHOLD_MS) {
    return connection;
  }

  const credentials = await refreshAccessToken(
    connection.refreshToken
  );

  const updated = await updateGoogleConnectionTokens(
    connection.userId,
    {
      accessToken:
        credentials.access_token || connection.accessToken,
      refreshToken:
        credentials.refresh_token || connection.refreshToken,
      expiryDate: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : connection.expiryDate,
      scopes: connection.scopes,
      connected: true,
    }
  );

  return updated;
};
