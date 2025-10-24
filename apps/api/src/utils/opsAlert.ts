import { env } from "@/config";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/utils/email";

const parseRecipients = (raw: string | undefined): string[] => {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

type OpsAlertPayload = {
  subject: string;
  message: string;
};

export const notifyOpsAlert = async ({ subject, message }: OpsAlertPayload) => {
  const recipients = parseRecipients(env.OPS_ALERT_RECIPIENTS);

  if (recipients.length === 0) {
    return;
  }

  try {
    await sendEmail({ to: recipients, subject, textBody: message });
  } catch (error) {
    logger.error({ error }, "Failed to send operations alert email");
  }
};
