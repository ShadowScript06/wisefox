import { Request, Response } from "express";
import { oAuthClient } from "../../lib/oAuth";
import authServices from "./auth.services";
oAuthClient;
import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";


const JWT_SECRET = process.env.JWT_SECRET;

async function startGoogleLogin(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const url = oAuthClient.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["openid", "email", "profile"],
    });

    response.redirect(url);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      sucesss: false,
      message: "Internal Server Error.",
    });
  }
}

async function googleCallback(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const code = (request.query as any).code;
    const { tokens } = await oAuthClient.getToken(code);
    oAuthClient.setCredentials(tokens);

    if (!tokens.id_token) {
      throw new Error("No Google token Found");
    }
    const ticket = await oAuthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error("No Google User found");
    }

    if (!payload.email || !payload.name || !payload.sub) {
      throw new Error("Invalid Google data");
    }
    const email = payload.email;
    const name = payload.name;
    const googleId = payload.sub;

    const user = await authServices.googleCallback(email, name, googleId);

    if (!JWT_SECRET) {
      throw new Error("No JWT_SECRET provided");
    }
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    response.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    response.redirect("http://localhost:5173/authsuccess");
  } catch (error) {
    console.log(error);
    response.status(500).json({
      sucesss: false,
      message: "Internal Server Error.",
    });
  }
}

const getUser = async (request: Request, response: Response): Promise<void> => {
  try {
    const userId = (request.user as any).id;

    if (!userId) {
      throw new Error("Invalid access.");
    }
    const user = await authServices.getUser(userId);

    if (!user) {
      response.status(404).json({
        sucesss: false,
        message: "User Not found.",
      });
    }

    response.status(200).json({
      success: true,
      message: "User Fetched.",
      data: user,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      sucesss: false,
      message: "Internal Server Error.",
    });
  }
};

const emailSignUp = async (
  request: Request,
  response: Response,
): Promise<void> => {
  try {
    const { email, name, password } = request.body;

    const user = await authServices.emailSignup(email, name, password);

    if (!user.success) {
      response.status(409).json({
        success: false,
        message: user.message,
      });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.user.id,
        email: user.user.email,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    response.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });


    response.status(201).json({
      success: true,
      message: "User Signed Up.",
      user: user.user,
    });



    return;
  } catch (error) {
    console.error(error);

    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
    return;
  }
};

const emailSignIn = async (
  request: Request,
  response: Response,
): Promise<void> => {
  try {
    const { email, password } = request.body;

    const result = await authServices.emailSignIn(email, password);

    if (!result.success) {
      response.status(401).json({
        success: false,
        message: result.message,
      });
      return;
    }

    const token = jwt.sign(
      {
        userId: result.user.id,
        email: result.user.email,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    response.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    response.status(200).json({
      success: true,
      message: "Signed in successfully.",
      user: result.user,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      sucesss: false,
      message: "Internal Server Error.",
    });
  }
};

const logout = async (request: Request, response: Response): Promise<void> => {
  try {
    response.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    response.status(200).json({
      success: true,
      message: "Logged out",
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      sucesss: false,
      message: "Internal Server Error.",
    });
  }
};


export const authController = {
  startGoogleLogin,
  googleCallback,
  getUser,
  logout,
  emailSignUp,
  emailSignIn,
};
