import { Order } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const pendingOrders:Order[]=[];

export async function refreshPendingOrdersCache(){
 console.log("Syncing pending orders from DB...");

  const dbOrders = await prisma.order.findMany({
    where: { status: "PENDING" }
  });

  for (const order of dbOrders) {
    const exists = pendingOrders.some(
      o => o.id === order.id
    );

    if (!exists) {
      pendingOrders.push(order);
    }
  }

  console.log(
    `Pending Orders cache refreshed: ${pendingOrders.length} pending orders.`
  );
}

export default pendingOrders;