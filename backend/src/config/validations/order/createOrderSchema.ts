import {z} from "zod";

import { Direction, orderType } from "../../../generated/prisma/enums";

const createOrderSchema=z.object({
    symbol: z.enum(["XAUUSD", "BTCUSD"]),
    direction:z.enum(Direction),
    type:z.enum(orderType),
    quantity:z.number().min(1).max(100000),
    price:z.float32().positive(),
    ttlSeconds:z.number().positive(),
    leverage:z.number().min(1).max(200),
     slPrice:z.number().optional(), slQty:z.number().optional(), tpPrice:z.number().optional(), tpQty:z.number().optional()
});

export default createOrderSchema;