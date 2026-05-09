import streamClient from "../../config/stream.js";

export const generateStreamTokenService = async (user) => {
  // sync user to stream
  await streamClient.upsertUser({
    id: user.id,
    name: user.name
  });

  // generate token
  const token = streamClient.createToken(user.id);

  return {
    token,
    apiKey: process.env.STREAM_API_KEY,
    user: {
      id: user.id,
      name: user.name,
    },
  };
};