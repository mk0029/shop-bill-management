import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";
import { formatDayDateTime } from "@/lib/date-time";
import { sanitizeUserText } from "@/constants/defaults";
import { publishWorkTaskShopChatEvent, type WorkTaskShopChatEventInput } from "@/lib/shop-chat/server-events";
import { getActiveAdminUserIds, createAndDispatchNotification } from "@/services/notifications/notification-events.server";
import { emitWaEventServer } from "@/lib/wa-bot-server";

function canAccess(role: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
}

function isAllowedDueTime(input: string) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return false;
  const hourText = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d).find((part) => part.type === "hour")?.value;
  const hour = Number(hourText);
  return Number.isFinite(hour) && hour >= 7;
}

async function notify(
  actorUserId: string,
  taskId: string,
  eventType: ReturnType<typeof notificationTypeForStatus>,
  title: string,
  body: string,
  eventKey = "event",
  assignedTechnicianId?: string,
) {
  let targetUserIds: string[];
  if (assignedTechnicianId) {
    targetUserIds = [assignedTechnicianId];
  } else {
    try {
      targetUserIds = await getActiveAdminUserIds();
    } catch {
      console.error("Failed to fetch admin user IDs for notification");
      return;
    }
  }
  await createAndDispatchNotification({
    eventId: `${eventType}.${taskId}.${assignedTechnicianId || "admins"}.${eventKey}`.replace(/[^a-zA-Z0-9_.-]/g, "-"),
    type: eventType,
    actorUserId,
    userIds: targetUserIds,
    title,
    body,
    data: { taskId, route: "/dashboard/work-list", route_path: "/dashboard/work-list" },
    skipActor: true,
  });
}

function notificationTypeForStatus(status: string) {
  if (status === "completed") return "workTask.completed" as const;
  if (status === "cancelled") return "workTask.cancelled" as const;
  if (status === "hold") return "workTask.hold" as const;
  return "workTask.updated" as const;
}

async function sendCustomerWorkUpdate(args: {
  customerRefId?: string;
  taskTitle: string;
  technicianName: string;
  type: "completed" | "cancelled" | "deleted" | "back_in_progress" | "hold";
  holdReason?: string;
  taskId?: string;
  status?: string;
  updatedAt?: string;
}) {
  if (!args.customerRefId) return;
  const customer = await sanityClient.fetch<any>(`*[_type=="user" && _id==$id][0]{_id,name,phone}`, { id: args.customerRefId });
  const mappedEvent = args.type === "completed" ? "workTask.completed" : args.type === "cancelled" || args.type === "deleted" ? "workTask.cancelled" : args.type === "hold" ? "workTask.hold" : "workTask.updated";
  await emitWaEventServer(mappedEvent, {
    taskId: args.taskId || "",
    customerId: args.customerRefId,
    customerName: sanitizeUserText(String(customer?.name || "")).trim() || "Customer",
    customerPhone: String(customer?.phone || ""),
    title: args.taskTitle,
    assignedTechnicianName: args.technicianName,
    status: args.status || args.type,
    holdReason: args.holdReason || "",
    updatedAt: args.updatedAt || new Date().toISOString(),
  });
}

async function sendCustomerDueTimeUpdate(args: {
  customerRefId?: string;
  previousDueAt?: string;
  nextDueAt?: string;
  taskId?: string;
  taskTitle?: string;
}) {
  if (!args.customerRefId || !args.previousDueAt || !args.nextDueAt) return;
  const customer = await sanityClient.fetch<any>(`*[_type=="user" && _id==$id][0]{_id,name,phone}`, { id: args.customerRefId });
  await emitWaEventServer("workTask.updated", {
    taskId: args.taskId || "",
    customerId: args.customerRefId,
    customerName: sanitizeUserText(String(customer?.name || "")).trim() || "Customer",
    customerPhone: String(customer?.phone || ""),
    title: args.taskTitle || "Work task",
    dueAt: args.nextDueAt,
    previousDueAt: args.previousDueAt,
    status: "due_changed",
    updatedAt: new Date().toISOString(),
  });
}

