import { locationOptions } from "@/app/admin/tools/fitting-items/constants";

export interface ParsedCustomerFields {
  name: string;
  phone: string;
  email: string;
  location: string;
  contactPreference: string;
  requirement: string;
}

export interface ParseResult {
  parsedFields: ParsedCustomerFields;
  missingRequired: string[];
  missingOptional: string[];
  confidence: {
    name: boolean;
    phone: boolean;
    email: boolean;
    location: boolean;
    contactPreference: boolean;
    requirement: boolean;
  };
}

const FIELD_LABELS: Record<string, string[]> = {
  name: [
    "name",
    "customer name",
    "full name",
    "fullname",
    "customername",
    "your name",
    "client name",
  ],
  phone: [
    "phone",
    "mobile",
    "contact",
    "whatsapp",
    "phone number",
    "mobile number",
    "contact number",
    "whatsapp number",
    "phone no",
    "mobile no",
    "contact no",
    "whatsapp no",
    "phone no.",
    "mobile no.",
    "contact no.",
    "phonenumber",
    "mobilenumber",
    "contactnumber",
    "whatsappnumber",
  ],
  email: [
    "email",
    "email address",
    "mail",
    "mail address",
    "email address",
    "your email",
    "emailid",
    "email id",
  ],
  location: [
    "location",
    "address",
    "village",
    "city",
    "area",
    "place",
    "region",
    "locality",
    "your location",
    "your address",
    "your village",
    "your city",
  ],
  contactPreference: [
    "contact preference",
    "preferred contact",
    "contact method",
    "communication",
    "preferred method",
    "contactpref",
    "contact preference",
    "preferredcontact",
  ],
  requirement: [
    "requirement",
    "message",
    "need",
    "notes",
    "note",
    "details",
    "description",
    "request",
    "your requirement",
    "your message",
    "your need",
    "your notes",
    "your request",
    "additional info",
    "additional information",
    "extra info",
    "extra information",
    "comments",
    "remarks",
  ],
};

function normalizePhone(phone: string): string {
  let digits = phone.replace(/[^0-9+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) {
    if (digits.startsWith("+91") && digits.length === 13) return digits.slice(1);
    return digits;
  }
  if (digits.startsWith("91") && digits.length >= 12) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function sanitizeText(text: string): string {
  return text
    .replace(/[<>&"']/g, "")
    .trim();
}

function matchLocation(rawLocation: string): string {
  const normalized = rawLocation.toLowerCase().trim();
  for (const option of locationOptions) {
    if (option.value.toLowerCase().trim() === normalized) {
      return option.value;
    }
    if (option.label.toLowerCase().trim() === normalized) {
      return option.value;
    }
  }
  return rawLocation.trim();
}

function findFieldValue(
  lines: string[],
  fieldType: keyof typeof FIELD_LABELS
): string {
  const labels = FIELD_LABELS[fieldType];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    for (const label of labels) {
      const patterns = [
        new RegExp(`^${label}\\s*[:\\-=]+\\s*(.+)$`, "i"),
        new RegExp(`^${label}\\s*[:\\-=]+\\s*$`, "i"),
      ];

      for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const potentialLabel = trimmed.substring(0, colonIndex).toLowerCase().trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      if (value && labels.includes(potentialLabel)) {
        return value;
      }
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex > 0) {
      const potentialLabel = trimmed.substring(0, equalsIndex).toLowerCase().trim();
      const value = trimmed.substring(equalsIndex + 1).trim();
      if (value && labels.includes(potentialLabel)) {
        return value;
      }
    }
  }

  return "";
}

export function parseCustomerRequestText(rawText: string): ParseResult {
  const sanitized = sanitizeText(rawText);
  const lines = sanitized.split(/\r?\n/).filter((l) => l.trim() !== "");

  const rawName = findFieldValue(lines, "name");
  const rawPhone = findFieldValue(lines, "phone");
  const rawEmail = findFieldValue(lines, "email");
  const rawLocation = findFieldValue(lines, "location");
  const rawContactPreference = findFieldValue(lines, "contactPreference");
  const rawRequirement = findFieldValue(lines, "requirement");

  const name = rawName.trim();
  const phone = normalizePhone(rawPhone);
  const email = rawEmail.replace(/\[|\]/g, "").trim();
  const location = rawLocation ? matchLocation(rawLocation) : "";
  const contactPreference = rawContactPreference.trim();
  const requirement = rawRequirement.trim();

  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  if (!name) missingRequired.push("name");
  if (!phone) missingRequired.push("phone");
  if (!email) missingOptional.push("email");
  if (!location) missingOptional.push("location");
  if (!contactPreference) missingOptional.push("contactPreference");
  if (!requirement) missingOptional.push("requirement");

  return {
    parsedFields: {
      name,
      phone,
      email,
      location,
      contactPreference,
      requirement,
    },
    missingRequired,
    missingOptional,
    confidence: {
      name: !!name,
      phone: !!phone,
      email: !!email,
      location: !!location,
      contactPreference: !!contactPreference,
      requirement: !!requirement,
    },
  };
}
