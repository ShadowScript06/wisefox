import { NextFunction, Request, Response } from "express";

import jwt from "jsonwebtoken";

export function authMiddleware(request: Request, response: Response, next: NextFunction) {
 
  const token = request.cookies.token;

  if (!token) return response.status(401).json({ message: "Unauthorized" });

  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET)
    return response.status(500).json({
      success: false,
      message: "User authentication failed",
    });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === "string") {
      throw new Error("Invalid token");
    }
    request.user = {
      id: decoded.userId as string,
      email: decoded.email as string,
    };
    next();
  } catch {
    return response.status(401).json({ message: "Invalid token" });
  }
}
