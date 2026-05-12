/**
 * Property-based test for attachStreamChannelToMentorshipService — idempotency.
 *
 * **Validates: Requirements 11.3**
 *
 * Property 11: Stream channel attachment is idempotent
 *   For any Mentorship record that already has a non-null streamChannelId,
 *   calling attachStreamChannelToMentorshipService SHALL return the existing
 *   mentorship record without invoking StreamClient.channel().create().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// ---------------------------------------------------------------------------
// Mock Prisma and Stream before importing the service
// ---------------------------------------------------------------------------

const mockChannelCreate = vi.fn();
const mockChannel = vi.fn(() => ({ create: mockChannelCreate }));
const mockUpsertUsers = vi.fn();

vi.mock("../../config/db.js", () => ({
  default: {
    mentorship: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../config/stream.js", () => ({
  default: {
    channel: mockChannel,
    upsertUsers: mockUpsertUsers,
  },
}));

// Import after mocks are registered
const { attachStreamChannelToMentorshipService } = await import(
  "./mentorship.service.js"
);
const prisma = (await import("../../config/db.js")).default;

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** UUID-like string for IDs */
const uuidArb = fc.uuid();

/** Non-empty, non-whitespace string for channel IDs */
const channelIdArb = fc
  .string({ minLength: 1, maxLength: 64 })
  .filter((s) => s.trim().length > 0);

/**
 * Builds a realistic mentorship record that already has a streamChannelId.
 */
const mentorshipWithChannelArb = fc
  .record({
    id: uuidArb,
    streamChannelId: channelIdArb,
    mentorProfileId: uuidArb,
    menteeId: uuidArb,
    status: fc.constantFrom("ACTIVE", "COMPLETED", "CANCELLED"),
    mentorProfile: fc.record({
      user: fc.record({
        id: uuidArb,
        name: fc.string({ minLength: 1, maxLength: 50 }),
        avatar: fc.option(fc.webUrl(), { nil: null }),
      }),
    }),
    mentee: fc.record({
      id: uuidArb,
      name: fc.string({ minLength: 1, maxLength: 50 }),
      avatar: fc.option(fc.webUrl(), { nil: null }),
    }),
    mentorPlan: fc.record({
      id: uuidArb,
      duration: fc.constantFrom("THREE_MONTH", "SIX_MONTH", "TWELVE_MONTH"),
    }),
  })
  .filter((m) => m.streamChannelId !== null && m.streamChannelId !== "");

// ---------------------------------------------------------------------------
// Property 11: Stream channel attachment is idempotent
// Validates: Requirements 11.3
// ---------------------------------------------------------------------------

describe("Property 11: Stream channel attachment is idempotent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "returns the existing mentorship without calling channel().create() when streamChannelId is already set",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          mentorshipWithChannelArb,
          async (existingMentorship) => {
            vi.clearAllMocks();

            // Simulate DB returning a mentorship that already has a streamChannelId
            prisma.mentorship.findUnique.mockResolvedValue(existingMentorship);

            const result = await attachStreamChannelToMentorshipService(
              existingMentorship.id
            );

            // Must return the existing mentorship record
            expect(result).toEqual(existingMentorship);

            // Must NOT call channel().create() — the channel already exists
            expect(mockChannel).not.toHaveBeenCalled();
            expect(mockChannelCreate).not.toHaveBeenCalled();

            // Must NOT call prisma.mentorship.update — no DB write needed
            expect(prisma.mentorship.update).not.toHaveBeenCalled();

            // Must NOT call upsertUsers — no Stream sync needed
            expect(mockUpsertUsers).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
