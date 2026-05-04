import { Request, Response } from "express";
import accountServices from "./account.services";
import { success } from "zod";
import { incrementUsage } from "../../middlewares/incrementUsage";

async function createAccount(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const { name, balance } = request.body;
    const userId = (request.user as any).id;

    const account = await accountServices.createAccount(name, balance, userId);

    await incrementUsage(userId,"ACCOUNT");

    response.status(201).json({
      success: true,
      message: "Account Created.",
      data: account,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
}

async function getAllAccounts(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const userId = (request.user as any).id;

    const accounts = await accountServices.getAllAccounts(userId);

    if (accounts.length <= 0) {
      response.status(200).json({
        success: false,
        message: "No Account Found.",
      });
      return;
    }

    response.status(200).json({
      success: true,
      message: "Accounts Fetched.",
      data: accounts,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
}

async function getAccountById(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const userId = (request.user as any).id;

    const accountId = (request.params as any).id;

    const account = await accountServices.getAccountById(userId, accountId);

    if (!account) {
      response.status(404).json({
        success: false,
        message: "No Account Found.",
      });
      return;
    }

    response.status(200).json({
      success: true,
      message: "Account Fetched.",
      data: account,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
}

async function deleteAccount(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const userId = (request.user as any).id;

    const accountId = (request.params as any).id;

    const account = await accountServices.deleteAccount(userId, accountId);

    if (!account) {
      response.status(404).json({
        success: false,
        message: "No Account Found.",
      });
      return;
    }

    response.status(200).json({
      success: true,
      message: "Account Deleted.",
      data: account,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
}

 async function getAccountOverview(request: Request, response: Response): Promise<void> {
  try {
     const accountId = (request.params as any).id;

    if (!accountId) {
      response.status(400).json({
        success: false,
        message: "accountId required",
      })
      return
    }

    const overview = await accountServices.getAccountOverview(accountId)


    // empty fallback (important for frontend stability)
    if (!overview || !overview.heatmap.data.length) {
      response.status(200).json({
        success: true,
        message: "No data found",
        data: {
          summary: {
            totalTrades: 0,
            totalPnl: 0,
            totalCharges: 0,
            winRate: 0,
            profitableTrades: 0,
            losingTrades: 0,
          },
          heatmap: {
            startDate: null,
            endDate: null,
            data: [],
          },
        },
      })
      return
    }

    response.status(200).json({
      success: true,
      message: "Account overview fetched successfully",
      data: overview,
    })
  } catch (error) {
    console.error(error)

    response.status(500).json({
      success: false,
      message: "Internal Server Error",
    })
  }
}

 const generateAiFeedback = async (request:Request, response:Response) => {
  try {
    const accountId = (request.params as any).id;

    if (!accountId) {
      return response.status(400).json({
        success:false,
        message: "accountId is required",
      });
    }

    const feedback = await accountServices.generateAiFeedbackForAccount(accountId);

    return response.status(200).json({
        success:true,
      message: "AI feedback generated successfully",
      data: feedback,
    });
  } catch (err) {
    return response.status(500).json({
        success:false,
      message: "Internal Server Error.",
    });
  }
};


const getAiFeedback= async (request:Request, response:Response) => {
  try {
    const accountId  = (request.params as any).id;

    
    if (!accountId) {
      return response.status(400).json({
        success:false,
        message: "accountId is required",
      });
    }

    const feedback = await accountServices.getAiFeedback(accountId);

    if (!feedback) {
      return response.status(200).json({
        success:false,
        message: "No AI feedback found",
        data: null,
      });
    }

    return response.status(200).json({
        success:true,
      message: "AI feedback fetched successfully",
      data: feedback,
    });
  } catch (err) {
    return response.status(500).json({
      message: "Failed to fetch AI feedback",
    });
  }
};

const accountController = {
  createAccount,
  getAccountById,
  getAllAccounts,
  deleteAccount,
  getAccountOverview,
  generateAiFeedback,
  getAiFeedback

};

export default accountController;
