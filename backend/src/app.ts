import express from "express";
import cors from "cors";
const dotenv=require('dotenv');


dotenv.config();

export const app=express();


app.use(cors());
app.use(express.json());


app.get("/health", async (req, res) => {
  res.send("API running");
});
