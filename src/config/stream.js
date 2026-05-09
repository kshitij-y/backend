import { StreamChat } from "stream-chat";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  throw new Error("Missing Stream environment variables");
}

const streamClient = StreamChat.getInstance(
  apiKey,
  apiSecret
);

export default streamClient;