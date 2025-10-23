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
