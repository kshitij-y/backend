import bcrypt from "bcryptjs";

import prisma from "../../config/db.js";

import { sendOTPEmail } from "../../integrations/email/email.service.js";

import { signToken } from "../../shared/utils/jwt.js";

import {
  generateOTP,
  hashOTP,
} from "./auth.utils.js";

import { OTP_EXPIRY_MINUTES } from "./auth.constants.js";

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isProfileCompleted = ({
  headline,
  about,
  experienceYears,
}) => {
  return (
    isNonEmptyString(headline) &&
    isNonEmptyString(about) &&
    experienceYears !== null &&
    experienceYears !== undefined
  );
};

const mapMentorProfile = (mentorProfile) => {
  if (!mentorProfile) {
    return null;
  }

  return {
    ...mentorProfile,
    expertise: (mentorProfile.expertise || []).map(
      (item) => item.expertise
    ),
  };
};

const getCalendarConnection = async (userId) => {
  const connection = await prisma.oAuthConnection.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: "google",
      },
    },
    select: {
      connected: true,
    },
  });

  return Boolean(connection?.connected);
};

const buildOnboardingStatus = (mentorProfile, calendarConnected) => {
  if (!mentorProfile) {
    return {
      completed: false,
      steps: {
        profile: false,
        expertise: false,
        plans: false,
        googleCalendar: calendarConnected,
      },
    };
  }

  const profileCompleted = isProfileCompleted(mentorProfile);
  const expertiseCompleted = mentorProfile.expertise.length > 0;
  const plansCompleted = mentorProfile.mentorPlans.length > 0;

  return {
    completed: profileCompleted && expertiseCompleted && plansCompleted,
    steps: {
      profile: profileCompleted,
      expertise: expertiseCompleted,
      plans: plansCompleted,
      googleCalendar: calendarConnected,
    },
  };
};

export const signupService = async ({
  name,
  email,
  password,
  role,
}) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const passwordHash = await bcrypt.hash(
    password,
    10
  );

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      isVerified: false,
    },
  });

  const otp = generateOTP();

  const otpHash = hashOTP(otp);

  const expiresAt = new Date(
    Date.now() +
    OTP_EXPIRY_MINUTES * 60 * 1000
  );

  await prisma.OTPVerification.deleteMany({
    where: {
      email,
    },
  });

  await prisma.OTPVerification.create({
    data: {
      email,
      otpHash,
      purpose: "SIGNUP",
      expiresAt,
    },
  });

  await sendOTPEmail({
    to: email,
    name,
    otp,
  });

  return {
    userId: user.id,
    email: user.email,
  };
};

