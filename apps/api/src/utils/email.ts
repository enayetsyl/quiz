import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

import { env } from "@/config";

const sesClient = new SESClient({ region: env.AWS_REGION });

type EmailPayload = {
  to: string | string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
};

export const sendEmail = async ({ to, subject, htmlBody, textBody }: EmailPayload) => {
  if (!env.SES_FROM) {
    throw new Error("SES_FROM is not configured");
  }

  const recipients = Array.isArray(to) ? to : [to];

  const command = new SendEmailCommand({
    Source: env.SES_FROM,
    Destination: {
      ToAddresses: recipients
    },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Html: htmlBody ? { Data: htmlBody, Charset: "UTF-8" } : undefined,
        Text: textBody ? { Data: textBody, Charset: "UTF-8" } : undefined
      }
    }
  });

  await sesClient.send(command);
};

export { sesClient };

