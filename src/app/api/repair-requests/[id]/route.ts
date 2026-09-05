import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { createDocument, updateDocument } from "@/lib/sanity/write-router";
import { getSanityClient } from "@/lib/sanity/client-factory";
import { getServerAuth } from "@/lib/server-auth";
import { formatDayDateTime } from "@/lib/date-time";
import { safeUserName } from "@/lib/display-text";
import { getActiveAdminUserIds, createAndDispatchNotification } from "@/services/notifications/notification-events.server";

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
  _sourceDb?: "primary" | "operations";
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
  const opsClient = getSanityClient("operations");
  const opsDoc = await opsClient
    .fetch<
      | {
          _id: string;
          requestId?: string;
          details?: string;
          notes?: string;
          priority?: string;
          source?: string;
          status?: string;
          scheduledAt?: string;
          cancelledByName?: string;
          cancelledByRole?: string;
          cancelledAt?: string;
          customerId?: string;
          customerName?: string;
          customerPhone?: string;
          technicianId?: string;
          technicianName?: string;
          workTaskId?: string;
        }
      | null
    >(`*[_type=="repairRequest" && _id==$id][0]`, { id })
    .catch(() => null);

  if (opsDoc?._id) {
    return {
      _id: opsDoc._id,
      requestId: opsDoc.requestId || "",
      details: opsDoc.details,
      notes: opsDoc.notes,
      priority: opsDoc.priority as RepairRequestDoc["priority"],
      source: opsDoc.source as RepairRequestDoc["source"],
      status: opsDoc.status,
      scheduledAt: opsDoc.scheduledAt,
      cancelledByName: opsDoc.cancelledByName,
      cancelledByRole: opsDoc.cancelledByRole,
      cancelledAt: opsDoc.cancelledAt,
      customerRefId: opsDoc.customerId || undefined,
      technicianRefId: opsDoc.technicianId || undefined,
      customer: {
        _id: opsDoc.customerId || "",
        name: opsDoc.customerName,
        ...(opsDoc.customerPhone ? { phone: opsDoc.customerPhone } : {}),
      },
      technician: {
        _id: opsDoc.technicianId || "",
        name: opsDoc.technicianName,
        role: "technician",
      },
      workTask: opsDoc.workTaskId ? { _id: opsDoc.workTaskId } : undefined,
      _sourceDb: "operations",
    } as RepairRequestDoc;
  }

  const legacy = await sanityClient.fetch<RepairRequestDoc | null>(
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
  return legacy ? { ...legacy, _sourceDb: "primary" as const, customerRefId: legacy.customerRefId, technicianRefId: legacy.technicianRefId } : null;
}

async function patchRepairRequest(
  id: string,
  fields: Record<string, unknown>,
  sourceDb: RepairRequestDoc["_sourceDb"] = "operations",
) {
  if (sourceDb !== "primary") {
    const result = await updateDocument(id, fields, "repair-requests");
    if (!result.success) {
      throw new Error(result.error || "Failed to update repair request");
    }
    return { _id: id, ...fields };
  }
  return sanityClient.patch(id).set(fields).commit();
}

