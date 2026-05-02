import { Request, Response } from "express";
import accountServices from "./account.services";

async function createAccount(request:Request,response:Response):Promise<void>{
try {
    const {name,balance}=request.body;
    const userId = (request.user as any).id;

    const account=await accountServices.createAccount(name,balance,userId);


    response.status(201).json({
        success:true,
        message:"Account Created.",
        data:account
    });

} catch (error) {
    console.log(error);
    response.status(500).json({
        success:false,
        message:"Internal Server Error."
    })
}
}

async function getAllAccounts(request:Request,response:Response):Promise<void>{
    try {
     const userId = (request.user as any).id;

    const accounts=await accountServices.getAllAccounts(userId);

    if(accounts.length<=0){
         response.status(200).json({
            success:false,
            message:"No Account Found."
         })
         return
    }

    response.status(200).json({
        success:true,
        message:"Accounts Fetched.",
        data:accounts
    });
} catch (error) {
    console.log(error);
    response.status(500).json({
        success:false,
        message:"Internal Server Error."
    })
}
}

async function getAccountById(request:Request,response:Response):Promise<void>{
try {
   const userId=(request.user as any).id;

   const accountId=(request.params as any).id;

   const account=await accountServices.getAccountById(userId,accountId);

   if(!account){
    response.status(404).json({
        success:false,
        message:"No Account Found."
    });
    return;
   }

   response.status(200).json({
    success:true,
    message:"Account Fetched.",
    data:account
   });
} catch (error) {
    console.log(error);
    response.status(500).json({
        success:false,
        message:"Internal Server Error."
    })
}
}

async function deleteAccount(request:Request,response:Response):Promise<void>{
try {
   const userId=(request.user as any).id;

   const accountId=(request.params as any).id;

   const account=await accountServices.deleteAccount(userId,accountId);

   if(!account){
    response.status(404).json({
        success:false,
        message:"No Account Found."
    });
    return;
   }

   response.status(200).json({
    success:true,
    message:"Account Deleted.",
    data:account
   }); 
} catch (error) {
    console.log(error);
    response.status(500).json({
        success:false,
        message:"Internal Server Error."
    })
}
}

const accountController={
createAccount,
getAccountById,
getAllAccounts,
deleteAccount
}

export default accountController;