async function sendTechnicianTaskAssigned(args: {
  technicianId?: string;
  taskTitle: string;
  dueAt?: string;
  priority?: string;
  taskId?: string;
  customerName?: string;
}) {
  const technicianId = String(args.technicianId || "").trim();
  if (!technicianId) return;
  const tech = await sanityClient.fetch<any>(`*[_type=="user" && _id==$id][0]{_id,name,phone}`, { id: technicianId });
  await emitWaEventServer("workTask.updated", {
    taskId: args.taskId || "",
    title: args.taskTitle,
    assignedTechnicianName: sanitizeUserText(String(tech?.name || "")).trim() || "Technician",
    technicianPhone: String(tech?.phone || ""),
    customerName: args.customerName || "",
    dueAt: args.dueAt || "",
    priority: args.priority || "medium",
    status: "assigned",
    updatedAt: new Date().toISOString(),
  });
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
      let custName = "";
      const custRefId = String(existing?.customerRef?._ref || existing?.customerRef?._id || "");
      if (custRefId) {
        const cust = await sanityClient.fetch<any>(`*[_type=="user" && _id==$id][0]{name}`, { id: custRefId });
        custName = sanitizeUserText(String(cust?.name || "")).trim() || "Customer";
      }
      await sendTechnicianTaskAssigned({
        technicianId: String(body.assignedTechnicianId),
        taskTitle: updated?.title || existing?.title || "Work",
        dueAt: String(updated?.dueAt || existing?.dueAt || ""),
        priority: String(updated?.priority || existing?.priority || "medium"),
        taskId: id,
        customerName: custName,
      });
    } catch {}
  }

  const previousDueAt = String(existing?.dueAt || "");
  const nextDueAt = String(updated?.dueAt || patch?.dueAt || "");
  const dueChanged = !!(previousDueAt && nextDueAt && previousDueAt !== nextDueAt);
  const customerRefId = String(existing?.customerRef?._ref || existing?.customerRef?._id || "");
  if (customerRefId) {
    const statusForChat = String(updated?.status || existing?.status || "pending");
    const changedStatus = String(patch.status || "");
    const actionForChat: WorkTaskShopChatEventInput["action"] =
      changedStatus === "completed"
        ? "completed"
        : changedStatus === "cancelled"
          ? "cancelled"
          : changedStatus === "hold"
            ? "hold"
            : changedStatus === "in-progress"
              ? "in-progress"
              : dueChanged
                ? "due_changed"
                : "updated";
    await publishWorkTaskShopChatEvent(req, {
      customerId: customerRefId,
      taskId: id,
      actorUserId,
      title: String(updated?.title || existing?.title || "Work"),
      description: String(updated?.description || existing?.description || ""),
      status: statusForChat,
      priority: String(updated?.priority || existing?.priority || "medium"),
      issueCategory: String(updated?.issueCategory || existing?.issueCategory || "other"),
      dueAt: String(updated?.dueAt || existing?.dueAt || ""),
      assignedTechnicianName: String(updated?.assignedTechnicianName || existing?.assignedTechnicianName || ""),
      action: actionForChat,
      createdAt: String(updated?.createdAt || existing?.createdAt || ""),
      updatedAt: String(updated?.updatedAt || patch.updatedAt || new Date().toISOString()),
      completionNotes: String(updated?.completionNotes || patch.completionNotes || ""),
      cancellationReason: String(updated?.cancellationReason || patch.cancellationReason || ""),
      holdReason: String(updated?.holdReason || patch.holdReason || ""),
    });
  }
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
        taskId: id,
        status: "completed",
        updatedAt: String(updated?.updatedAt || new Date().toISOString()),
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
        taskId: id,
        status: "cancelled",
        updatedAt: String(updated?.updatedAt || new Date().toISOString()),
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
        taskId: id,
        status: "hold",
        updatedAt: String(updated?.updatedAt || new Date().toISOString()),
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
        taskId: id,
        status: "in-progress",
        updatedAt: String(updated?.updatedAt || new Date().toISOString()),
      });
    } catch {}
  }

  const actor = await sanityClient.fetch<any>(`*[_type=="user" && _id==$id][0]{name}`, { id: actorUserId });
  const dueStr = updated?.dueAt ? formatDayDateTime(updated.dueAt) : "-";
  const techName = updated?.assignedTechnicianName || "Technician";
  const status = updated?.status || "updated";
  const eventType = notificationTypeForStatus(String(updated?.status || patch.status || "updated"));
  const updateTitle = "Work task updated";
  const updateBody = `${updated?.title || existing?.title} updated by ${actor?.name || "User"}. Technician: ${techName}. Status: ${status}. Due: ${dueStr}.`;
  try {
    await notify(
      actorUserId,
      id,
      eventType,
      updateTitle,
      updateBody,
      String(updated?.updatedAt || Date.now()),
      String(updated?.assignedTechnician?._id || updated?.assignedTechnician?._ref || assignedTechnicianId || ""),
    );
  } catch (e) {
    console.error("Failed to send work task notification", e);
  }

  if (customerRefId) {
    try {
      await createAndDispatchNotification({
        eventId: `${eventType}.${id}.customer.${customerRefId}.${String(updated?.updatedAt || Date.now())}`.replace(/[^a-zA-Z0-9_.-]/g, "-"),
        type: eventType,
        actorUserId,
        userId: customerRefId,
        title: updateTitle,
        body: `${updated?.title || existing?.title} updated. Status: ${status}.`,
        data: {
          taskId: id,
          customerId: customerRefId,
          status: String(updated?.status || existing?.status || ""),
          route: "/customer/request-repair",
          route_path: "/customer/request-repair",
        },
        skipActor: true,
      });
    } catch (e) {
      console.error("Failed to send customer notification", e);
    }
  }

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !canAccess(auth.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const actorUserId = String(auth.userId || "").trim();
  const { id } = await params;
  const existing = await sanityClient.fetch<any>(
    `*[_type=="workTask" && _id==$id][0]{
      title, description, priority, status, issueCategory, dueAt,
      repairRequestId, repairDetails, customerNotes, requestSource,
      completionNotes, cancellationReason, holdReason, createdAt, updatedAt,
      repairRequest->{_id,requestId},
      assignedTechnician->{_id,name}, assignedTechnicianName, customerRef
    }`,
    { id },
  );
  if (!existing) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });

  const now = new Date().toISOString();
  const actor = await sanityClient.fetch<any>(`*[_type=="user" && _id==$id][0]{name,role}`, { id: actorUserId });
  const linkedRepairRequest =
    existing?.repairRequest?._id
      ? existing.repairRequest
      : await sanityClient.fetch<any>(
          `*[_type=="repairRequest" && (workTask._ref==$taskId || requestId==$requestId)][0]{_id,requestId}`,
          { taskId: id, requestId: String(existing?.repairRequestId || "") },
        );

  if (linkedRepairRequest?._id) {
    const repairPatch: Record<string, unknown> = {
      status: "cancelled",
      cancelledByName: sanitizeUserText(String(actor?.name || "")).trim() || "Admin",
      cancelledByRole: String(auth.role || actor?.role || "admin"),
      cancelledAt: now,
      updatedAt: now,
    };
    if (actorUserId) {
      repairPatch.updatedBy = { _type: "reference", _ref: actorUserId };
    }
    await sanityClient
      .patch(linkedRepairRequest._id)
      .set(repairPatch)
      .unset(["workTask"])
      .commit();
  }

  await sanityClient.delete(id);
  const customerRefId = String(existing?.customerRef?._ref || existing?.customerRef?._id || "");
  if (customerRefId) {
    await publishWorkTaskShopChatEvent(req, {
      customerId: customerRefId,
      taskId: id,
      actorUserId,
      title: String(existing?.title || "Work"),
      description: String(existing?.description || ""),
      status: String(existing?.status || "deleted"),
      priority: String(existing?.priority || "medium"),
      issueCategory: String(existing?.issueCategory || "other"),
      dueAt: String(existing?.dueAt || ""),
      assignedTechnicianName: sanitizeUserText(String(existing?.assignedTechnicianName || existing?.assignedTechnician?.name || "")).trim(),
      action: "deleted",
      createdAt: String(existing?.createdAt || ""),
      updatedAt: now,
      completionNotes: String(existing?.completionNotes || ""),
      cancellationReason: String(existing?.cancellationReason || ""),
      holdReason: String(existing?.holdReason || ""),
    });
  }
  try {
    await sendCustomerWorkUpdate({
      customerRefId: existing?.customerRef?._ref || existing?.customerRef?._id,
      taskTitle: existing?.title || "Work",
      technicianName: sanitizeUserText(String(existing?.assignedTechnicianName || existing?.assignedTechnician?.name || "")).trim() || "Technician",
      type: "deleted",
      taskId: id,
      status: "deleted",
      updatedAt: now,
    });
  } catch {
    // Do not fail delete if WhatsApp message fails
  }
  await notify(
    actorUserId,
    id,
    "workTask.cancelled",
    "Work task deleted",
    `Work task deleted: ${existing.title}. Technician: ${sanitizeUserText(String(existing?.assignedTechnician?.name || "")).trim() || "Technician"}.`,
    "deleted",
    String(existing?.assignedTechnician?._id || existing?.assignedTechnician?._ref || ""),
  );
  if (customerRefId) {
    await createAndDispatchNotification({
      eventId: `workTask.cancelled.${id}.customer.${customerRefId}`,
      type: "workTask.cancelled",
      actorUserId,
      userId: customerRefId,
      title: "Work task deleted",
      body: `Work task deleted: ${existing.title}.`,
      data: {
        taskId: id,
        customerId: customerRefId,
        route: "/customer/request-repair",
        route_path: "/customer/request-repair",
      },
      skipActor: true,
    });
    if (linkedRepairRequest?._id) {
      await createAndDispatchNotification({
        eventId: `repairRequest.cancelled.${linkedRepairRequest._id}.customer.${customerRefId}.${now}`.replace(/[^a-zA-Z0-9_.-]/g, "-"),
        type: "workTask.cancelled",
        actorUserId,
        userId: customerRefId,
        title: "Repair request cancelled",
        body: `Repair request ${linkedRepairRequest.requestId || existing?.repairRequestId || ""} was cancelled because the linked work task was deleted.`,
        data: {
          taskId: id,
          repairRequestId: linkedRepairRequest._id,
          requestId: linkedRepairRequest.requestId || existing?.repairRequestId || "",
          route: "/customer/request-repair",
          route_path: "/customer/request-repair",
        },
        skipActor: true,
      });
    }
  }
  return NextResponse.json({ success: true });
}
