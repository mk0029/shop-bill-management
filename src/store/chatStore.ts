import { useChatStore as base } from "@/store/chat-store";
import { useCallback, useMemo } from "react";

type ChatStoreShape = {
  selectedChat: string | null;
  setLastForPeer: (peer: string, payload: any) => void;
  setOrMergeById: (messageId: string, patch: any) => void;
};

export function useChatStore<T>(selector?: (state: ChatStoreShape) => T): T | ChatStoreShape {
  const activeRoomId = base((s) => s.activeRoomId);

  const setOrMergeById = useCallback((messageId: string, patch: any) => {
    const snapshot = base.getState().messagesByRoomId || {};
    const rooms = Object.keys(snapshot);
    const touched: string[] = [];

    for (const roomId of rooms) {
      const list = snapshot[roomId] || [];
      if (list.some((m) => m._id === messageId)) touched.push(roomId);
    }

    if (touched.length === 0) return;

    base.setState((st) => {
      const next = { ...st.messagesByRoomId };
      for (const roomId of touched) {
        next[roomId] = (st.messagesByRoomId[roomId] || []).map((m) =>
          m._id === messageId ? ({ ...m, ...(patch || {}) } as any) : m,
        );
      }
      return { messagesByRoomId: next };
    });
  }, []);

  const mapped = useMemo<ChatStoreShape>(
    () => ({
      selectedChat: activeRoomId,
      setLastForPeer: () => {},
      setOrMergeById,
    }),
    [activeRoomId, setOrMergeById],
  );

  return selector ? selector(mapped) : mapped;
}
