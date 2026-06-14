import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";
import { formatDayDateTime } from "@/lib/date-time";
import { safeUserName } from "@/lib/display-text";
import { getActiveAdminUserIds, sendNotificationEvent } from "@/services/notifications/notification-events.server";

export const dynamic = "force-dynamic";

type RepairRequestDoc = {
  _id: string;
  requestId: string;
  details?: string;
  notes?: string;
  priority?: "average" | "high";
  source?: "whatsapp" | "in_chat";
  status?: string;
  scheduledAt?: string;
  cancelledByName?: string;
  cancelledByRole?: string;
  cancelledAt?: string;
  customerRefId?: string;
  technicianRefId?: string;
  customer?: { _id: string; name?: string; phone?: string };
  technician?: { _id: string; name?: string; phone?: string; role?: string };
  workTask?: { _id: string };
};

const STATUS_BY_ACTION = {
  accept: "accepted",
  reject: "rejected",
  hold: "on_hold",
} as const;

function canManage(role: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
}

function isValidDateTime(input: string) {
  if (!input) return false;
  return !Number.isNaN(new Date(input).getTime());
}

async function fetchRepairRequest(id: string) {
  return sanityClient.fetch<RepairRequestDoc | null>(
    `*[_type=="repairRequest" && _id==$id][0]{
      _id, requestId, details, notes, priority, source, status, scheduledAt,
      cancelledByName, cancelledByRole, cancelledAt,
      "customerRefId": customer._ref,
      "technicianRefId": technician._ref,
      customer->{_id,name,phone},
      technician->{_id,name,phone,role},
      workTask->{_id}
    }`,
    { id },
  );
}

async function notifyCustomer(args: {
  request: RepairRequestDoc;
  actorUserId: string;
  title: string;
  body: string;
  route?: string;
  taskId?: string;
}) {
  const customerId = args.request.customer?._id;
  if (!customerId) return;
  await sendNotificationEvent({
    eventId: `repairRequest.${args.request.status}.${args.request._id}.${Date.now()}`,
    type: "system.general",
    actorUserId: args.actorUserId,
    userId: customerId,
    title: args.title,
    body: args.body,
    data: {
      route: args.route || "/customer/request-repair",
      route_path: args.route || "/customer/request-repair",
      repairRequestId: args.request._id,
      requestId: args.request.requestId,
      ...(args.taskId ? { taskId: args.taskId } : {}),
    },
    skipActor: true,
  });
}

function workTaskStatusForRepairStatus(status: string) {
  if (status === "on_hold") return "hold";
  if (status === "rejected") return "cancelled";
  return "pending";
}

