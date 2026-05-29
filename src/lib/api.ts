import { reactToMessage as reactApi } from "@/lib/chat-api";
import { useAuthStore } from "@/store/auth-store";

export async function reactToMessage(_token: string, messageId: string, emoji: string) {
  const user = useAuthStore.getState().user as { _id?: string; id?: string; name?: string } | null;
  const userId = String(user?._id || user?.id || "");
  return await reactApi({ messageId, userId, userName: user?.name || "User", emoji });
}
