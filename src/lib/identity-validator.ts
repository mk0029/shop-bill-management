import { sanityClient } from "@/lib/sanity"
import { normalizeAndValidate, getPhoneFormats } from "@/lib/phone-utils"

export interface IdentityConflict {
  hasConflict: boolean
  field: "email" | "phone" | "both" | null
  existingUserId?: string
  existingCustomerId?: string
  existingRequestId?: string
}

export interface IdentityValidationResult {
  allowed: boolean
  conflict?: IdentityConflict
  error?: string
}

async function findExistingUser(email?: string, phone?: string): Promise<IdentityConflict | null> {
  const phoneFormats = phone ? getPhoneFormats(phone) : []
  const queries: Promise<{ field: "email" | "phone"; result: any }>[] = []

  if (email) {
    queries.push(
      sanityClient
        .fetch(`*[_type == "user" && email == $email][0]{_id, customerId}`, { email })
        .then((r) => ({ field: "email" as const, result: r })),
    )
  }

  if (phoneFormats.length > 0) {
    // Primary: query by normalizedPhone field for new records
    // Fallback: query by phone in $formats for existing records
    queries.push(
      sanityClient
        .fetch(`*[_type == "user" && (normalizedPhone == $normalizedPhone || phone in $formats)][0]{_id, customerId}`, {
          normalizedPhone: phone,
          formats: phoneFormats,
        })
        .then((r) => ({ field: "phone" as const, result: r })),
    )
  }

  if (queries.length === 0) return null

  const results = await Promise.all(queries)
  const emailHit = results.find((r) => r.field === "email" && r.result)
  const phoneHit = results.find((r) => r.field === "phone" && r.result)

  if (emailHit && phoneHit) {
    return {
      hasConflict: true,
      field: "both",
      existingUserId: emailHit.result._id,
      existingCustomerId: emailHit.result.customerId,
    }
  }
  if (emailHit) {
    return {
      hasConflict: true,
      field: "email",
      existingUserId: emailHit.result._id,
      existingCustomerId: emailHit.result.customerId,
    }
  }
  if (phoneHit) {
    return {
      hasConflict: true,
      field: "phone",
      existingUserId: phoneHit.result._id,
      existingCustomerId: phoneHit.result.customerId,
    }
  }

  return null
}

async function findExistingRequest(email?: string, phone?: string): Promise<IdentityConflict | null> {
  const phoneFormats = phone ? getPhoneFormats(phone) : []
  const queries: Promise<{ field: "email" | "phone"; result: any }>[] = []

  if (email) {
    queries.push(
      sanityClient
        .fetch(`*[_type == "customerRequest" && status == "pending" && email == $email][0]{_id, requestId}`, { email })
        .then((r) => ({ field: "email" as const, result: r })),
    )
  }

  if (phoneFormats.length > 0) {
    queries.push(
      sanityClient
        .fetch(`*[_type == "customerRequest" && status == "pending" && (normalizedPhone == $normalizedPhone || phone in $formats)][0]{_id, requestId}`, {
          normalizedPhone: phone,
          formats: phoneFormats,
        })
        .then((r) => ({ field: "phone" as const, result: r })),
    )
  }

  if (queries.length === 0) return null

  const results = await Promise.all(queries)
  const emailHit = results.find((r) => r.field === "email" && r.result)
  const phoneHit = results.find((r) => r.field === "phone" && r.result)

  if (emailHit || phoneHit) {
    const hit = emailHit || phoneHit
    return {
      hasConflict: true,
      field: hit!.field,
      existingRequestId: hit!.result._id,
    }
  }

  return null
}

export async function validateIdentity(
  identity: { email?: string; phone: string },
  options?: { checkRequests?: boolean; excludeUserId?: string },
): Promise<IdentityValidationResult> {
  const { email, phone } = identity
  const normalizedPhone = normalizeAndValidate(phone)

  if (!normalizedPhone) {
    return { allowed: false, error: "Invalid phone number" }
  }

  const userConflict = await findExistingUser(email, normalizedPhone)
  if (userConflict) {
    return { allowed: false, conflict: userConflict }
  }

  if (options?.checkRequests !== false) {
    const requestConflict = await findExistingRequest(email, normalizedPhone)
    if (requestConflict) {
      return { allowed: false, conflict: requestConflict }
    }
  }

  return { allowed: true }
}

export async function validateIdentityStrict(
  identity: { email?: string; phone: string },
  options?: { checkRequests?: boolean; excludeUserId?: string },
): Promise<IdentityValidationResult> {
  const result = await validateIdentity(identity, options)

  if (result.allowed) {
    return result
  }

  if (result.conflict?.existingRequestId) {
    return {
      allowed: false,
      conflict: result.conflict,
      error: "A pending registration request already exists with these identity details.",
    }
  }

  return {
    allowed: false,
    conflict: result.conflict,
    error: "A customer with these identity details already exists.",
  }
}
