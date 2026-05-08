import { z } from "zod";

export const createJournalSchema = z.object({
  script:z.string(),

  date: z.coerce.date(),

  entryTime: z.coerce.date(),
  exitTime: z.coerce.date().optional(),

  pnl: z.number().optional(),

  quantity: z.number().positive().optional(),

  entryReason: z.string().min(1),
  exitReason: z.string().optional(),
});