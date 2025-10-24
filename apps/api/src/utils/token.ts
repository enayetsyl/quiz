import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/config";

const encoder = new TextEncoder();

const base64UrlEncode = (value: string) =>
  Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

const base64UrlDecode = (value: string) => {
  const padLength = (4 - (value.length % 4)) % 4;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength);
  return Buffer.from(padded, "base64").toString();
};

type TokenPayload = {
  userId: string;
  role: string;
  exp: number;
};

const sign = (data: string) =>
  createHmac("sha256", encoder.encode(env.AUTH_TOKEN_SECRET))
    .update(data)
    .digest("base64url");

export const createAuthToken = (payload: Omit<TokenPayload, "exp">) => {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + env.AUTH_TOKEN_TTL_MINUTES * 60;
  const tokenPayload: TokenPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(data);

  return `${data}.${signature}`;
};

export const verifyAuthToken = (token: string) => {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments;
  const data = `${headerSegment}.${payloadSegment}`;
  const expectedSignature = sign(data);
  const signatureBuffer = Buffer.from(signatureSegment);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadSegment)) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
      return null;
    }
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
};
