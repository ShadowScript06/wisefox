import express from "express";
import cors from "cors";
const dotenv=require('dotenv');
import cookieParser from "cookie-parser";
import authRouter from "./modules/auth/auth.routes"

dotenv.config();

export const app=express();




app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.json());

app.use('/api/v1/auth',authRouter);


app.get("/health", async (req, res) => {
  res.send("API running");
});
