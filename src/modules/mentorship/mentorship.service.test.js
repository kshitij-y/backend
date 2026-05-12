/**
 * Property-based tests for createMentorshipService — duplicate booking prevention.
 *
 * Validates: Requirements 10.1, 10.2, 10.3
 *
 * These tests exercise the duplicate-booking guard in isolation by mocking the
 * Prisma client. The properties under test are:
 *
 *   Property 9: Duplicate active mentorship is rejected
 *     For any mentor–mentee pair that already has a Mentorship record with
 *     status === "ACTIVE", calling createMentorshipService SHALL throw an error
 *     with status code 400.
 *
 *   Property 10: Completed or cancelled mentorship allows re-creation
 *     For any mentor–mentee pair whose existing Mentorship record has status of
 *     "COMPLETED" or "CANCELLED", calling createMentorshipService SHALL succeed
 *     and create a new Mentorship record.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// ---------------------------------------------------------------------------
// Mock Prisma and Stream before importing the service
// ---------------------------------------------------------------------------

vi.mock("../../config/db.js", () => ({
  default: {
    user: { findUnique: vi.fn() },
    mentorProfile: { findUnique: vi.fn() },
    mentorPlan: { findUnique: vi.fn() },
    mentorship: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("../../config/stream.js", () => ({
  default: {},
}));

// Import after mocks are registered
const { createMentorshipService } = await import("./mentorship.service.js");
const prisma = (await import("../../config/db.js")).default;

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates a non-empty UUID-like string (simplified for test purposes).
 * Uses fc.uuid() which produces valid UUID v4 strings.
 */
const uuidArb = fc.uuid();

/**
 * Generates a valid plan duration string.
 */
const durationArb = fc.constantFrom("THREE_MONTH", "SIX_MONTH", "TWELVE_MONTH");

/**
 * Generates a non-ACTIVE mentorship status (COMPLETED or CANCELLED).
 */
const nonActiveStatusArb = fc.constantFrom("COMPLETED", "CANCELLED");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sets up the standard Prisma mock chain for a successful pre-duplicate-check
 * flow: valid mentor user, valid mentor profile, valid plan.
 *
 * @param {string} mentorId
 * @param {string} mentorProfileId
 * @param {string} planId
 * @param {string} duration
 */
function setupValidPreChecks(mentorId, mentorProfileId, planId, duration) {
  prisma.user.findUnique.mockResolvedValue({ id: mentorId, role: "MENTOR" });
  prisma.mentorProfile.findUnique.mockResolvedValue({ id: mentorProfileId });
  prisma.mentorPlan.findUnique.mockResolvedValue({
    id: planId,
    mentorProfileId,
    duration,
  });
}

// ---------------------------------------------------------------------------
// Property 9: Duplicate active mentorship is rejected
// Validates: Requirements 10.1, 10.2
// ---------------------------------------------------------------------------

describe("Property 9: Duplicate active mentorship is rejected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "throws 400 for any mentor–mentee pair that already has an ACTIVE mentorship",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb, // menteeId
          uuidArb, // mentorId
          uuidArb, // mentorProfileId
          uuidArb, // planId
          durationArb,
          async (menteeId, mentorId, mentorProfileId, planId, duration) => {
            // Ensure menteeId !== mentorId (service rejects self-mentorship)
            fc.pre(menteeId !== mentorId);

            vi.clearAllMocks();

            // Set up valid pre-checks
            setupValidPreChecks(mentorId, mentorProfileId, planId, duration);

            // Simulate an existing ACTIVE mentorship
            prisma.mentorship.findFirst.mockResolvedValue({
              id: "existing-id",
              mentorProfileId,
              menteeId,
              status: "ACTIVE",
            });

            // The service must throw with statusCode 400
            await expect(
              createMentorshipService(menteeId, mentorId, planId)
            ).rejects.toMatchObject({
              statusCode: 400,
            });

            // Verify findFirst was called with the correct fields (Req 10.1)
            expect(prisma.mentorship.findFirst).toHaveBeenCalledWith(
              expect.objectContaining({
                where: expect.objectContaining({
                  mentorProfileId,
                  menteeId,
                  status: "ACTIVE",
                }),
              })
            );

            // Verify create was NOT called (no new mentorship created)
            expect(prisma.mentorship.create).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 10: Completed or cancelled mentorship allows re-creation
// Validates: Requirement 10.3
// ---------------------------------------------------------------------------

describe("Property 10: Completed or cancelled mentorship allows re-creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "succeeds when the existing mentorship has status COMPLETED or CANCELLED",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb, // menteeId
          uuidArb, // mentorId
          uuidArb, // mentorProfileId
          uuidArb, // planId
          durationArb,
          nonActiveStatusArb, // prior mentorship status
          async (menteeId, mentorId, mentorProfileId, planId, duration, priorStatus) => {
            // Ensure menteeId !== mentorId
            fc.pre(menteeId !== mentorId);

            vi.clearAllMocks();

            // Set up valid pre-checks
            setupValidPreChecks(mentorId, mentorProfileId, planId, duration);

            // No ACTIVE mentorship exists (prior one is COMPLETED or CANCELLED)
            // The service queries specifically for status: "ACTIVE", so returning null
            // here correctly simulates the case where only non-ACTIVE records exist.
            prisma.mentorship.findFirst.mockResolvedValue(null);

            // Simulate successful creation
            const createdMentorship = {
              id: "new-mentorship-id",
              mentorProfileId,
              menteeId,
              mentorPlanId: planId,
              status: "ACTIVE",
              mentorProfile: { user: { id: mentorId, name: "Mentor", avatar: null } },
              mentorPlan: { id: planId, duration },
            };
            prisma.mentorship.create.mockResolvedValue(createdMentorship);

            // The service must succeed (not throw)
            const result = await createMentorshipService(menteeId, mentorId, planId);

            // Verify a new mentorship was created
            expect(prisma.mentorship.create).toHaveBeenCalledOnce();
            expect(result).toEqual(createdMentorship);

            // Verify the duplicate check was performed with status: "ACTIVE" only
            // (not COMPLETED or CANCELLED) — confirming Req 10.3 semantics
            expect(prisma.mentorship.findFirst).toHaveBeenCalledWith(
              expect.objectContaining({
                where: expect.objectContaining({
                  status: "ACTIVE",
                }),
              })
            );
          }
        ),
        { numRuns: 50 }
      );
    }
  );
});
