import { prisma } from "../../lib/prisma";

const createAccount=async(name:string,balance:number,userId:string)=>{
    const account=await prisma.account.create({
        data:{
            name,
            balance,
            userId
        }
    })

    return account;
}



const getAllAccounts=async(userId:string)=>{
    const accounts=await prisma.account.findMany({
        where:{
            userId
        }
    });

    return accounts;
}

const getAccountById=async(userId:string,accountId:string)=>{
    const account=await prisma.account.findUnique({
        where:{
            userId,
            id:accountId
        }
    });

    return account;
}


const deleteAccount=async(userId:string,accountId:string)=>{
    const account=await prisma.account.delete({
        where:{
            userId,
            id:accountId
        }
    });

    return account;
}

const accountServices={
    createAccount,
    getAllAccounts,
    getAccountById,
    deleteAccount
}




export default accountServices;