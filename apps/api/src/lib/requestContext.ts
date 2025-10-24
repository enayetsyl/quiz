import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

import type { NextFunction, Request, Response } from "express";
import type { Logger } from "pino";

import { logger } from "@/lib/logger";

export type RequestContextValue = {
  requestId: string;
  logger: Logger;
};

const requestContext = new AsyncLocalStorage<RequestContextValue>();

export const getRequestContext = () => requestContext.getStore();

export const getRequestLogger = (): Logger => getRequestContext()?.logger ?? logger;

export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const headerValue = req.headers["x-request-id"];
  const requestId = Array.isArray(headerValue)
    ? headerValue[0] ?? randomUUID()
    : headerValue ?? randomUUID();

  const contextLogger = logger.child({ requestId, method: req.method, path: req.originalUrl });

  res.setHeader("x-request-id", requestId);

  requestContext.run({ requestId, logger: contextLogger }, () => {
    contextLogger.info("Incoming request");

    res.on("finish", () => {
      contextLogger.info({ statusCode: res.statusCode }, "Request completed");
    });

    next();
  });
};
