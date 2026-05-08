import { Request,Response } from "express"
import orderServices from "./order.services";

import { OrderStatus } from "../../generated/prisma/enums";

const placeOrder=async(request:Request,response:Response)=>{
try {
    const{symbol,direction,type,quantity,price,ttlSeconds,leverage,slPrice, slQty, tpPrice, tpQty}=request.body;

    const accountId=(request.params as any).accountId;


    const order=await orderServices.placeOrder({accountId,symbol,direction,type,quantity,price,ttlSeconds,leverage,slPrice, slQty, tpPrice, tpQty});

    response.status(201).json({
        success:true,
        data:order,
        message:"Order Created."
    })
} catch (error) {
    console.log(error);
    response.status(500).json({
        success:false,
        message:"Internal Server Error."
    })
}
}

const cancelOrder=async(request:Request,response:Response)=>{
try {
    const {accountId,orderId}=request.params as any;

    const order=await orderServices.cancelOrder({orderId,accountId});

    response.status(200).json({
        success:true,
        message:"Order Cancelled",
        data:order
    })
} catch (error) {
    console.log(error);
    response.status(500).json({
        success:false,
        message:"Internal Server Error."
    })
}
}



const getAllOrders = async (request: Request, response: Response) => {
  try {
    const { accountId } = request.params as { accountId: string };

    const status = request.query.status as OrderStatus | undefined;

    // 🔥 FIXED PAGINATION
    const page = Number(request.query.page) || 1;
    const limit = 10; // fixed server-side

    const skip = (page - 1) * limit;

    const orders = await orderServices.getOrders(
      accountId,
      status,
      skip,
      limit
    );

    const total = await orderServices.countOrders(accountId, status);

    return response.status(200).json({
      success: true,
      data: orders,
      message: "Orders Fetched.",
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    console.log(error);

    return response.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};



const orderController={
    getAllOrders,
    cancelOrder,
    placeOrder
}

export default orderController;