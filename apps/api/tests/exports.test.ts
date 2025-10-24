import { createHash } from "node:crypto";

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@prisma/client", () => {
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
    Prisma: {
      sql,
      join,
      empty,
      Decimal
    }
  };
});

const queryRawMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: queryRawMock
  }
}));

const createPresignedUrl = vi.hoisted(() => vi.fn(async () => "https://signed.example/test.png"));

vi.mock("@/utils/s3", () => ({
  createPresignedUrl
}));

const getApiBearerTokenHash = vi.hoisted(() => vi.fn<[], Promise<string | null>>());

vi.mock("@/features/settings/settings.service", () => ({
  getApiBearerTokenHash
}));

const envMock = vi.hoisted(() => ({
  INTERNAL_API_BEARER: undefined as string | undefined
}));

vi.mock("@/config", () => ({
  env: envMock
}));

import { getQuestionExportCsv } from "@/features/exports/exports.service";
import { requireInternalBearer } from "@/middlewares/internalBearerAuth";

beforeEach(() => {
  queryRawMock.mockReset();
  createPresignedUrl.mockClear();
  getApiBearerTokenHash.mockReset();
  envMock.INTERNAL_API_BEARER = undefined;
});

describe("exports service", () => {
  it("produces CSV with expected headers and values", async () => {
    const createdAt = new Date("2024-01-01T00:00:00.000Z");
    queryRawMock.mockResolvedValueOnce([
      {
        question_id: "q-1",
        class: 6,
        subject: "Mathematics",
        chapter: "Algebra",
        page: 3,
        language: "en",
        difficulty: "easy",
        stem: "What is 2+2?",
        option_a: "3",
        option_b: "4",
        option_c: "5",
        option_d: "6",
        correct_option: "b",
        explanation: "Because 2+2=4",
        status: "approved",
        created_at: createdAt,
        source_page_image_url: "s3://bucket/path.png"
      }
    ]);

    const csv = await getQuestionExportCsv({});

    expect(createPresignedUrl).toHaveBeenCalledWith({ bucket: "bucket", key: "path.png" });
    expect(csv.split("\n")[0]).toBe(
      "question_id,class,subject,chapter,page,language,difficulty,stem,option_a,option_b,option_c,option_d,correct_option,explanation,status,created_at,source_page_image_url"
    );
    expect(csv).toContain("q-1,6,Mathematics,Algebra,3,en,easy,What is 2+2?,3,4,5,6,b,Because 2+2=4,approved,2024-01-01T00:00:00.000Z,https://signed.example/test.png");
  });
});

describe("internal bearer auth", () => {
  const createRequest = (authorization?: string) => ({
    headers: authorization ? { authorization } : {}
  });

  const response = {} as Parameters<typeof requireInternalBearer>[1];

  it("rejects missing headers", async () => {
    const next = vi.fn();

    await requireInternalBearer(createRequest() as never, response, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    const error = next.mock.calls[0][0] as Error;
    expect(error.message).toBe("Authorization header missing");
  });

  it("accepts valid hashed token", async () => {
    const token = "super-secret";
    const hash = createHash("sha256").update(token).digest("hex");
    getApiBearerTokenHash.mockResolvedValueOnce(hash);
    const next = vi.fn();

    await requireInternalBearer(createRequest(`Bearer ${token}`) as never, response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("accepts env fallback token", async () => {
    envMock.INTERNAL_API_BEARER = "fallback";
    getApiBearerTokenHash.mockResolvedValueOnce(null);
    const next = vi.fn();

    await requireInternalBearer(createRequest("Bearer fallback") as never, response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("rejects invalid token", async () => {
    const token = "wrong";
    getApiBearerTokenHash.mockResolvedValueOnce(createHash("sha256").update("right").digest("hex"));
    const next = vi.fn();

    await requireInternalBearer(createRequest(`Bearer ${token}`) as never, response, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    const error = next.mock.calls[0][0] as Error;
    expect(error.message).toBe("Invalid credentials");
  });
});
