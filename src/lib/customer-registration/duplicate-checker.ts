import type { DuplicateCheckResult } from "./types"
import { validateIdentity } from "@/lib/identity-validator"

export async function checkDuplicates(
  email: string,
  phone: string,
): Promise<DuplicateCheckResult> {
  const result = await validateIdentity(
    { email, phone },
    { checkRequests: true },
  )

  if (result.allowed) {
    return { type: "OK" }
  }

  if (result.conflict?.existingRequestId) {
    return { type: "REQUEST_EXISTS" }
  }

  return { type: "ACCOUNT_EXISTS" }
}
