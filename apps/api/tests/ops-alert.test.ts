import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.hoisted(() => vi.fn());
const loggerError = vi.hoisted(() => vi.fn());

vi.mock("../src/utils/email", () => ({
  sendEmail,
}));

vi.mock("../src/lib/logger", () => ({
  logger: {
    error: loggerError,
  },
}));

const envMock = vi.hoisted(() => ({
  OPS_ALERT_RECIPIENTS: "ops@example.com, second@example.com",
}));

vi.mock("../src/config", () => ({
  env: envMock,
}));

import { notifyOpsAlert } from "../src/utils/opsAlert";

describe("notifyOpsAlert", () => {
  beforeEach(() => {
    sendEmail.mockReset();
    loggerError.mockReset();
    envMock.OPS_ALERT_RECIPIENTS = "ops@example.com";
  });

  it("sends email when recipients are configured", async () => {
    await notifyOpsAlert({ subject: "Alert", message: "Something happened" });

    expect(sendEmail).toHaveBeenCalledWith({
      to: ["ops@example.com"],
      subject: "Alert",
      textBody: "Something happened",
    });
  });

  it("skips sending when no recipients are defined", async () => {
    envMock.OPS_ALERT_RECIPIENTS = "  ";

    await notifyOpsAlert({ subject: "Alert", message: "No recipients" });

    expect(sendEmail).not.toHaveBeenCalled();
  });
});
