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
      classLevel,
      subject,
      chapter,
      $transaction: vi.fn(async (operations: unknown[]) => {
        for (const operation of operations) {
          if (operation instanceof Promise) {
            await operation;
          }
        }
      })
    }
  };
});

import request from "supertest";
import { describe, expect, it, afterEach } from "vitest";

import { createApp } from "../src/app";
import { env } from "../src/config";
import { prisma } from "../src/lib/prisma";
import { createAuthToken } from "../src/utils/token";
import { Prisma } from "@prisma/client";

type TestUserRole = "admin" | "approver";

type TestUser = {
  id: string;
  email: string;
  role: TestUserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

describe("taxonomy routes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const buildUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    id: "user-1",
    email: "admin@example.com",
    role: "admin",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    ...overrides
  });

  it("prevents non-admin users from accessing taxonomy routes", async () => {
    const approver = buildUser({ id: "approver-1", role: "approver", email: "approver@example.com" });
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(approver);

    const token = createAuthToken({ userId: approver.id, role: approver.role });

    const response = await request(createApp())
      .get("/api/taxonomy")
      .set("Cookie", [`${env.AUTH_COOKIE_NAME}=${token}`]);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("returns class levels with subjects and chapters for admin", async () => {
    const admin = buildUser();
    vi.spyOn(prisma.user, "findUnique").mockImplementation(async (args) => {
      if ("where" in args && "id" in args.where && args.where.id === admin.id) {
        return admin;
      }

      return null;
    });

    const now = new Date();
    const subjectId = '11111111-1111-4111-8111-111111111111';
    const chapterId = '22222222-2222-4222-8222-222222222222';
    vi.spyOn(prisma.classLevel, "findMany").mockResolvedValue([
      {
        id: 6,
        displayName: "Class 6",
        subjects: [
          {
            id: subjectId,
            classId: 6,
            name: "Mathematics",
            code: "MA",
            createdAt: now,
            updatedAt: now,
            chapters: [
              {
                id: chapterId,
                subjectId,
                name: "Numbers",
                ordinal: 1,
                createdAt: now,
                updatedAt: now
              }
            ]
          }
        ]
      }
    ]);

    const token = createAuthToken({ userId: admin.id, role: admin.role });
    const response = await request(createApp())
      .get("/api/taxonomy")
      .set("Cookie", [`${env.AUTH_COOKIE_NAME}=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.classes).toHaveLength(1);
    expect(response.body.data.classes[0].subjects[0].chapters[0]).toMatchObject({
      id: chapterId,
      ordinal: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });
  });

  it("rejects subject creation with invalid code", async () => {
    const admin = buildUser();
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(admin);

    const token = createAuthToken({ userId: admin.id, role: admin.role });

    const response = await request(createApp())
      .post("/api/taxonomy/subjects")
      .set("Cookie", [`${env.AUTH_COOKIE_NAME}=${token}`])
      .send({ classId: 6, name: "Mathematics", code: "abc" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("converts unique constraint errors into readable chapter messages", async () => {
    const admin = buildUser();
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(admin);

    const uniqueError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "1.0.0" }
    );
    vi.spyOn(prisma.chapter, "create").mockImplementation(async () => {
      throw uniqueError;
    });

    const token = createAuthToken({ userId: admin.id, role: admin.role });
    const response = await request(createApp())
      .post("/api/taxonomy/chapters")
      .set("Cookie", [`${env.AUTH_COOKIE_NAME}=${token}`])
      .send({
        subjectId: "11111111-1111-4111-8111-111111111111",
        name: "Numbers",
        ordinal: 1
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("ordinal");
  });
});
