import { Request, Response } from "express";
import { success } from "zod";
import positionServices from "./position.service";
import pnlServices from "../pnl/pnl.services";
import { prisma } from "../../lib/prisma";
import { calcMarginLevel } from "../../utils/margin.utils";

async function getPositions(request: Request, response: Response) {
  try {
    const { accountId } = request.params as any;
    const positions = await positionServices.getPositions(accountId);

    response.status(200).json({
      success: true,
      data: positions,
      message: "Positions Fetched.",
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
}

const getTradeHistory = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params as { accountId: string };

    const page = Number(req.query.page) || 1;
    const limit = 10; // fixed
    const skip = (page - 1) * limit;

    const trades = await positionServices.getTradeHistory(accountId, skip, limit);
    const total = await positionServices.countTrades(accountId);

    return res.status(200).json({
      success: true,
      data: trades,
      message: "Trades Fetched.",
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};

const getPnlSummary = async (
  request: Request,
  response: Response,
): Promise<void> => {
  try {
    const { accountId } = request.params as any;

    const [pnl, account] = await Promise.all([
      pnlServices.getUnrealisedPnlForAccount(accountId),
      prisma.account.findUnique({
        where: { id: accountId },
      }),
    ]);

    const totalUnrealised = pnl.reduce((sum, p) => sum + p.unrealizedPnl, 0);

    response.status(200).json({
      success: true,
      data: {
        balance: account?.balance ?? 0,
        totalUnrealisedPnl: Number(totalUnrealised.toFixed(2)),
        positions: pnl,
      },
      message:"Pnl Summary Fetched."
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};



export async function getMarginStatus(request: Request, response: Response) {
  try {
    const{ accountId }= request.params as any;


    const account = await prisma.account.findUnique({
      where: { id: accountId },
    })

    if (!account) throw new Error('Account not found')

    const marginLevel = calcMarginLevel(account.balance, account.marginUsed)
    const freeMargin = account.balance - account.marginUsed

    response.json({
      success: true,
      data:{
      balance: account.balance,
      marginUsed: account.marginUsed,
      freeMargin: Number(freeMargin.toFixed(2)),
      marginLevel: marginLevel === Infinity ? null : Number(marginLevel.toFixed(2)),
      },
      message:"Margin status Fetched."
    })
  } catch(error) {
    console.log(error);
    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  } 
}


 async function getAuditLog(request: Request, response: Response) {
  try {
    const {accountId} = request.params as any

    const logs = await prisma.auditLog.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    response.status(200).json({ success: true, data:logs,
        message:"Audit log fetched."
     })
  } catch(error) {
    console.log(error);
    response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  } 
}
const positionsController = { getPositions, getTradeHistory, getPnlSummary ,getMarginStatus,getAuditLog};

export default positionsController;
