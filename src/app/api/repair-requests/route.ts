import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";
import { safeUserName } from "@/lib/display-text";
import { emitWaEventServer } from "@/lib/wa-bot-server";
import { getActiveAdminUserIds, createAndDispatchNotification } from "@/services/notifications/notification-events.server";

export const dynamic = "force-dynamic";

const PRIORITIES = new Set(["average", "high"]);
const SOURCES = new Set(["whatsapp", "in_chat"]);

function canManage(role: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
}

function cleanText(value: unknown, max = 2000) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

async function createRequestId() {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = randomBytes(3).toString("hex").toUpperCase();
    const requestId = `RR-${stamp}-${suffix}`;
    const exists = await sanityClient.fetch<string | null>(
      `*[_type=="repairRequest" && requestId==$requestId][0]._id`,
      { requestId },
    );
    if (!exists) return requestId;
  }

  return `RR-${stamp}-${Date.now().toString(36).toUpperCase()}`;
}

const repairRequestProjection = `{
  _id, requestId, details, notes, priority, source, status, scheduledAt, createdAt, updatedAt,
  cancelledByName, cancelledByRole, cancelledAt,
  customerName, customerPhone, technicianName,
  customer->{_id, name, phone, customerId, profileImage, "profileImageUrl": profileImage.asset->url},
  technician->{_id, name, role, phone, profileImage, "profileImageUrl": profileImage.asset->url},
  workTask->{_id, title, status, dueAt}
}`;

export async function GET(req: NextRequest) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = String(url.searchParams.get("status") || "").trim();
  const customerId = String(url.searchParams.get("customerId") || "").trim();
  const params = {
    authUserId: auth.userId,
    authCustomerCode: auth.customerId,
    status,
    customerId,
  };

  const baseFilter = auth.role === "customer"
    ? `_type=="repairRequest" && (customer._ref==$authUserId || customer->customerId==$authCustomerCode)`
    : canManage(auth.role)
      ? `_type=="repairRequest"`
      : "";

  if (!baseFilter) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const extra = [
    status ? `status == $status` : "",
    canManage(auth.role) && customerId ? `customer._ref == $customerId` : "",
  ].filter(Boolean).join(" && ");

  const query = `*[${baseFilter}${extra ? ` && ${extra}` : ""}]${repairRequestProjection} | order(createdAt desc)`;
  const requests = await sanityClient.fetch(query, params);

  return NextResponse.json({ success: true, data: requests || [] });
}

export async function POST(req: NextRequest) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || auth.role !== "customer" || !auth.userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const details = cleanText(body?.details, 2000);
  const notes = cleanText(body?.notes, 1000);
  const priority = String(body?.priority || "average").trim();
  const source = priority === "high" ? "whatsapp" : "in_chat";
  const technicianId = String(body?.technicianId || "").trim();

  if (details.length < 5) {
    return NextResponse.json({ success: false, error: "Request details are required" }, { status: 400 });
  }
  if (!PRIORITIES.has(priority)) {
    return NextResponse.json({ success: false, error: "Invalid priority" }, { status: 400 });
  }
  if (!SOURCES.has(source)) {
    return NextResponse.json({ success: false, error: "Invalid request source" }, { status: 400 });
  }
  if (!technicianId) {
    return NextResponse.json({ success: false, error: "Mechanic / technician is required" }, { status: 400 });
  }

  const [customer, technician] = await Promise.all([
    sanityClient.fetch<{ _id: string; name?: string; phone?: string } | null>(
      `*[_type=="user" && _id==$id && role=="customer"][0]{_id,name,phone}`,
      { id: auth.userId },
    ),
    sanityClient.fetch<{ _id: string; name?: string; phone?: string; role?: string } | null>(
      `*[_type=="user" && _id==$id && role in ["technician","admin","super_admin"] && isActive != false][0]{_id,name,phone,role}`,
      { id: technicianId },
    ),
  ]);

  if (!customer) {
    return NextResponse.json({ success: false, error: "Customer profile not found" }, { status: 404 });
  }
  if (!technician) {
    return NextResponse.json({ success: false, error: "Selected mechanic / technician was not found" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const requestId = await createRequestId();
  const safeCustomerName = safeUserName(customer.name, "Customer");
  const safeTechnicianName = safeUserName(technician.name, "Technician");

  const created = await sanityClient.create({
    _type: "repairRequest",
    requestId,
    customer: { _type: "reference", _ref: customer._id },
    customerName: safeCustomerName,
    customerPhone: customer.phone || "",
    details,
    notes,
    priority,
    source,
    technician: { _type: "reference", _ref: technician._id },
    technicianName: safeTechnicianName,
    status: "pending",
    createdBy: { _type: "reference", _ref: customer._id },
    createdAt: now,
    updatedAt: now,
  });

  const selectedTechnicianId = technician._id;
  const adminIds = selectedTechnicianId ? [selectedTechnicianId] : await getActiveAdminUserIds();
  const postCreateJobs: Promise<unknown>[] = [
    createAndDispatchNotification({
      eventId: `repairRequest.created.${created._id}.${selectedTechnicianId || "admins"}`,
      type: "system.general",
      actorUserId: customer._id,
      userIds: adminIds,
      title: priority === "high" ? "High priority repair request" : "New repair request",
      body: `${requestId} from ${safeCustomerName}. Priority: ${priority === "high" ? "High" : "Average"}. Assigned to ${safeTechnicianName}.`,
      data: {
        route: "/dashboard/work-list",
        route_path: "/dashboard/work-list",
        repairRequestId: String(created._id),
        requestId,
        assignedTechnicianId: selectedTechnicianId,
      },
      skipActor: true,
    }),
  ];

  if (priority === "high") {
    postCreateJobs.push(
      emitWaEventServer("workTask.created", {
        requestId,
        taskId: String(created._id),
        title: "High priority repair request",
        description: details,
        status: "pending",
        customerId: customer._id,
        customerName: safeCustomerName,
        customerPhone: customer.phone || "",
        technicianId: selectedTechnicianId,
        technicianName: safeTechnicianName,
        technicianPhone: technician.phone || "",
        priority,
        source: "repairRequest",
        idempotencyKey: `workTask.created:${String(created._id)}:${now}`,
      }).then((result) => {
        if (!result.ok) {
          console.error("[RepairRequest] WhatsApp event failed", { requestId, error: result.error });
        }
        return result;
      }),
    );
  }
  void Promise.allSettled(postCreateJobs).catch((error) => {
    console.error("[RepairRequest] post-create notification jobs failed", error);
  });

  return NextResponse.json({ success: true, data: created });
}
