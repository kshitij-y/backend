import asyncHandler from "../../shared/utils/asyncHandler.js";
import { sendResponse } from "../../shared/utils/response.js";

import {
  disconnectCalendarService,
  generateGoogleAuthUrlService,
  getConnectionStatusService,
  handleGoogleCallbackService,
} from "./calendar.service.js";

const getRedirectUrl = (user) => {
  const baseUrl =
    process.env.CALENDAR_CONNECT_REDIRECT_URL ||
    process.env.CLIENT_URL;

  const rolePath =
    user?.role === "MENTOR"
      ? "/mentor/dashboard"
      : "/mentee/dashboard";

  const url = new URL(baseUrl);
  url.pathname = rolePath;

  return url.toString();
};

const buildRedirectUrl = (baseUrl, params) => {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
};

export const connectGoogleCalendar = asyncHandler(
  async (req, res) => {
    const url = await generateGoogleAuthUrlService(
      req.user
    );

    res.redirect(url);
  }
);

export const handleGoogleCallback = asyncHandler(
  async (req, res) => {
    const code = Array.isArray(req.query.code)
      ? req.query.code[0]
      : req.query.code;
    const state = Array.isArray(req.query.state)
      ? req.query.state[0]
      : req.query.state;
    const redirectUrl = getRedirectUrl(req.user);

    try {
      await handleGoogleCallbackService(req.user, code, state);

      res.redirect(
        buildRedirectUrl(redirectUrl, {
          calendar: "connected",
        })
      );
    } catch (error) {
      res.redirect(
        buildRedirectUrl(redirectUrl, {
          calendar: "error",
        })
      );
    }
  }
);

export const disconnectCalendar = asyncHandler(
  async (req, res) => {
    const data = await disconnectCalendarService(
      req.user.id
    );

    sendResponse(res, 200, data, "Disconnected");
  }
);

export const getConnectionStatus = asyncHandler(
  async (req, res) => {
    const data = await getConnectionStatusService(
      req.user.id
    );

    sendResponse(res, 200, data);
  }
);