export const verifySignupOTPService = async ({
  email,
  otp,
}) => {
  const existingOTP =
    await prisma.OTPVerification.findFirst({
      where: {
        email,
        purpose: "SIGNUP",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (!existingOTP) {
    throw new Error("OTP not found");
  }

  if (existingOTP.expiresAt < new Date()) {
    throw new Error("OTP expired");
  }

  const otpHash = hashOTP(otp);

  if (otpHash !== existingOTP.otpHash) {
    throw new Error("Invalid OTP");
  }

  const user = await prisma.user.update({
    where: {
      email,
    },

    data: {
      isVerified: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      bio: true,
      isVerified: true,
      onboardingCompleted: true,
      createdAt: true,

      mentorProfile: true,
    },
  });

  const calendarConnected =
    user.role === "MENTOR"
      ? await getCalendarConnection(user.id)
      : false;

  const mentorProfile = user.mentorProfile
    ? await prisma.mentorProfile.findUnique({
        where: { userId: user.id },
        include: {
          expertise: {
            include: {
              expertise: true,
            },
          },
          mentorPlans: true,
        },
      })
    : null;

  const onboardingStatus =
    user.role === "MENTOR"
      ? buildOnboardingStatus(
          mentorProfile,
          calendarConnected
        )
      : null;

  await prisma.OTPVerification.deleteMany({
    where: {
      email,
    },
  });

  const token = signToken({
    id: user.id,
    role: user.role,
  });

  return {
    token,
    user: {
      ...user,
      mentorProfile: mapMentorProfile(mentorProfile),
      calendarConnected,
      onboardingStatus,
    },
  };
};

export const loginService = async ({
  email,
  password,
}) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },

    include: {
      mentorProfile: {
        include: {
          expertise: {
            include: {
              expertise: true,
            },
          },

          mentorPlans: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (!user.isVerified) {
    throw new Error(
      "Please verify your account"
    );
  }

  const isPasswordCorrect =
    await bcrypt.compare(
      password,
      user.passwordHash
    );

  if (!isPasswordCorrect) {
    throw new Error("Invalid credentials");
  }

  const token = signToken({
    id: user.id,
    role: user.role,
  });

  const calendarConnected =
    user.role === "MENTOR"
      ? await getCalendarConnection(user.id)
      : false;

  const onboardingStatus =
    user.role === "MENTOR"
      ? buildOnboardingStatus(
          user.mentorProfile,
          calendarConnected
        )
      : null;

  if (
    user.role === "MENTOR" &&
    onboardingStatus &&
    user.onboardingCompleted !== onboardingStatus.completed
  ) {
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingCompleted: onboardingStatus.completed },
    });
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    isVerified: user.isVerified,
    onboardingCompleted:
      user.onboardingCompleted,
    createdAt: user.createdAt,
    mentorProfile: mapMentorProfile(user.mentorProfile),
    calendarConnected,
    onboardingStatus,
  };

  return {
    token,
    user: safeUser,
  };
};


export const meService = async (userId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      bio: true,
      isVerified: true,
      onboardingCompleted: true,
      createdAt: true,

      mentorProfile: {
        include: {
          expertise: {
            include: {
              expertise: true,
            },
          },

          mentorPlans: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const calendarConnected =
    user.role === "MENTOR"
      ? await getCalendarConnection(user.id)
      : false;

  const onboardingStatus =
    user.role === "MENTOR"
      ? buildOnboardingStatus(
          user.mentorProfile,
          calendarConnected
        )
      : null;

  if (
    user.role === "MENTOR" &&
    onboardingStatus &&
    user.onboardingCompleted !== onboardingStatus.completed
  ) {
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingCompleted: onboardingStatus.completed },
    });
  }

  return {
    ...user,
    mentorProfile: mapMentorProfile(user.mentorProfile),
    calendarConnected,
    onboardingStatus,
  };
};

export const logoutService = async () => {
  return true;
};

export const forgotPasswordService =
  async ({ email }) => {
    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (user) {
      const otp = generateOTP();

      const otpHash = hashOTP(otp);

      const expiresAt = new Date(
        Date.now() +
        OTP_EXPIRY_MINUTES * 60 * 1000
      );

      await prisma.OTPVerification.deleteMany({
        where: {
          email,
        },
      });

      await prisma.OTPVerification.create({
        data: {
          email,
          otpHash,
          purpose: "FORGOT_PASSWORD",
          expiresAt,
        },
      });

      await sendOTPEmail({
        to: email,
        name: user.name,
        otp,
      });
    }

    return true;
  };

export const resetPasswordService =
  async ({
    email,
    otp,
    newPassword,
  }) => {
    const existingOTP =
      await prisma.OTPVerification.findFirst({
        where: {
          email,
          purpose: "FORGOT_PASSWORD",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (!existingOTP) {
      throw new Error("OTP not found");
    }

    if (existingOTP.expiresAt < new Date()) {
      throw new Error("OTP expired");
    }

    const otpHash = hashOTP(otp);

    if (otpHash !== existingOTP.otpHash) {
      throw new Error("Invalid OTP");
    }

    const passwordHash =
      await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: {
        email,
      },
      data: {
        passwordHash,
      },
    });

    await prisma.OTPVerification.deleteMany({
      where: {
        email,
      },
    });

    return true;
  };













// import prisma from "../../config/db.js";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";





// export const createUser = async ({ name, email, password, role }) => {
//   const existingUser = await prisma.user.findUnique({
//     where: { email },
//   });

//   if (existingUser) {
//     const error = new Error("User already exists");
//     error.statusCode = 400;
//     throw error;
//   }

//   const hashedPassword = await bcrypt.hash(password, 10);

//   const user = await prisma.user.create({
//     data: {
//       name,
//       email,
//       password: hashedPassword,
//       role,
//     },
//   });

//   return user;
// };

// export const loginUser = async ({ email, password }) => {
//   const user = await prisma.user.findUnique({
//     where: { email },
//   });

//   if (!user) {
//     const error = new Error("Invalid credentials");
//     error.statusCode = 401;
//     throw error;
//   }

//   const isMatch = await bcrypt.compare(password, user.password);

//   if (!isMatch) {
//     const error = new Error("Invalid credentials");
//     error.statusCode = 401;
//     throw error;
//   }

//   return user;
// };