import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/config";

const s3Client = new S3Client({
  region: env.AWS_REGION
});

export const uploadToS3 = async ({
  bucket,
  key,
  body,
  contentType
}: {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
}) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  });

  await s3Client.send(command);
};

export const createPresignedUrl = async ({
  bucket,
  key,
  expiresIn = env.S3_SIGN_TTL_SEC
}: {
  bucket: string;
  key: string;
  expiresIn?: number;
}) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};

export { s3Client };

