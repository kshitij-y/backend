export const otpEmailTemplate = ({ name, otp }) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>MentorConnect OTP Verification</h2>

      <p>Hello ${name},</p>

      <p>Your OTP is:</p>

      <h1 style="letter-spacing: 4px;">${otp}</h1>

      <p>This OTP will expire in 5 minutes.</p>

      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;
};

