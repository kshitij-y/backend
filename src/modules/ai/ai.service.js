import OpenAI from "openai";
import prisma from "../../config/db.js";

const getAiClient = () => {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    return {
      client: new OpenAI({
        apiKey: geminiKey,
        baseURL:
          "https://generativelanguage.googleapis.com/v1beta/openai/",
      }),
      model:
        process.env.GEMINI_MODEL || "gemini-1.5-flash",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "Missing GEMINI_API_KEY or OPENAI_API_KEY"
    );
    error.statusCode = 500;
    throw error;
  }

  return {
    client: new OpenAI({ apiKey }),
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  };
};

const truncateText = (value, max = 280) => {
  if (!value) {
    return "";
  }

  const text = value.trim();
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 1)}…`;
};

const buildCandidateMentors = (mentors) => {
  return mentors.map((mentor) => {
    const profile = mentor.mentorProfile;
    const plans = (profile?.mentorPlans || [])
      .filter((plan) => plan.isActive)
      .map((plan) => ({
        duration: plan.duration,
        title: plan.title || "",
        price: plan.price,
      }));

    return {
      mentorId: mentor.id,
      name: mentor.name,
      bio: truncateText(
        profile?.about || mentor.bio || ""
      ),
      headline: profile?.headline || "",
      expertise: (profile?.expertise || []).map(
        (item) => item.name
      ),
      plans,
      pricing: plans.map((plan) => plan.price),
      experience: profile?.experienceYears ?? null,
    };
  });
};

const parseAiResponse = (content) => {
  if (!content) {
    return null;
  }

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");

  if (start === -1 || end === -1) {
    return null;
  }

  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
};

export const mentorSearchService = async (prompt) => {
  const mentors = await prisma.user.findMany({
    where: {
      role: "MENTOR",
      isDeleted: false,
      mentorProfile: {
        isAvailable: true,
        profileCompleted: true,
        isDeleted: false,
        expertise: {
          some: {},
        },
        mentorPlans: {
          some: {
            isActive: true,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      mentorProfile: {
        select: {
          headline: true,
          about: true,
          experienceYears: true,
          expertise: {
            select: {
              expertise: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          mentorPlans: {
            select: {
              id: true,
              duration: true,
              title: true,
              description: true,
              price: true,
              isActive: true,
            },
          },
        },
      },
    },
    take: 80,
  });

  const normalizedMentors = mentors.map((mentor) => ({
    ...mentor,
    mentorProfile: mentor.mentorProfile
      ? {
          ...mentor.mentorProfile,
          expertise: mentor.mentorProfile.expertise.map(
            (item) => item.expertise
          ),
        }
      : null,
  }));

  if (!normalizedMentors.length) {
    return { mentors: [] };
  }

  const candidates = buildCandidateMentors(
    normalizedMentors
  );

  const { client, model } = getAiClient();

  const response = await client.chat.completions.create(
    {
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You rank mentors for a mentee request. Return ONLY JSON with matchedMentorIds (array of mentorId strings) and optional matchReasons (object mentorId -> short reason, max 12 words). Use only provided mentorId values.",
        },
        {
          role: "user",
          content: JSON.stringify({
            prompt,
            mentors: candidates,
          }),
        },
      ],
    }
  );

  const content =
    response?.choices?.[0]?.message?.content ||
    "";
  const parsed = parseAiResponse(content) || {};

  const requestedIds = Array.isArray(
    parsed.matchedMentorIds
  )
    ? parsed.matchedMentorIds
    : [];

  const idSet = new Set(
    candidates.map((mentor) => mentor.mentorId)
  );

  const filteredIds = requestedIds.filter(
    (id) => idSet.has(id)
  );

  const fallbackIds = candidates
    .slice(0, 6)
    .map((mentor) => mentor.mentorId);

  const finalIds =
    filteredIds.length > 0
      ? filteredIds
      : fallbackIds;

  const reasons =
    parsed.matchReasons &&
    typeof parsed.matchReasons === "object"
      ? parsed.matchReasons
      : {};

  const rankedMentors = finalIds
    .map((id) => {
      const mentor = normalizedMentors.find(
        (item) => item.id === id
      );

      if (!mentor) {
        return null;
      }

      return {
        ...mentor,
        matchReason:
          typeof reasons[id] === "string"
            ? reasons[id]
            : undefined,
      };
    })
    .filter(Boolean);

  return {
    mentors: rankedMentors,
  };
};
