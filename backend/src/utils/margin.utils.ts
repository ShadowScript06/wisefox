
// margin required to open position
// formula: (qty × price) / leverage
export function calcRequiredMargin(
  qty: number,
  price: number,
  leverage: number
): number {
  return ((qty/1000) * price) / leverage
}

// margin level = (balance / marginUsed) × 100
// below 100% = margin call territory
// below 50%  = liquidation territory
export function calcMarginLevel(equity: number, marginUsed: number): number {

  
  if (marginUsed === 0) return Infinity
  return (equity / marginUsed) * 100
}

export async  function checkIsMarginAvailable(accountId:string,tx:any,quantity:number,currentPrice:number,leverage:number,orderId:string){
  const account = await tx.$queryRaw<
      { id: string; balance: number; marginUsed: number }[]
    >`
    SELECT id, balance, "marginUsed"
    FROM "Account"
    WHERE id = ${accountId}
    FOR UPDATE
  `;

    if (!account[0]) throw new Error("Account not found");

    console.log(`Account found : ${account[0]}`);

    const { balance, marginUsed } = account[0];
    const requiredMargin = calcRequiredMargin(
      quantity,
      currentPrice,
      leverage,
    );

    console.log(`Margin required: ${requiredMargin}`);

    const freeMargin = balance - marginUsed;
    console.log("Free margin: ", freeMargin);
    // 2. margin check
    if (requiredMargin > freeMargin) {
      // cancel the order — not enough margin
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      console.log(
        `Order ${orderId} cancelled — insufficient margin. Required: ${requiredMargin}, Free: ${freeMargin}`,
      );
      return;
    }
}