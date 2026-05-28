import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";
import { notificationService } from "@/lib/notification-service";
import { formatDayDateTime, formatRelativeDayDateTime, formatApproachTime } from "@/lib/date-time";
import { sanitizeUserText } from "@/constants/defaults";

function canAccess(role: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
}

function isAllowedDueTime(input: string) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return false;
  return d.getHours() >= 7;
}

async function sendViaWaBotServer(phone: string, message: string) {
  const WA_BOT_URL = process.env.WA_BOT_URL;
  const WA_BOT_TOKEN = process.env.WA_BOT_TOKEN;
  const waBotBaseUrl = (WA_BOT_URL || "").replace(/\/+$/, "");
  if (!waBotBaseUrl || !WA_BOT_TOKEN) {
    throw new Error("WhatsApp bot config missing (WA_BOT_URL/WA_BOT_TOKEN)");
  }

  const res = await fetch(`${waBotBaseUrl}/send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": WA_BOT_TOKEN,
    },
    body: JSON.stringify({ phone, message }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `WhatsApp send failed (${res.status})`);
  }
}

async function notify(actorUserId: string, title: string, body: string, assignedTechnicianId?: string) {
  await notificationService.emit({
    type: "admin_broadcast",
    actorUserId,
    data: {
      route: "/dashboard/work-list",
      message: body,
      extra: { target: "all_admins", title, body },
    },
  });
  if (assignedTechnicianId) {
    await notificationService.emit({
      type: "user_direct",
      actorUserId,
      data: {
        route: "/dashboard/work-list",
        customerId: assignedTechnicianId,
        message: body,
        extra: { targetUserId: assignedTechnicianId, title, body },
      },
    });
  }
}

async function sendCustomerWorkUpdate(args: {
  customerRefId?: string;
  taskTitle: string;
  technicianName: string;
  type: "completed" | "cancelled" | "deleted" | "back_in_progress" | "hold";
  holdReason?: string;
}) {
  if (!args.customerRefId) return;
  const customer = await sanityClient.fetch<any>(
    `*[_type=="user" && _id==$id][0]{_id,name,phone}`,
    { id: args.customerRefId },
  );
  if (!customer?.phone) return;

  let message = "";
  const customerName =
    sanitizeUserText(String(customer?.name || "")).trim() || "Customer";
  const safeTechnicianName =
    sanitizeUserText(String(args.technicianName || "")).trim() || "Technician";
  if (args.type === "completed") {
    message = `Service Update\n\nDear ${customerName},\n\nYour service request for *${args.taskTitle}* has been completed successfully.\n\nAssigned Technician: ${safeTechnicianName}\n\nThank you for trusting Jambh Electrical Services.`;
  } else if (args.type === "cancelled") {
    message = `Service Update\n\nDear ${customerName},\n\nYour service request for *${args.taskTitle}* has been marked as cancelled.\n\nAssigned Technician: ${safeTechnicianName}\n\nFor help, please contact Jambh Electrical Services.`;
  } else if (args.type === "back_in_progress") {
    message = `⚡ Service Status Updated\n\nDear ${customerName},\n\nYour service request for *${args.taskTitle}* has been moved back to *In Progress* status.\n\n🛠️ Technician: ${safeTechnicianName}\n\nOur team is continuing the work/checking process and will update you once the service is completed.\n\nThank you for your patience and support.\n\n📞 Jambh Electrical Services`;
  } else if (args.type === "hold") {
    message = `⏸️ Service Temporarily On Hold\n\nDear ${customerName},\n\nYour service request for *${args.taskTitle}* is currently placed on *Hold* status.\n\nReason: ${args.holdReason || "Temporarily paused"}\n\n🛠️ Technician: ${safeTechnicianName}\n\nOur team will resume the work as soon as possible and keep you updated.\n\nThank you for your understanding.\n\n📞 Jambh Electrical Services`;
  } else {
    message = `Service Update\n\nDear ${customerName},\n\nYour service request for *${args.taskTitle}* has been closed by admin.\n\nAssigned Technician: ${safeTechnicianName}\n\nFor help, please contact Jambh Electrical Services.`;
  }
  await sendViaWaBotServer(String(customer.phone), message);
}

async function sendCustomerDueTimeUpdate(args: {
  customerRefId?: string;
  previousDueAt?: string;
  nextDueAt?: string;
}) {
  if (!args.customerRefId || !args.previousDueAt || !args.nextDueAt) return;
  const customer = await sanityClient.fetch<any>(
    `*[_type=="user" && _id==$id][0]{_id,name,phone}`,
    { id: args.customerRefId },
  );
  if (!customer?.phone) return;

  const customerName =
    sanitizeUserText(String(customer?.name || "")).trim() || "Customer";
  const prevTs = new Date(args.previousDueAt).getTime();
  const nextTs = new Date(args.nextDueAt).getTime();
  if (!Number.isFinite(prevTs) || !Number.isFinite(nextTs) || prevTs === nextTs)
    return;

  const formattedDue = formatApproachTime(args.nextDueAt);
  const isDelayed = nextTs > prevTs;
  const message = isDelayed
    ? `✅ Service Time Update

Dear ${customerName}

We sincerely apologize for the delay in schedule.

We will now approach approximately by ${formattedDue} for inspection/service.

Thank you for your patience and for trusting Jambh Electrical Services ⚡`
    : `✅ Service Request Update

Dear ${customerName}

Good news — our team may reach earlier than the expected time.

We will try to approach before ${formattedDue} for inspection/service.

Thank you for trusting Jambh Electrical Services ⚡`;

  await sendViaWaBotServer(String(customer.phone), message);
}

async function sendTechnicianTaskAssigned(args: {
  technicianId?: string;
  taskTitle: string;
  dueAt?: string;
  priority?: string;
}) {
  const technicianId = String(args.technicianId || "").trim();
  if (!technicianId) return;
  const tech = await sanityClient.fetch<any>(
    `*[_type=="user" && _id==$id][0]{_id,name,phone}`,
    { id: technicianId },
  );
  if (!tech?.phone) return;
  const safeTechnicianName =
    sanitizeUserText(String(tech?.name || "")).trim() || "Technician";
  const msg = `✅ Task Assignment Updated

Hello ${safeTechnicianName},

A task has been assigned to you.

Task: ${args.taskTitle}
Priority: ${String(args.priority || "medium").toUpperCase()}
Due: ${args.dueAt ? formatRelativeDayDateTime(args.dueAt) : "-"}

Please check Work List in app and continue updates.

Jambh Electrical Services`;
  await sendViaWaBotServer(String(tech.phone), msg);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !canAccess(auth.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const actorUserId = String(auth.userId || "").trim();
  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const existing = await sanityClient.fetch<any>(`*[_type=="workTask" && _id==$id][0]`, { id });
  if (!existing) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body?.title != null) patch.title = String(body.title || "").trim();
  if (body?.description != null) patch.description = String(body.description || "").trim();
  if (body?.priority && ["low", "medium", "high", "urgent"].includes(String(body.priority))) patch.priority = String(body.priority);
  if (body?.status && ["pending", "in-progress", "completed", "cancelled", "hold"].includes(String(body.status))) patch.status = String(body.status);
  if (body?.issueCategory && ["repair", "fitting", "wiring", "delivery", "payment", "other"].includes(String(body.issueCategory))) patch.issueCategory = String(body.issueCategory);
  if (body?.dueAt) {
    const nextDueAt = String(body.dueAt);
    if (!isAllowedDueTime(nextDueAt)) {
      return NextResponse.json(
        { success: false, error: "Due time must be between 7:00 AM and 11:59 PM" },
        { status: 400 },
      );
    }
    patch.dueAt = nextDueAt;
  }
  if (body?.completionNotes != null) patch.completionNotes = String(body.completionNotes || "").trim();
  if (body?.cancellationReason != null) patch.cancellationReason = String(body.cancellationReason || "").trim();
  if (body?.holdReason != null) patch.holdReason = String(body.holdReason || "").trim();

  let assignedTechnicianId = existing?.assignedTechnician?._ref || existing?.assignedTechnician?._id || "";
  if (body?.assignedTechnicianId) {
    assignedTechnicianId = String(body.assignedTechnicianId);
    const tech = await sanityClient.fetch<any>(`*[_type=="user" && _id==$id][0]{_id,name,role}`, { id: assignedTechnicianId });
    if (!tech || !["technician", "admin", "super_admin"].includes(String(tech.role || ""))) {
      return NextResponse.json({ success: false, error: "Assignee must be Admin / Super Admin / Technician" }, { status: 400 });
    }
    patch.assignedTechnician = { _type: "reference", _ref: assignedTechnicianId };
    patch.assignedTechnicianName = tech.name || "";
  }

  if (patch.status === "completed") {
    patch.completedAt = new Date().toISOString();
  }
  if (patch.status === "cancelled" && !String(patch.cancellationReason || "").trim()) {
    return NextResponse.json({ success: false, error: "Cancellation reason is required" }, { status: 400 });
  }
  if (patch.status === "hold" && !String(patch.holdReason || "").trim()) {
    return NextResponse.json({ success: false, error: "Hold reason is required" }, { status: 400 });
  }

  const updated = await sanityClient.patch(id).set(patch).commit();

  if (
    body?.assignedTechnicianId &&
    String(existing?.assignedTechnician?._ref || existing?.assignedTechnician?._id || "") !==
      String(body.assignedTechnicianId)
  ) {
    try {
      await sendTechnicianTaskAssigned({
        technicianId: String(body.assignedTechnicianId),
        taskTitle: updated?.title || existing?.title || "Work",
        dueAt: String(updated?.dueAt || existing?.dueAt || ""),
        priority: String(updated?.priority || existing?.priority || "medium"),
      });
    } catch {}
  }

  const previousDueAt = String(existing?.dueAt || "");
  const nextDueAt = String(updated?.dueAt || patch?.dueAt || "");
  const dueChanged = !!(previousDueAt && nextDueAt && previousDueAt !== nextDueAt);
  if (
    dueChanged &&
    !["completed", "cancelled"].includes(String(updated?.status || existing?.status || ""))
  ) {
    try {
      await sendCustomerDueTimeUpdate({
        customerRefId: existing?.customerRef?._ref || existing?.customerRef?._id,
        previousDueAt,
        nextDueAt,
      });
    } catch {}
  }

  if (patch.status === "completed") {
    try {
      await sendCustomerWorkUpdate({
        customerRefId: existing?.customerRef?._ref || existing?.customerRef?._id,
        taskTitle: updated?.title || existing?.title || "Work",
        technicianName: updated?.assignedTechnicianName || existing?.assignedTechnicianName || "Technician",
        type: "completed",
      });
    } catch {
      // Do not fail completion if WhatsApp message fails
    }
  }
  if (patch.status === "cancelled") {
    try {
      await sendCustomerWorkUpdate({
        customerRefId: existing?.customerRef?._ref || existing?.customerRef?._id,
        taskTitle: updated?.title || existing?.title || "Work",
        technicianName: updated?.assignedTechnicianName || existing?.assignedTechnicianName || "Technician",
        type: "cancelled",
      });
    } catch {
      // Do not fail cancellation if WhatsApp message fails
    }
  }
  if (patch.status === "hold") {
    try {
      await sendCustomerWorkUpdate({
        customerRefId: existing?.customerRef?._ref || existing?.customerRef?._id,
        taskTitle: updated?.title || existing?.title || "Work",
        technicianName: updated?.assignedTechnicianName || existing?.assignedTechnicianName || "Technician",
        type: "hold",
        holdReason: String(updated?.holdReason || patch.holdReason || ""),
      });
    } catch {}
  }
  if (
    patch.status === "in-progress" &&
    ["completed", "hold"].includes(String(existing?.status || ""))
  ) {
    try {
      await sendCustomerWorkUpdate({
        customerRefId: existing?.customerRef?._ref || existing?.customerRef?._id,
        taskTitle: updated?.title || existing?.title || "Work",
        technicianName: updated?.assignedTechnicianName || existing?.assignedTechnicianName || "Technician",
        type: "back_in_progress",
      });
    } catch {}
  }

  const actor = await sanityClient.fetch<any>(`*[_type=="user" && _id==$id][0]{name}`, { id: actorUserId });
  const dueStr = updated?.dueAt ? formatDayDateTime(updated.dueAt) : "-";
  const techName = updated?.assignedTechnicianName || "Technician";
  const status = updated?.status || "updated";
  await notify(
    actorUserId,
    "Work task updated",
    `${updated?.title || existing?.title} updated by ${actor?.name || "User"}. Technician: ${techName}. Status: ${status}. Due: ${dueStr}.`,
    assignedTechnicianId || undefined,
  );

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !canAccess(auth.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const actorUserId = String(auth.userId || "").trim();
  const { id } = await params;
  const existing = await sanityClient.fetch<any>(`*[_type=="workTask" && _id==$id][0]{title,assignedTechnician->{_id,name},assignedTechnicianName,customerRef}`, { id });
  if (!existing) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });

  await sanityClient.delete(id);
  try {
    await sendCustomerWorkUpdate({
      customerRefId: existing?.customerRef?._ref || existing?.customerRef?._id,
      taskTitle: existing?.title || "Work",
      technicianName: existing?.assignedTechnicianName || existing?.assignedTechnician?.name || "Technician",
      type: "deleted",
    });
  } catch {
    // Do not fail delete if WhatsApp message fails
  }
  await notify(
    actorUserId,
    "Work task deleted",
    `Work task deleted: ${existing.title}. Technician: ${existing?.assignedTechnician?.name || "Technician"}.`,
    existing?.assignedTechnician?._id,
  );
  return NextResponse.json({ success: true });
}
