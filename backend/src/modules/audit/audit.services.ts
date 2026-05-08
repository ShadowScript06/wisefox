import { AuditType } from "../../generated/prisma/enums"
import { prisma } from "../../lib/prisma"


async function log(
  accountId: string,
  type: AuditType,
  message: string,
  meta?: Record<string, any>
) {
  return prisma.auditLog.create({
    data: { accountId, type, message, meta },
  })
}

const auditServices={
log
}

export default auditServices