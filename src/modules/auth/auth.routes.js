import express from "express";

import authMiddleware from "../../shared/middleware/auth.middleware.js";

import {
  forgotPasswordController,
  loginController,
  logoutController,
  meController,
  resetPasswordController,
  signupController,
  verifySignupOTPController,
} from "./auth.controller.js";

const router = express.Router();

router.post(
  "/signup",
  signupController
);

router.post(
  "/verify-signup-otp",
  verifySignupOTPController
);

router.post(
  "/login",
  loginController
);

router.post(
  "/logout",
  logoutController
);

router.get(
  "/me",
  authMiddleware,
  meController
);

router.post(
  "/forgot-password",
  forgotPasswordController
);

router.post(
  "/reset-password",
  resetPasswordController
);

export default router;






// import express from "express";
// import {
//   signup,
//   login,
//   logout,
//   getMe,
// } from "./auth.controller.js";

// import authMiddleware from "../../shared/middleware/auth.middleware.js";

// const router = express.Router();

// router.post("/signup", signupController);
// router.post( "/verify-signup-otp", verifySignupOTPController );

// router.post("/login", login);
// router.post("/logout", logout);
// router.get("/me", authMiddleware, getMe);

// export default router;