function workTaskRefField(taskId: string, sourceDb: RepairRequestDoc["_sourceDb"]) {
  return sourceDb === "primary"
    ? { workTask: { _type: "reference", _ref: taskId } as { _type: string; _ref: string } }
    : { workTaskId: taskId };
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
  await createAndDispatchNotification({
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

async function notifyAssignedTechnician(args: {
  request: RepairRequestDoc;
  actorUserId: string;
  title: string;
  body: string;
  route?: string;
  taskId?: string;
}) {
  const technicianId = args.request.technician?._id || args.request.technicianRefId;
  if (!technicianId) return;
  await createAndDispatchNotification({
    eventId: `repairRequest.technician.${args.request._id}.${Date.now()}`,
    type: args.taskId ? "workTask.updated" : "system.general",
    actorUserId: args.actorUserId,
    userId: technicianId,
    title: args.title,
    body: args.body,
    data: {
      route: args.route || "/dashboard/work-list",
      route_path: args.route || "/dashboard/work-list",
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
  const sourceDb = request._sourceDb || "primary";
  if (request.workTask?._id) {
    const taskId = request.workTask._id;
    if (sourceDb === "primary") {
      await sanityClient.patch(taskId).set({
        status: taskStatus,
        ...(request.scheduledAt ? { dueAt: request.scheduledAt } : {}),
        updatedAt: new Date().toISOString(),
      }).commit();
    } else {
      await updateDocument(taskId, {
        status: taskStatus,
        ...(request.scheduledAt ? { dueAt: request.scheduledAt } : {}),
        updatedAt: new Date().toISOString(),
      }, "work-tasks");
    }
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

  const createPayload: Record<string, unknown> = {
    _type: "workTask",
    title,
    description,
    repairDetails: details,
    customerNotes: notes,
    requestSource: request.source === "whatsapp" ? "WhatsApp" : "In-chat",
    repairRequestId: request.requestId,
    customerRefId: customerId,
    assignedTechnicianId: technicianId,
    assignedTechnicianName: safeTechnicianName,
    priority: request.priority === "high" ? "high" : "medium",
    status: taskStatus,
    issueCategory: "repair",
    dueAt: request.scheduledAt,
    createdByUserId: actorUserId,
    createdByName: actor?.name || "",
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  if (sourceDb === "primary") {
    createPayload.customerRef = { _type: "reference", _ref: customerId };
    createPayload.assignedTechnician = { _type: "reference", _ref: technicianId };
    createPayload.repairRequest = { _type: "reference", _ref: request._id };
    createPayload.createdBy = { _type: "reference", _ref: actorUserId };
    delete createPayload.customerRefId;
    delete createPayload.assignedTechnicianId;
    delete createPayload.createdByUserId;
  }

  const createResult = await createDocument(createPayload, "work-tasks");
  if (!createResult.success) {
    throw new Error(createResult.error || "Failed to create work task");
  }

  return { _id: String(createResult.documentId || "") };
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
  const request: RepairRequestDoc | null = await fetchRepairRequest(id);

  if (!request) {
    return NextResponse.json({ success: false, error: "Repair request not found" }, { status: 404 });
  }

  if (request.status === "rejected") {
    return NextResponse.json({ success: false, error: "Cannot modify a rejected request" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const actorName = safeUserName(
    String((auth.user as { name?: string } | null)?.name || ""),
    auth.role === "customer" ? "Customer" : "Admin",
  );

  if (action === "cancel") {
    if (auth.role !== "customer" || request.customer?._id !== auth.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }
    if (request.status === "added_to_work_list") {
      return NextResponse.json({ success: false, error: "Request already added to work list" }, { status: 400 });
    }
    const patched = await patchRepairRequest(id, {
      status: "cancelled",
      cancelledByName: actorName,
      cancelledByRole: auth.role || "customer",
      cancelledAt: now,
      updatedAt: now,
      updatedByUserId: auth.userId,
    }, request._sourceDb);

    const technicianId = request.technician?._id || request.technicianRefId;
    const adminIds = technicianId ? [technicianId] : await getActiveAdminUserIds();
    await createAndDispatchNotification({
      eventId: `repairRequest.cancelled.${id}.${technicianId || "admins"}`,
      type: "system.general",
      actorUserId: auth.userId,
      userIds: adminIds,
      title: "Repair request cancelled",
      body: `Request ${request.requestId} was cancelled by the customer.`,
      data: {
        route: "/dashboard/work-list",
        route_path: "/dashboard/work-list",
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
      if (request._sourceDb === "primary") {
        await sanityClient.patch(request.workTask._id).set({
          dueAt: scheduledAt,
          updatedAt: now,
        }).commit();
      } else {
        await updateDocument(request.workTask._id, {
          dueAt: scheduledAt,
          updatedAt: now,
        }, "work-tasks");
      }
    }
    const patched = await patchRepairRequest(id, {
      scheduledAt,
      updatedAt: now,
      updatedByUserId: auth.userId,
    }, request._sourceDb);

    await notifyCustomer({
      request: { ...request, scheduledAt },
      actorUserId: auth.userId,
      title: "Repair time updated",
      body: `${request.requestId} is scheduled for ${formatDayDateTime(scheduledAt)}.`,
      route: request.workTask?._id
        ? `/customer/request-repair?open=${encodeURIComponent(request.workTask._id)}`
        : "/customer/request-repair",
      taskId: request.workTask?._id,
    });
    await notifyAssignedTechnician({
      request: { ...request, scheduledAt },
      actorUserId: auth.userId,
      title: "Repair time updated",
      body: `${request.requestId} is scheduled for ${formatDayDateTime(scheduledAt)}.`,
      route: "/dashboard/work-list",
      taskId: request.workTask?._id,
    });

    return NextResponse.json({ success: true, data: patched });
  }

  if (action in STATUS_BY_ACTION) {
    const nextStatus = STATUS_BY_ACTION[action as keyof typeof STATUS_BY_ACTION];
    if (nextStatus === "rejected") {
      const patched = await patchRepairRequest(id, {
        status: "rejected",
        cancelledByName: actorName,
        cancelledByRole: auth.role || "admin",
        cancelledAt: now,
        updatedAt: now,
        updatedByUserId: auth.userId,
      }, request._sourceDb);

      await Promise.allSettled([
        notifyCustomer({
          request: { ...request, status: "rejected" },
          actorUserId: auth.userId,
          title: "Repair request rejected",
          body: `${request.requestId} was rejected by Admin.`,
          route: "/customer/request-repair",
        }),
        notifyAssignedTechnician({
          request: { ...request, status: "rejected" },
          actorUserId: auth.userId,
          title: "Repair request rejected",
          body: `${request.requestId} was rejected by Admin.`,
          route: "/dashboard/work-list",
        }),
      ]);

      return NextResponse.json({ success: true, data: patched });
    }

    const nextScheduledAt = scheduledAt && isValidDateTime(scheduledAt) ? scheduledAt : request.scheduledAt;
    if (!nextScheduledAt || !isValidDateTime(nextScheduledAt)) {
      return NextResponse.json({ success: false, error: "Assign a valid time before updating request status" }, { status: 400 });
    }
    const task = await createWorkTaskFromRepairRequest(
      { ...request, status: nextStatus, scheduledAt: nextScheduledAt },
      auth.userId,
      workTaskStatusForRepairStatus(nextStatus),
    );
    const patched = await patchRepairRequest(id, {
      status: nextStatus,
      scheduledAt: nextScheduledAt,
      ...workTaskRefField(task._id, request._sourceDb),
      updatedAt: now,
      updatedByUserId: auth.userId,
    }, request._sourceDb);

    await Promise.allSettled([
      notifyCustomer({
        request: { ...request, status: nextStatus, scheduledAt: nextScheduledAt },
        actorUserId: auth.userId,
        title: "Repair moved to service tasks",
        body: `${request.requestId} is ${nextStatus.replace(/_/g, " ")} and was added to your service tasks for ${formatDayDateTime(nextScheduledAt)}.`,
        route: `/customer/request-repair?open=${encodeURIComponent(task._id)}`,
        taskId: task._id,
      }),
      notifyAssignedTechnician({
        request: { ...request, status: nextStatus, scheduledAt: nextScheduledAt },
        actorUserId: auth.userId,
        title: "Repair task updated",
        body: `${request.requestId} is ${nextStatus.replace(/_/g, " ")} for ${formatDayDateTime(nextScheduledAt)}.`,
        route: "/dashboard/work-list",
        taskId: task._id,
      }),
    ]);
    return NextResponse.json({ success: true, data: patched, workTaskId: task._id });
  }

  if (action === "add_to_work_list") {
    const nextScheduledAt = scheduledAt && isValidDateTime(scheduledAt) ? scheduledAt : request.scheduledAt;
    const requestForTask = { ...request, scheduledAt: nextScheduledAt };
    try {
      const task = await createWorkTaskFromRepairRequest(requestForTask, auth.userId, "pending");
      const patched = await patchRepairRequest(id, {
        status: "added_to_work_list",
        scheduledAt: nextScheduledAt,
        ...workTaskRefField(task._id, request._sourceDb),
        updatedAt: now,
        updatedByUserId: auth.userId,
      }, request._sourceDb);

      const technicianId = request.technician?._id || request.technicianRefId;
      const targetAdminIds = technicianId ? [technicianId] : await getActiveAdminUserIds();
      await Promise.allSettled([
        notifyCustomer({
          request: { ...requestForTask, status: "added_to_work_list" },
          actorUserId: auth.userId,
          title: "Repair moved to service tasks",
          body: `${request.requestId} was added to your service tasks for ${formatDayDateTime(nextScheduledAt || "")}. Tap to open your task list.`,
          route: `/customer/request-repair?open=${encodeURIComponent(task._id)}`,
          taskId: task._id,
        }),
        createAndDispatchNotification({
          eventId: `repairRequest.addedToWorkList.${id}.${technicianId || "technician"}`,
          type: "workTask.created",
          actorUserId: auth.userId,
          userIds: targetAdminIds,
          title: "Repair request converted",
          body: `${request.requestId} is now your work task. WhatsApp was skipped for this conversion.`,
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
