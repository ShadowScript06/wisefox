import { Request, Response} from 'express'
import sltpService from './sltp.services'
sltpService

// set SL/TP on existing open position
 async function setSltp(request: Request, response: Response,) {
  try {
    const { positionId ,accountId} = request.params as any
    const { slPrice,  tpPrice  } = request.body
   

    await sltpService.setSLTP({ positionId, accountId, slPrice,  tpPrice, })

    response.json({ success: true, message: 'SL/TP updated successfully' })
  } catch (error) {
    console.log(error);
    response.status(500).json({
        success:false,
        message:"Internal Server error"
    })
  }
}

// remove SL/TP from position
 async function removeSltp(request: Request, response: Response) {
  try {
    const { positionId,accountId } = request.params as any
   

    await sltpService.setSLTP({
      positionId,
      accountId,
      slPrice: undefined,
      tpPrice: undefined,
    })

    response.json({ success: true, message: 'SL/TP removed' })
  } catch (error) {
    console.log(error);
    response.status(500).json({
        success:false,
        message:"Internal Server error"
    })
  }
}

const sltpController={
setSltp,
removeSltp
}

export default sltpController