import { transporter } from "./nodemailer.js";
import { otpEmailTemplate } from "./email.templates.js";

export const sendOTPEmail = async ({ to, name, otp }) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "OTP Verification",
    html: otpEmailTemplate({ name, otp }),
  });
};

// sendOTPEmail("kshitijyadav2003@gmail.com", "skhtij kumar", 12345)