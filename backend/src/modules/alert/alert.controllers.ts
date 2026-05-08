import { success } from "zod";
import { Request,Response } from "express";
import alertServices from "./alerts.services";


const createAlert=async(request:Request,response:Response)=>{
    try {
         const{name,price,type,symbol}=request.body;

         const userId = (request.user as any).id;

         const  alert=await alertServices.createAlert({name,price,type,symbol,userId});

         response.status(201).json({
            success:true,
            data:alert,
            message:"Alert Created."
         });

    } catch (error) {
        console.log(error);
        response.status(500).json({
            success:false,
            message:"Internal Server Error."
        })
    }
}

const editAlert=async(request:Request,response:Response)=>{
    try {
         const{name,price,type}=request.body ;

         const userId = (request.user as any).id;

         const alertId=(request.params as any).alertId;

         const editedAlert=await alertServices.editAlert({name,price,type},userId,alertId);

         response.status(200).json({
            success:true,
            data:editedAlert,
            message:"Alert Edited."
         })
    } catch (error) {
        console.log(error);
        response.status(500).json({
            success:false,
            message:"Internal Server Error."
        })
    }
}

const deleteAlert=async(request:Request,response:Response)=>{
    try {
         const userId = (request.user as any).id;

         const alertId=(request.params as any).alertId;

         const deletedAlert=await alertServices.deleteAlert(alertId,userId,);

         response.status(200).json({
            success:true,
            data:deletedAlert,
            message:"Alert Deleted."
         });

    } catch (error) {
        console.log(error);
        response.status(500).json({
            success:false,
            message:"Internal Server Error."
        })
    }
}

const getAllAlerts=async(request:Request,response:Response)=>{
    try {
         const userId = (request.user as any).id;


         const allAlerts=await alertServices.getAllAlert(userId);

         response.status(200).json({
            success:true,
            data:allAlerts,
            message:"Alert Deleted."
         });
    } catch (error) {
        console.log(error);
        response.status(500).json({
            success:false,
            message:"Internal Server Error."
        })
    }
}




const alertController={
    createAlert,
    editAlert,
    deleteAlert,getAllAlerts
}

export default alertController;