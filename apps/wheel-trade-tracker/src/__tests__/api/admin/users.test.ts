import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminSession, mockSession } from "../../helpers/mocks";

const {
  mockGetServerSession,
  mockUserFindMany,
  mockUserUpdate,
  mockUserDelete,
  mockPortfolioGroupBy,
  mockPortfolioDeleteMany,
  mockWatchlistDeleteMany,
  mockJournalDeleteMany,
  mockTransaction,
} = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockUserDelete: vi.fn(),
  mockPortfolioGroupBy: vi.fn(),
  mockPortfolioDeleteMany: vi.fn(),
  mockWatchlistDeleteMany: vi.fn(),
  mockJournalDeleteMany: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/server/auth/auth", () => ({ authOptions: {}, auth: mockGetServerSession }));
vi.mock("@hlf/auth-db", () => ({
  authPrisma: {
    user: {
      findMany: mockUserFindMany,
      update: mockUserUpdate,
      delete: mockUserDelete,
    },
  },
}));
vi.mock("@/server/prisma", () => ({
  prisma: {
    portfolio: {
      groupBy: mockPortfolioGroupBy,
      deleteMany: mockPortfolioDeleteMany,
    },
    watchlistItem: { deleteMany: mockWatchlistDeleteMany },
    journalEntry: { deleteMany: mockJournalDeleteMany },
    $transaction: mockTransaction,
  },
}));
vi.mock("bcrypt", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed") },
  hash: vi.fn().mockResolvedValue("hashed"),
}));

import { GET } from "@/app/api/admin/users/route";
import { PATCH, DELETE } from "@/app/api/admin/users/[id]/route";

function makeReq(body: unknown, method = "PATCH") {
  return new Request("http://localhost/api/admin/users/user-2", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindMany.mockResolvedValue([]);
  mockUserUpdate.mockResolvedValue({ id: "user-2", isAdmin: true });
  mockUserDelete.mockResolvedValue({});
  mockPortfolioGroupBy.mockResolvedValue([]);
  mockTransaction.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// GET /api/admin/users
// ---------------------------------------------------------------------------
describe("GET /api/admin/users", () => {
  it("returns 403 for non-admin", async () => {
    mockGetServerSession.mockResolvedValue(mockSession());
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns users list for admin", async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    mockUserFindMany.mockResolvedValue([{ id: "u1" }]);
    mockPortfolioGroupBy.mockResolvedValue([{ userId: "u1", _count: { _all: 3 } }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as Array<{ id: string; _count: { portfolios: number } }>;
    expect(body).toHaveLength(1);
    expect(body[0]._count.portfolios).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/[id]
// ---------------------------------------------------------------------------
describe("PATCH /api/admin/users/[id]", () => {
  it("returns 403 for non-admin", async () => {
    mockGetServerSession.mockResolvedValue(mockSession());
    const res = await PATCH(makeReq({ isAdmin: true }), { params: Promise.resolve({ id: "user-2" }) });
    expect(res.status).toBe(403);
  });

  it("toggles admin status", async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const res = await PATCH(makeReq({ isAdmin: true }), { params: Promise.resolve({ id: "user-2" }) });
    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledOnce();
  });

  it("returns 400 when admin removes their own admin status", async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const res = await PATCH(makeReq({ isAdmin: false }), { params: Promise.resolve({ id: "admin-1" }) });
    expect(res.status).toBe(400);
  });

  it("resets password", async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const res = await PATCH(makeReq({ password: "newpassword123" }), { params: Promise.resolve({ id: "user-2" }) });
    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledOnce();
  });

  it("returns 400 when new password is too short", async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const res = await PATCH(makeReq({ password: "short" }), { params: Promise.resolve({ id: "user-2" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when no valid operation provided", async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const res = await PATCH(makeReq({}), { params: Promise.resolve({ id: "user-2" }) });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/[id]
// ---------------------------------------------------------------------------
describe("DELETE /api/admin/users/[id]", () => {
  it("returns 403 for non-admin", async () => {
    mockGetServerSession.mockResolvedValue(mockSession());
    const res = await DELETE(makeReq({}, "DELETE"), { params: Promise.resolve({ id: "user-2" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 when admin tries to delete own account", async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const res = await DELETE(makeReq({}, "DELETE"), { params: Promise.resolve({ id: "admin-1" }) });
    expect(res.status).toBe(400);
  });

  it("deletes another user — purges local trees, then auth user", async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const res = await DELETE(makeReq({}, "DELETE"), { params: Promise.resolve({ id: "user-2" }) });
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(mockUserDelete).toHaveBeenCalledWith({ where: { id: "user-2" } });
  });
});
