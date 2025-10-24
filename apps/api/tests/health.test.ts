import { vi } from "vitest";

vi.mock("@prisma/client", () => ({
  UserRole: {
    admin: "admin",
    approver: "approver"
  }
}));

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

  return {
    prisma: {
      user,
      passwordResetToken,
      appSettings
    }
  };
});

import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app";

describe("health endpoints", () => {
  it("returns OK for /healthz", async () => {
    const app = createApp();
    const response = await request(app).get("/healthz");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      status: "ok"
    });
  });
});
