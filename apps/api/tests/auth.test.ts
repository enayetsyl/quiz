import { vi } from "vitest";

vi.mock("@prisma/client", () => {
  class PrismaClientKnownRequestError extends Error {
    public readonly code: string;
    public readonly clientVersion: string;
    public readonly meta?: Record<string, unknown>;

    constructor(
      message: string,
      options: { code: string; clientVersion: string; meta?: Record<string, unknown> }
    ) {
      super(message);
      this.code = options.code;
      this.clientVersion = options.clientVersion;
      this.meta = options.meta;
      Object.setPrototypeOf(this, PrismaClientKnownRequestError.prototype);
    }
  }

  return {
    Prisma: { PrismaClientKnownRequestError },
    UserRole: {
      admin: "admin",
      approver: "approver"
    }
  };
});

vi.mock("../src/lib/prisma", () => {
  const user = {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn()
  };
  const passwordResetToken = {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn()
  };
  const appSettings = {
    upsert: vi.fn(),
    update: vi.fn()
  };
  const classLevel = {
    findMany: vi.fn(),
    upsert: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
  const subject = {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
  const chapter = {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };

  return {
    prisma: {
      user,
      passwordResetToken,
      appSettings,
      classLevel,
      subject,
      chapter,
      $transaction: vi.fn(async () => undefined)
    }
  };
});

import request from "supertest";
import { describe, expect, it, afterEach } from "vitest";

import { createApp } from "../src/app";
import { env } from "../src/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/utils/password";
import { createAuthToken } from "../src/utils/token";

type TestUserRole = "admin" | "approver";

type TestUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: TestUserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  [key: string]: unknown;
};

describe("authentication routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("signs in an active user with valid credentials", async () => {
    const passwordHash = await hashPassword("secret1234");
    const baseUser: TestUser = {
      id: "user-1",
      email: "admin@example.com",
      passwordHash,
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      resetTokens: [],
      uploads: [],
      questionsCreated: [],
      questionsReviewed: [],
      questionBankAdded: [],
      apiTokens: []
    };

    vi.spyOn(prisma.user, "findUnique").mockImplementation(async (args) => {
      if ("where" in args && "email" in args.where && args.where.email) {
        return { ...baseUser };
      }

      if ("where" in args && "id" in args.where && args.where.id) {
        return { ...baseUser };
      }

      return null;
    });

    vi.spyOn(prisma.user, "update").mockImplementation(async () => ({
      ...baseUser,
      lastLoginAt: new Date()
    }));

    const response = await request(createApp())
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "secret1234" });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.headers["set-cookie"])).toBe(true);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe("admin@example.com");
    expect(response.body.data.role).toBe("admin");
  });

  it("rejects invalid credentials", async () => {
    const passwordHash = await hashPassword("anotherSecret");
    const baseUser: TestUser = {
      id: "user-2",
      email: "approver@example.com",
      passwordHash,
      role: "approver",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      resetTokens: [],
      uploads: [],
      questionsCreated: [],
      questionsReviewed: [],
      questionBankAdded: [],
      apiTokens: []
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(baseUser);

    const response = await request(createApp())
      .post("/api/auth/login")
      .send({ email: "approver@example.com", password: "wrong-password" });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("prevents non-admin users from accessing user management", async () => {
    const token = createAuthToken({ userId: "user-3", role: "approver" });
    const baseUser: TestUser = {
      id: "user-3",
      email: "approver@example.com",
      passwordHash: await hashPassword("tempPass123"),
      role: "approver",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      resetTokens: [],
      uploads: [],
      questionsCreated: [],
      questionsReviewed: [],
      questionBankAdded: [],
      apiTokens: []
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(baseUser);

    const response = await request(createApp())
      .get("/api/users")
      .set("Cookie", [`${env.AUTH_COOKIE_NAME}=${token}`]);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
