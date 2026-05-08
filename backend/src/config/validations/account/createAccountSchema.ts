import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(3),
  balance: z.coerce.number().nonnegative(),
});