import { z } from "zod";

export const healthCheckSchema = z.object({
  query: z.object({
    details: z
      .union([z.string(), z.boolean()])
      .optional()
      .transform((value) => {
        if (typeof value === "boolean") {
          return value;
        }

        if (typeof value === "string") {
          return value === "true" || value === "1";
        }

        return undefined;
      })
  }),
  params: z.object({}),
  body: z.object({})
});
