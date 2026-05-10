import { google } from "googleapis";
import crypto from "crypto";
import jwt from "jsonwebtoken";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

const getOAuthConfig = () => {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  } = process.env;

  if (
    !GOOGLE_CLIENT_ID ||
    !GOOGLE_CLIENT_SECRET ||
    !GOOGLE_REDIRECT_URI
  ) {
    const error = new Error(
      "Google OAuth environment variables are missing"
    );
    error.statusCode = 500;
    throw error;
  }

  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
  };
};

export const createGoogleOAuthClient = () => {
  const { clientId, clientSecret, redirectUri } =
    getOAuthConfig();

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
};

export const generateGoogleAuthUrl = (state) => {
  const client = createGoogleOAuthClient();

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });
};

export const createOAuthState = (userId) => {
  const nonce = crypto.randomBytes(16).toString("hex");

  return jwt.sign(
    { userId, nonce, purpose: "google-calendar" },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );
};

export const verifyOAuthState = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const exchangeCodeForTokens = async (code) => {
  const client = createGoogleOAuthClient();
  const { tokens } = await client.getToken(code);

  return tokens;
};

export const buildOAuthCredentials = (connection) => {
  return {
    access_token: connection.accessToken || undefined,
    refresh_token: connection.refreshToken || undefined,
    expiry_date: connection.expiryDate
      ? connection.expiryDate.getTime()
      : undefined,
  };
};

export const refreshAccessToken = async (refreshToken) => {
  const client = createGoogleOAuthClient();

  client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await client.refreshAccessToken();

  return credentials;
};
