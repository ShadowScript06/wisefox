import z from "zod";
import { AlertType } from "../../../generated/prisma/enums";

const createAlertSchema=z.object({
    name:z.string(),
    price:z.float32().positive(),
    symbol: z.enum(["XAUUSD", "BTCUSD"]),
    type:z.enum(AlertType)
});

export default createAlertSchema;