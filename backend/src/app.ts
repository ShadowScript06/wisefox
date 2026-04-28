import express from "express";
import cors from "cors";
const dotenv=require('dotenv');
import cookieParser from "cookie-parser";
import authRouter from "./modules/auth/auth.routes"
import accountRouter from "./modules/account/account.routes";
import orderRouter from "./modules/order/order.routes"
import { authMiddleware } from "./middlewares/auth";

import positionsController from "./modules/position/position.controllers";
dotenv.config();

import sltpRoutes from './modules/sltp/sltp.routes'




export const app=express();




app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.json());

app.use('/api/v1/auth',authRouter);
app.use(authMiddleware);
app.use('/api/v1/accounts',accountRouter);
app.use('/api/v1/accounts/:accountId/orders',orderRouter);
app.use('/api/v1/accounts/:accountId/positions',positionsController.getPositions);
app.use('/api/v1/accounts/:accountId/positions/:positionId/sltp', sltpRoutes)

app.get("/health", async (req, res) => {
  res.send("API running");
});
