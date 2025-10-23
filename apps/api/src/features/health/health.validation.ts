import { z } from "zod";

export const healthCheckSchema = z.object({
  query: z.object({
    details: z
      .string()
      .optional()
      .transform((value) =>
        value === undefined ? undefined : value === "true" || value === "1"
      )
  }),
  params: z.object({}),
  body: z.object({})
});
