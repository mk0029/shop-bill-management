import type { NextRequest } from "next/server";

const RAW_CHAT_URL =
  process.env.SHOP_CHAT_URL ||
  process.env.NEXT_PUBLIC_SHOP_CHAT_URL ||
  "https://shop-chat-backend.onrender.com/";
const CHAT_API_URL = `${RAW_CHAT_URL.replace(/\/+$/, "")}/chat`;

export type WorkTaskShopChatEventInput = {
  customerId: string;
  taskId: string;
  actorUserId?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  issueCategory?: string;
  dueAt?: string;
  assignedTechnicianName?: string;
  customerName?: string;
  action?: "created" | "updated" | "completed" | "cancelled" | "hold" | "in-progress" | "deleted" | "due_changed";
  createdAt?: string;
  updatedAt?: string;
  completionNotes?: string;
  cancellationReason?: string;
  holdReason?: string;
};

export async function publishWorkTaskShopChatEvent(
  req: NextRequest,
  input: WorkTaskShopChatEventInput,
) {
  const authCookie = req.cookies.get("auth-storage")?.value;
  if (!authCookie || !input.customerId || !input.taskId) return;

  try {
    const response = await fetch(`${CHAT_API_URL}/events/work-task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth-storage=${authCookie}`,
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      console.warn(`Failed to publish work task chat event (${response.status})`);
    }
  } catch (error) {
    console.warn("Failed to publish work task chat event", error);
  }
}
