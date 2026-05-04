
import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";
prisma;







async function googleCallback(email: string, name: string, googleId: string) {
  const user = await prisma.$transaction(async (tx) => {
    let existing = await tx.user.findUnique({
      where: { email },
    });

    if (!existing) {
      existing = await tx.user.create({
        data: {
          email,
          name,
          googleId,
          provider: "GOOGLE",
        },
      });

      const plan = await tx.plan.findFirst({
        where: { name: "BASIC" },
      });

      if (!plan) {
        throw new Error("Plan not found");
      }

      await tx.subscription.create({
        data: {
          userId: existing.id,
          planId: plan.id,
          status: "ACTIVE",
          startDate: new Date(),
          endDate: new Date("2099-12-31"),
        },
      });
    }

    return existing;
  });

  return user; // ✅ REQUIRED
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




export async function emailSignup(
  email: string,
  name: string,
  password: string
): Promise<EmailSignUpResult> {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. create user
      const user = await tx.user.create({
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

      // 2. fetch BASIC plan
      const plan = await tx.plan.findFirst({
        where: { name: "BASIC" },
      });

      if (!plan) {
        throw new Error("BASIC plan not found");
      }

      // 3. create subscription
      await tx.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: "ACTIVE",
          startDate: new Date(),
          endDate: new Date("2099-12-31"),
        },
      });

      return user;
    });

    return {
      success: true,
      user: result,
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
