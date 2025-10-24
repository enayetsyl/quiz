import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

const SETTINGS_ID = 1;

const ensureSettings = async () =>
  prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID }
  });

export const getAppSettings = async () => {
  const settings = await ensureSettings();

  return {
    rpmCap: settings.rpmCap,
    workerConcurrency: settings.workerConcurrency,
    queueProvider: settings.queueProvider,
    rateLimitSafetyFactor: settings.rateLimitSafetyFactor,
    tokenEstimateInitial: settings.tokenEstimateInitial,
    apiTokenConfigured: Boolean(settings.apiBearerTokenHash),
    updatedAt: settings.updatedAt
  };
};

export const updateAppSettings = async (data: {
  rpmCap?: number;
  workerConcurrency?: number;
  queueProvider?: string;
  rateLimitSafetyFactor?: number;
  tokenEstimateInitial?: number;
}) => {
  await ensureSettings();

  const settings = await prisma.appSettings.update({
    where: { id: SETTINGS_ID },
    data: {
      ...(data.rpmCap !== undefined ? { rpmCap: data.rpmCap } : {}),
      ...(data.workerConcurrency !== undefined
        ? { workerConcurrency: data.workerConcurrency }
        : {}),
      ...(data.queueProvider !== undefined ? { queueProvider: data.queueProvider } : {}),
      ...(data.rateLimitSafetyFactor !== undefined
        ? { rateLimitSafetyFactor: data.rateLimitSafetyFactor }
        : {}),
      ...(data.tokenEstimateInitial !== undefined
        ? { tokenEstimateInitial: data.tokenEstimateInitial }
        : {})
    }
  });

  return {
    rpmCap: settings.rpmCap,
    workerConcurrency: settings.workerConcurrency,
    queueProvider: settings.queueProvider,
    rateLimitSafetyFactor: settings.rateLimitSafetyFactor,
    tokenEstimateInitial: settings.tokenEstimateInitial,
    apiTokenConfigured: Boolean(settings.apiBearerTokenHash),
    updatedAt: settings.updatedAt
  };
};

export const rotateApiBearerToken = async () => {
  await ensureSettings();

  const rawToken = randomBytes(48).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await prisma.appSettings.update({
    where: { id: SETTINGS_ID },
    data: {
      apiBearerTokenHash: tokenHash,
      updatedAt: new Date()
    }
  });

  return { token: rawToken };
};