async function createWorkTaskFromRepairRequest(request: RepairRequestDoc, actorUserId: string, taskStatus = "pending") {
  if (request.workTask?._id) {
    await sanityClient.patch(request.workTask._id).set({
      status: taskStatus,
      ...(request.scheduledAt ? { dueAt: request.scheduledAt } : {}),
      updatedAt: new Date().toISOString(),
    }).commit();
    return request.workTask;
  }
  const customerId = request.customer?._id || request.customerRefId;
  const technicianId = request.technician?._id || request.technicianRefId;
  if (!customerId) throw new Error("Repair request has no customer");
  if (!technicianId) throw new Error("Repair request has no technician");
  if (!request.scheduledAt || !isValidDateTime(request.scheduledAt)) {
    throw new Error("Assign a valid time before adding to work list");
  }

  const now = new Date().toISOString();
  const actorName = safeUserName(
    String((auth.user as { name?: string } | null)?.name || ""),
    auth.role === "customer" ? "Customer" : "Admin",
  );
  const actor = await sanityClient.fetch<{ _id: string; name?: string } | null>(
    `*[_type=="user" && _id==$id][0]{_id,name}`,
    { id: actorUserId },
  );
  const safeTechnicianName = safeUserName(request.technician?.name, "Technician");
  const title = `Repair Request ${request.requestId}`;
  const details = String(request.details || "").trim();
  const notes = String(request.notes || "").trim();
  const description = [
    details,
    notes ? `Customer notes:\n${notes}` : "",
    `Source: ${request.source === "whatsapp" ? "WhatsApp" : "In-chat"}`,
  ].filter(Boolean).join("\n\n");

  const created = await sanityClient.create({
    _type: "workTask",
    title,
    description,
    repairDetails: details,
    customerNotes: notes,
    requestSource: request.source === "whatsapp" ? "WhatsApp" : "In-chat",
    repairRequestId: request.requestId,
    customerRef: { _type: "reference", _ref: customerId },
    assignedTechnician: { _type: "reference", _ref: technicianId },
    assignedTechnicianName: safeTechnicianName,
    priority: request.priority === "high" ? "high" : "medium",
    status: taskStatus,
    issueCategory: "repair",
    dueAt: request.scheduledAt,
    repairRequest: { _type: "reference", _ref: request._id },
    createdBy: { _type: "reference", _ref: actorUserId },
    createdByName: actor?.name || "",
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return { _id: String(created._id || "") };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "").trim();
  const scheduledAt = String(body?.scheduledAt || "").trim();
  const request = await fetchRepairRequest(id);

  if (!request) {
    return NextResponse.json({ success: false, error: "Repair request not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  if (action === "cancel") {
    if (auth.role !== "customer" || request.customer?._id !== auth.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }
    if (request.status === "added_to_work_list") {
      return NextResponse.json({ success: false, error: "Request already added to work list" }, { status: 400 });
    }
    const patched = await sanityClient.patch(id).set({
      status: "cancelled",
      cancelledByName: actorName,
      cancelledByRole: auth.role || "customer",
      cancelledAt: now,
      updatedAt: now,
      updatedBy: { _type: "reference", _ref: auth.userId },
    }).commit();

    const adminIds = await getActiveAdminUserIds();
    await sendNotificationEvent({
      eventId: `repairRequest.cancelled.${id}.admins`,
      type: "system.general",
      actorUserId: auth.userId,
      userIds: adminIds,
      title: "Repair request cancelled",
      body: `Request ${request.requestId} was cancelled by the customer.`,
      data: {
        route: "/admin/repair-requests",
        route_path: "/admin/repair-requests",
        repairRequestId: id,
        requestId: request.requestId,
      },
      skipActor: true,
    });

    return NextResponse.json({ success: true, data: patched });
  }

  if (!canManage(auth.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  if (action === "schedule") {
    if (!isValidDateTime(scheduledAt)) {
      return NextResponse.json({ success: false, error: "Valid assigned time is required" }, { status: 400 });
    }
    if (request.workTask?._id) {
      await sanityClient.patch(request.workTask._id).set({
        dueAt: scheduledAt,
        updatedAt: now,
      }).commit();
    }
    const patched = await sanityClient.patch(id).set({
      scheduledAt,
      updatedAt: now,
      updatedBy: { _type: "reference", _ref: auth.userId },
    }).commit();

    await notifyCustomer({
      request: { ...request, scheduledAt },
      actorUserId: auth.userId,
      title: "Repair time updated",
      body: `${request.requestId} is scheduled for ${formatDayDateTime(scheduledAt)}.`,
      route: request.workTask?._id
        ? `/customer/work-tasks?open=${encodeURIComponent(request.workTask._id)}`
        : "/customer/request-repair",
      taskId: request.workTask?._id,
    });

    return NextResponse.json({ success: true, data: patched });
  }

  if (action in STATUS_BY_ACTION) {
    const nextStatus = STATUS_BY_ACTION[action as keyof typeof STATUS_BY_ACTION];
    const nextScheduledAt = scheduledAt && isValidDateTime(scheduledAt) ? scheduledAt : request.scheduledAt;
    if (!nextScheduledAt || !isValidDateTime(nextScheduledAt)) {
      return NextResponse.json({ success: false, error: "Assign a valid time before updating request status" }, { status: 400 });
    }
    const task = await createWorkTaskFromRepairRequest(
      { ...request, status: nextStatus, scheduledAt: nextScheduledAt },
      auth.userId,
      workTaskStatusForRepairStatus(nextStatus),
    );
    const patched = await sanityClient.patch(id).set({
      status: nextStatus,
      scheduledAt: nextScheduledAt,
      workTask: { _type: "reference", _ref: task._id },
      ...(nextStatus === "rejected"
        ? {
            cancelledByName: actorName,
            cancelledByRole: auth.role || "admin",
            cancelledAt: now,
          }
        : {}),
      updatedAt: now,
      updatedBy: { _type: "reference", _ref: auth.userId },
    }).commit();

    await notifyCustomer({
      request: { ...request, status: nextStatus, scheduledAt: nextScheduledAt },
      actorUserId: auth.userId,
      title: "Repair moved to service tasks",
      body: `${request.requestId} is ${nextStatus.replace(/_/g, " ")} and was added to your service tasks for ${formatDayDateTime(nextScheduledAt)}.`,
      route: `/customer/work-tasks?open=${encodeURIComponent(task._id)}`,
      taskId: task._id,
    });
    return NextResponse.json({ success: true, data: patched, workTaskId: task._id });
  }

  if (action === "add_to_work_list") {
    const nextScheduledAt = scheduledAt && isValidDateTime(scheduledAt) ? scheduledAt : request.scheduledAt;
    const requestForTask = { ...request, scheduledAt: nextScheduledAt };
    try {
      const task = await createWorkTaskFromRepairRequest(requestForTask, auth.userId, "pending");
      const patched = await sanityClient.patch(id).set({
        status: "added_to_work_list",
        scheduledAt: nextScheduledAt,
        workTask: { _type: "reference", _ref: task._id },
        updatedAt: now,
        updatedBy: { _type: "reference", _ref: auth.userId },
      }).commit();

      const adminIds = await getActiveAdminUserIds();
      await Promise.allSettled([
        notifyCustomer({
          request: { ...requestForTask, status: "added_to_work_list" },
          actorUserId: auth.userId,
          title: "Repair moved to service tasks",
          body: `${request.requestId} was added to your service tasks for ${formatDayDateTime(nextScheduledAt || "")}. Tap to open your task list.`,
          route: `/customer/work-tasks?open=${encodeURIComponent(task._id)}`,
          taskId: task._id,
        }),
        sendNotificationEvent({
          eventId: `repairRequest.addedToWorkList.${id}.admins`,
          type: "workTask.created",
          actorUserId: auth.userId,
          userIds: adminIds,
          title: "Repair request converted",
          body: `${request.requestId} is now a work task. WhatsApp was skipped for this conversion.`,
          data: {
            route: "/dashboard/work-list",
            route_path: "/dashboard/work-list",
            repairRequestId: id,
            taskId: task._id,
          },
          skipActor: true,
        }),
      ]);

      return NextResponse.json({ success: true, data: patched, workTaskId: task._id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add request to work list";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: false, error: "Unknown repair request action" }, { status: 400 });
}
