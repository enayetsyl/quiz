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

  const sql = (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values });
  const join = (parts: unknown[], separator: unknown) => ({ parts, separator });
  const empty = { strings: [], values: [] };
  class Decimal {
    private readonly value: number;

    constructor(value: string | number) {
      this.value = Number(value);
    }

    valueOf() {
      return this.value;
    }

    toNumber() {
      return this.value;
    }

    toString() {
      return String(this.value);
    }
  }

  return {
    Prisma: { PrismaClientKnownRequestError, sql, join, empty, Decimal },
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
