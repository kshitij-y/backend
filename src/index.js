import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import notFound from "./shared/middleware/notFound.middleware.js";
import errorHandler from "./shared/middleware/error.middleware.js";

import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import mentorRoutes from "./modules/mentor/mentor.routes.js";
import mentorshipRoutes from "./modules/mentorship/mentorship.routes.js";
import calendarRoutes from "./modules/calendar/calendar.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";

// import streamRoutes from "./modules/stream/stream.routes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
        const now = new Date().toISOString();
        const method = req.method.padEnd(6, " ");
        const status = res.statusCode;
        const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const statusColor = status >= 500 ? 31 : status >= 400 ? 33 : 32;
        const reset = "\x1b[0m";
        const color = `\x1b[${statusColor}m`;

        console.log(
            `${now} | ${method} ${req.originalUrl} | ${color}${status}${reset} | ${latencyMs.toFixed(1)}ms`,
        );
    });

    next();
});

app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    }),
);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "API is running 🚀",
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/mentorships", mentorshipRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);

// app.use("/api/stream", streamRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
