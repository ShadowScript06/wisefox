import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: any) =>
  (request: Request, response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      return response.status(400).json({
        success: false,
        message: "Invalid input",
      });
    }

    next();
  };