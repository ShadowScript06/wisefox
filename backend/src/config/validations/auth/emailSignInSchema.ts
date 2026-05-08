import { z } from "zod";

export const emailSignInSchema = z.object({
  email: z.email("Invalid email"),
  password: z.string()
    .min(8, "Password must be at least 8 chars")
    .max(100)
});