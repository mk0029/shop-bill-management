import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";
import { notificationService } from "@/lib/notification-service";
import { formatApproachTime, formatDayDate, formatDayDateTime } from "@/lib/date-time";

function canAccess(role: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
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

async function getTechnicianUserIds() {
  const ids = await sanityClient.fetch<string[]>(
    `*[_type=="user" && role=="technician" && isActive != false]._id`,
  );
  return Array.from(new Set((ids || []).filter(Boolean)));
}

async function notifyWorkTaskEvent(args: {
  actorUserId: string;
  title: string;
  body: string;
  assignedTechnicianId?: string;
  notifyAllTechnicians?: boolean;
}) {
  await notificationService.emit({
    type: "admin_broadcast",
    actorUserId: args.actorUserId,
    data: {
      route: "/dashboard/work-list",
      message: args.body,
      extra: { target: "all_admins", title: args.title, body: args.body },
    },
  });

  if (args.assignedTechnicianId) {
    await notificationService.emit({
      eventId: `worktask.direct.${Date.now()}.${args.assignedTechnicianId}`,
      type: "user_direct",
      actorUserId: args.actorUserId,
      data: {
        route: "/dashboard/work-list",
        customerId: args.assignedTechnicianId,
        message: args.body,
        extra: {
          targetUserId: args.assignedTechnicianId,
          title: args.title,
          body: args.body,
        },
      },
    });
  }

  if (args.notifyAllTechnicians) {
    const technicianIds = await getTechnicianUserIds();
    await Promise.all(
      technicianIds.map((uid) =>
        notificationService.emit({
          eventId: `worktask.tech.${Date.now()}.${uid}`,
          type: "user_direct",
          actorUserId: args.actorUserId,
          data: {
            route: "/dashboard/work-list",
            customerId: uid,
            message: args.body,
            extra: { targetUserId: uid, title: args.title, body: args.body },
          },
        }),
      ),
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !canAccess(auth.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const technicianId = url.searchParams.get("technicianId");
  const priority = url.searchParams.get("priority");
  const date = url.searchParams.get("date");
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();

  const query = `*[_type == "workTask"]{
    _id, title, description, priority, status, issueCategory, dueAt,
    completionNotes, cancellationReason, holdReason, completedAt, createdAt, updatedAt, createdByName, assignedTechnicianName,
    customerRef->{_id, name, phone},
    assignedTechnician->{_id, name, phone},
    createdBy->{_id, name}
  } | order(dueAt asc)`;
  let tasks = await sanityClient.fetch<any[]>(query);

  if (status) tasks = tasks.filter((t) => String(t.status) === status);
  if (technicianId) tasks = tasks.filter((t) => t?.assignedTechnician?._id === technicianId);
  if (priority) tasks = tasks.filter((t) => String(t.priority) === priority);
  if (date) {
    tasks = tasks.filter((t) => {
      const d = new Date(t.dueAt);
      if (Number.isNaN(d.getTime())) return false;
      return d.toISOString().slice(0, 10) === date;
    });
  }
  if (q) {
    tasks = tasks.filter((t) => {
      const hay = `${t.title || ""} ${t.description || ""} ${t?.customerRef?.name || ""} ${t?.assignedTechnicianName || t?.assignedTechnician?.name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  return NextResponse.json({ success: true, data: tasks });
}

export async function POST(req: NextRequest) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !canAccess(auth.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const actorUserId = String(auth.userId || "").trim();
  if (!actorUserId) {
    return NextResponse.json({ success: false, error: "Missing actor" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as any));
  const title = String(body?.title || "").trim();
  const assignedTechnicianId = String(body?.assignedTechnicianId || "").trim();
  const dueAt = String(body?.dueAt || "").trim();
  if (!title) return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
  if (!assignedTechnicianId)
    return NextResponse.json({ success: false, error: "Technician is required" }, { status: 400 });
  if (!dueAt) return NextResponse.json({ success: false, error: "Due date/time is required" }, { status: 400 });

  const [tech, actor] = await Promise.all([
    sanityClient.fetch<any>(`*[_type=="user" && _id==$id][0]{_id,name,role}`, { id: assignedTechnicianId }),
    sanityClient.fetch<any>(`*[_type=="user" && _id==$id][0]{_id,name}`, { id: actorUserId }),
  ]);
  if (!tech || !["technician", "admin", "super_admin"].includes(String(tech.role || ""))) {
    return NextResponse.json({ success: false, error: "Assignee must be Admin / Super Admin / Technician" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const doc = {
    _type: "workTask",
    title,
    description: String(body?.description || "").trim(),
    ...(body?.customerRefId ? { customerRef: { _type: "reference", _ref: String(body.customerRefId) } } : {}),
    assignedTechnician: { _type: "reference", _ref: assignedTechnicianId },
    assignedTechnicianName: tech.name || "",
    priority: ["low", "medium", "high", "urgent"].includes(String(body?.priority)) ? String(body.priority) : "medium",
    status: ["pending", "in-progress", "completed", "cancelled", "hold"].includes(String(body?.status)) ? String(body.status) : "pending",
    issueCategory: ["repair", "fitting", "wiring", "delivery", "payment", "other"].includes(String(body?.issueCategory)) ? String(body.issueCategory) : "other",
    dueAt,
    completionNotes: String(body?.completionNotes || "").trim(),
    cancellationReason: String(body?.cancellationReason || "").trim(),
    holdReason: String(body?.holdReason || "").trim(),
    createdBy: { _type: "reference", _ref: actorUserId },
    createdByName: actor?.name || "",
    completedAt: String(body?.status) === "completed" ? now : null,
    createdAt: now,
    updatedAt: now,
  };

  const created = await sanityClient.create(doc as any);

  const postCreateJobs: Promise<unknown>[] = [];

  if (body?.customerRefId) {
    postCreateJobs.push(
      (async () => {
        const customer = await sanityClient.fetch<any>(
          `*[_type=="user" && _id==$id][0]{_id,name,phone}`,
          { id: String(body.customerRefId) },
        );
        if (!customer?.phone) return;
        const requestDate = formatDayDate(now);
        const approachTime = formatApproachTime(dueAt, now);
        const msg = `✅ Service Request Registered

Dear ${customer.name || "Customer"},

Your request for *${title}* has been registered successfully.

🛠️ Assigned Technician: ${tech.name || "Technician"}
📅 Request Date: ${requestDate}

We will approach approximately by *${approachTime}* for inspection/service.

Thank you for trusting Jambh Electrical Services ⚡`;
        await sendViaWaBotServer(String(customer.phone), msg);
      })(),
    );
  }

  postCreateJobs.push(
    notifyWorkTaskEvent({
      actorUserId,
      title: "New work assigned",
      body: `New work assigned: ${title}. Technician: ${tech.name || "Technician"}. Due: ${formatDayDateTime(dueAt)}.`,
      assignedTechnicianId,
      notifyAllTechnicians: true,
    }),
  );

  // Ensure side-effects are actually dispatched in runtime, without making
  // create flow too slow. We wait briefly, then return regardless.
  await Promise.race([
    Promise.allSettled(postCreateJobs),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);
  return NextResponse.json({ success: true, data: created });
}

