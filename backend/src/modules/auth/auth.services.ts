import { success } from "zod";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";
prisma;
async function googleCallback(email: string, name: string, googleId: string) {
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        googleId,
        provider: "GOOGLE",
      },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { email },
      data: { googleId, provider: "GOOGLE" },
    });
  }

  return user;
}


type EmailSignUpResult =
  | {
      success: false;
      message: string;
    }
  | {
      success: true;
      user: {
        id: string;
        name: string;
        email: string;
      };
    };
async function emailSignup(
  email: string,
  name: string,
  password: string
):Promise<EmailSignUpResult> {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        provider: "EMAIL",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return {
      success: true,
      user:{
        name:newUser.name,
        email:newUser.email,
        id:newUser.id
      }
    };

  } catch (error: any) {
    if (error.code === "P2002") {
      return {
        success: false,
        message: "User already exists, please login.",
      };
    }

    throw error;
  }
}

type EmailSignInResult =
  | {
      success: false;
      message: string;
    }
  | {
      success: true;
      user: {
        id: string;
        name: string;
        email: string;
      };
    };


export async function emailSignIn(
  email: string,
  password: string
):Promise<EmailSignInResult> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return {
      success: false,
      message: "Invalid credentials.",
    };
  }

  if (user.provider !== "EMAIL") {
    return {
      success: false,
      message: "Please continue with Google login.",
    };
  }

  const isMatch = await bcrypt.compare(
    password,
    user.password || ""
  );

  if (!isMatch) {
    return {
      success: false,
      message: "Invalid credentials.",
    };
  }

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

async function getUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
  return user;
}
const authServices = {
  googleCallback,
  getUser,
  emailSignup,
  emailSignIn
};

export default authServices;
