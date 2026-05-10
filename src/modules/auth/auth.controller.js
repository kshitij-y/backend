import asyncHandler from "../../shared/utils/asyncHandler.js";

import { sendResponse } from "../../shared/utils/response.js";

import {
  clearAuthCookie,
  setAuthCookie,
} from "../../shared/utils/cookies.js";

import {
  forgotPasswordService,
  loginService,
  logoutService,
  meService,
  resetPasswordService,
  signupService,
  verifySignupOTPService,
} from "./auth.service.js";

export const signupController =
  asyncHandler(async (req, res) => {
    const data = await signupService(
      req.body
    );

    return sendResponse(
      res,
      201,
      data,
      "OTP sent successfully"
    );
  });

export const verifySignupOTPController =
  asyncHandler(async (req, res) => {
    const { token, user } =
      await verifySignupOTPService(
        req.body
      );

    setAuthCookie(res, token);

    return sendResponse(
      res,
      200,
      user,
      "OTP verified successfully"
    );
  });

export const loginController =
  asyncHandler(async (req, res) => {
    const { token, user } =
      await loginService(req.body);

    setAuthCookie(res, token);

    return sendResponse(
      res,
      200,
      user,
      "Login successful"
    );
  });

export const meController =
  asyncHandler(async (req, res) => {
    const user = await meService(
      req.user.id
    );

    return sendResponse(
      res,
      200,
      user,
      "User fetched successfully"
    );
  });

export const logoutController =
  asyncHandler(async (req, res) => {
    await logoutService();

    clearAuthCookie(res);

    return sendResponse(
      res,
      200,
      null,
      "Logout successful"
    );
  });

export const forgotPasswordController =
  asyncHandler(async (req, res) => {
    await forgotPasswordService(req.body);

    return sendResponse(
      res,
      200,
      null,
      "If account exists, OTP sent"
    );
  });

export const resetPasswordController =
  asyncHandler(async (req, res) => {
    await resetPasswordService(req.body);

    return sendResponse(
      res,
      200,
      null,
      "Password reset successful"
    );
  });




















// import {
//   createUser,
//   loginUser,
// } from "./auth.service.js";

// import { signToken } from "../../shared/utils/jwt.js";
// import { setAuthCookie, clearAuthCookie } from "../../shared/utils/cookies.js";
// import asyncHandler from "../../shared/utils/asyncHandler.js";
// import { sendResponse } from "../../shared/utils/response.js";


// export const signup = asyncHandler(async (req, res) => {
//   const { name, email, password, role } = req.body;

//   if (!name || !email || !password || !role) {
//     const error = new Error("All fields are required");
//     error.statusCode = 400;
//     throw error;
//   }

//   const user = await createUser({ name, email, password, role });

//   const token = signToken({ id: user.id });

//   setAuthCookie(res, token);

//   sendResponse(res, 201, {
//     id: user.id,
//     name: user.name,
//     email: user.email,
//     role: user.role,
//   }, "User created successfully");
// });


// export const login = asyncHandler(async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     const error = new Error("Email and password are required");
//     error.statusCode = 400;
//     throw error;
//   }

//   const user = await loginUser({ email, password });

//   const token = signToken({ id: user.id });

//   setAuthCookie(res, token);

//   sendResponse(res, 200, {
//     id: user.id,
//     name: user.name,
//     email: user.email,
//     role: user.role,
//   }, "Login successful");
// });


// export const logout = asyncHandler(async (req, res) => {
//   clearAuthCookie(res);

//   sendResponse(res, 200, null, "Logged out successfully");
// });


// export const getMe = asyncHandler(async (req, res) => {
//   const user = req.user;

//   sendResponse(res, 200, {
//     id: user.id,
//     name: user.name,
//     email: user.email,
//     role: user.role,
//   });
// });