# MentorConnect Backend

MentorConnect Backend is the API layer for a mentor-mentee platform where mentees can discover mentors, book mentorships, attend scheduled sessions, chat with mentors, and use AI-assisted mentor matching. The backend handles authentication, OTP verification, mentor onboarding, mentorship management, session scheduling, Google Calendar integration, Stream Chat integration, and AI mentor search.

This repository contains the Express.js server, PostgreSQL database schema, Prisma ORM setup, API modules, integrations, and backend tests.

## Table of Contents

- [Project Overview](#project-overview)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Database Models](#database-models)
- [API Modules](#api-modules)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Docker](#docker)
- [Project Structure](#project-structure)
- [Security Notes](#security-notes)
- [Frontend Repository](#frontend-repository)

## Project Overview

MentorConnect supports two primary user roles:

- `MENTEE`: Can browse mentors, view mentor profiles, request mentorships, chat with mentors, and use AI mentor matching.
- `MENTOR`: Can complete onboarding, create a mentor profile, add expertise, create pricing plans, approve mentorship requests, schedule sessions, connect Google Calendar, and chat with mentees.

The backend exposes REST APIs consumed by the React frontend. Authentication is handled with JWT stored in HTTP-only cookies. Data is persisted in PostgreSQL through Prisma.

## Core Features

### Authentication and Account Management

- User signup with OTP verification.
- Secure password hashing with `bcryptjs`.
- Login and logout using JWT cookies.
- Current user session restore via `/api/auth/me`.
- Forgot password and reset password using OTP.
- Role-based access control for mentors and mentees.

### Mentor Management

- Mentor profile creation and update.
- Mentor onboarding status tracking.
- Mentor expertise management.
- Mentor plan creation, update, and deletion.
- Public mentor discovery.
- Mentor detail, expertise, and plan APIs.
- Mentor mentee list API.

### Mentorship Management

- Mentee mentorship booking.
- Mentor and mentee mentorship listing.
- Mentorship detail retrieval.
- Mentorship status update.
- Stream chat channel connection per mentorship.

### Sessions

- Create sessions for mentorships.
- Get upcoming sessions.
- Get session history.
- Get sessions for a mentorship.
- Reschedule sessions.
- Cancel sessions.
- Complete sessions.
- Session state tracking with `SCHEDULED`, `COMPLETED`, `CANCELLED`, and `MISSED`.

### AI Mentor Search

- AI-powered mentor recommendation endpoint.
- Supports Gemini through the OpenAI-compatible Gemini endpoint.
- Falls back to OpenAI if Gemini credentials are not configured.
- Ranks available mentors using user prompts, mentor expertise, pricing, and profile data.

### Chat Integration

- Stream Chat token generation.
- Stream user creation/sync.
- Mentorship chat channel creation.
- Chat channel ID stored on mentorship records.

### Google Calendar Integration

- Mentor Google Calendar OAuth connection.
- Calendar connection status API.
- Calendar disconnect API.
- Google Calendar credentials stored through `OAuthConnection`.
- Session scheduling can be integrated with calendar event management.

### Email Integration

- OTP email delivery through Nodemailer.
- Email templates for verification and password reset flows.

## Tech Stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js |
| Server | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT, HTTP-only cookies |
| Password Hashing | bcryptjs |
| Email | Nodemailer |
| Calendar | Google APIs |
| Chat | Stream Chat |
| AI | Gemini API or OpenAI API |
| Testing | Vitest, fast-check |
| Deployment | Docker |

## System Architecture

```text
React Frontend
    |
    | HTTP requests with credentials
    v
Express Backend
    |
    | Prisma ORM
    v
PostgreSQL Database

External services:
    - Stream Chat for real-time messaging
    - Google Calendar for scheduling integration
    - SMTP provider for OTP emails
    - Gemini/OpenAI for AI mentor search
```

## Database Models

The Prisma schema defines the following major models:

### User

Stores all platform users. A user can be a mentor, mentee, or admin.

Important fields:

- `id`
- `name`
- `email`
- `passwordHash`
- `role`
- `avatar`
- `bio`
- `interests`
- `goals`
- `learningFocus`
- `isVerified`
- `onboardingCompleted`

### MentorProfile

Stores mentor-specific profile details.

Important fields:

- `userId`
- `headline`
- `about`
- `experienceYears`
- `isAvailable`
- `profileCompleted`

### Expertise

Stores reusable expertise categories such as React, Node.js, DSA, DevOps, or System Design.

### MentorExpertise

Junction table between mentors and expertise. This supports a many-to-many relationship.

### MentorPlan

Stores mentor pricing plans.

Important fields:

- `duration`
- `title`
- `description`
- `price`
- `isActive`

### Mentorship

Represents a mentee booking a mentor under a selected plan.

Important fields:

- `mentorProfileId`
- `menteeId`
- `mentorPlanId`
- `status`
- `startDate`
- `endDate`
- `streamChannelId`

### Session

Represents a scheduled mentorship session.

Important fields:

- `mentorshipId`
- `startTime`
- `endTime`
- `googleMeetLink`
- `googleEventId`
- `status`

### OTPVerification

Stores hashed OTP records for signup and forgot password flows.

### OAuthConnection

Stores OAuth connection details for providers such as Google Calendar.

## API Modules

The backend is organized into feature modules:

```text
src/modules/auth
src/modules/user
src/modules/mentor
src/modules/mentorship
src/modules/session
src/modules/calendar
src/modules/chat
src/modules/ai
```

Each module generally follows this pattern:

```text
routes -> controller -> service -> database/integration
```

This keeps routing, request handling, business logic, and database logic separated.

## Environment Variables

Create a `.env` file in the backend root.

Minimum local setup:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/capstone?schema=public"
PORT=5000
CLIENT_URL=http://localhost:3000
JWT_SECRET=replace_with_a_secure_secret
NODE_ENV=development
```

Email OTP configuration:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM="MentorConnect <no-reply@example.com>"
```

Stream Chat configuration:

```env
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
```

AI configuration. Use Gemini:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
```

Or OpenAI fallback:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

Google Calendar OAuth configuration:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/google/callback
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/kshitij-y/backend.git
cd backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create `.env` in the root folder and add the variables listed above.

### 4. Run Prisma generation

```bash
npm run prisma:generate
```

### 5. Run database migrations

```bash
npm run prisma:migrate
```

### 6. Start the development server

```bash
npm run dev
```

The backend will run on:

```text
http://localhost:5000
```

Health check:

```text
GET /
```

Expected response:

```json
{
  "success": true,
  "message": "API is running"
}
```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start server with Nodemon |
| `npm start` | Start server with Node |
| `npm test` | Run backend tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Run development migration |
| `npm run prisma:reset` | Reset database migrations |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run prisma:deploy` | Deploy migrations in production |

## API Reference

Base URL:

```text
http://localhost:5000/api
```

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/signup` | Register user and send OTP |
| `POST` | `/auth/verify-signup-otp` | Verify signup OTP |
| `POST` | `/auth/login` | Login user |
| `POST` | `/auth/logout` | Logout user |
| `GET` | `/auth/me` | Get current authenticated user |
| `POST` | `/auth/forgot-password` | Send password reset OTP |
| `POST` | `/auth/reset-password` | Reset password with OTP |

### Users

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/users/me` | Get current user profile |
| `PUT` | `/users/me` | Update current user profile |

### Mentors

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/mentors` | Get all available mentors |
| `GET` | `/mentors/:mentorId` | Get mentor by ID |
| `GET` | `/mentors/:mentorId/plans` | Get public mentor plans |
| `GET` | `/mentors/:mentorId/expertise` | Get public mentor expertise |
| `GET` | `/mentors/mentees` | Get mentor mentees |
| `POST` | `/mentors/profile` | Create mentor profile |
| `GET` | `/mentors/profile/me` | Get current mentor profile |
| `PUT` | `/mentors/profile` | Update mentor profile |
| `GET` | `/mentors/onboarding-status` | Get mentor onboarding status |
| `POST` | `/mentors/expertise` | Add mentor expertise |
| `DELETE` | `/mentors/expertise/:expertiseId` | Remove mentor expertise |
| `POST` | `/mentors/plans` | Create mentor plan |
| `GET` | `/mentors/plans/me` | Get current mentor plans |
| `PUT` | `/mentors/plans/:planId` | Update mentor plan |
| `DELETE` | `/mentors/plans/:planId` | Delete mentor plan |

### Mentorships

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/mentorships` | Create mentorship booking |
| `GET` | `/mentorships/me` | Get current user's mentorships |
| `GET` | `/mentorships/:id` | Get mentorship by ID |
| `PATCH` | `/mentorships/:id/status` | Update mentorship status |
| `PATCH` | `/mentorships/:id/schedule` | Schedule mentorship dates |

### Sessions

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/sessions` | Create session |
| `GET` | `/sessions/upcoming` | Get upcoming sessions |
| `GET` | `/sessions/history` | Get session history |
| `GET` | `/sessions/mentorship/:mentorshipId` | Get sessions for mentorship |
| `PATCH` | `/sessions/:id/reschedule` | Reschedule session |
| `PATCH` | `/sessions/:id/cancel` | Cancel session |
| `PATCH` | `/sessions/:id/complete` | Mark session complete |

### Calendar

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/calendar/google/connect` | Start Google Calendar OAuth |
| `GET` | `/calendar/google/callback` | Google Calendar OAuth callback |
| `GET` | `/calendar/status` | Get calendar connection status |
| `DELETE` | `/calendar/disconnect` | Disconnect calendar |

### Chat

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/chat/token` | Generate Stream Chat token |
| `POST` | `/chat/channel` | Create mentorship chat channel |

### AI

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/ai/mentor-search` | Search and rank mentors using AI |

## Testing

Run all backend tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

The backend currently includes tests for mentorship service behavior and idempotency.

## Docker

Build the image:

```bash
docker build -t mentorconnect-backend .
```

Run the container:

```bash
docker run -p 5000:5000 --env-file .env mentorconnect-backend
```

The Dockerfile runs Prisma generation during build and applies migrations before starting the server.

## Project Structure

```text
backend/
  prisma/
    schema.prisma
    migrations/
  src/
    config/
      db.js
      stream.js
    integrations/
      email/
      google/
    modules/
      ai/
      auth/
      calendar/
      chat/
      mentor/
      mentorship/
      session/
      user/
    shared/
      middleware/
      utils/
  package.json
  dockerfile
```

## Security Notes

- Passwords are stored as hashes, not plain text.
- JWT is stored in HTTP-only cookies.
- CORS is restricted through `CLIENT_URL`.
- Secrets must remain in `.env` and must not be committed.
- Gemini/OpenAI keys must only be used on the backend.
- Stream API secret must only be used on the backend.
- Google OAuth tokens should be handled carefully and rotated if exposed.

## Frontend Repository

Frontend repository:

```text
https://github.com/kshitij-y/m-frontend
```

For a full local setup, run this backend together with the React frontend and set the frontend API URL to:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```
