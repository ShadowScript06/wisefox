import { z } from "zod";

export const emailSignupSchema = z.object({
  name: z.string().min(2, "Name too short").max(50),
  email: z.email("Invalid email"),
  password: z.string()
    .min(8, "Password must be at least 8 chars")
    .max(100)
});