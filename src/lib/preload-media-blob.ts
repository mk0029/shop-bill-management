import { cacheMediaBlob, getCachedMediaBlob } from "./chat-cache"
import { ShopChatMessage } from "./shop-chat/types"

const pendingFetches = new Set<string>()

async function preloadSingle(url: string, mimeType: string): Promise<void> {
  if (pendingFetches.has(url)) return
  pendingFetches.add(url)
  try {
    const cached = await getCachedMediaBlob(url)
    if (cached) return
    const resp = await fetch(url)
    if (!resp.ok) return
    const data = await resp.arrayBuffer()
    await cacheMediaBlob(url, data, mimeType)
  } catch {
  } finally {
    pendingFetches.delete(url)
  }
}

export function preloadMediaFromMessages(messages: ShopChatMessage[]): void {
  for (const msg of messages) {
    const media = msg.media
    if (!media?.url) continue
    if (media.url.startsWith("blob:") || media.url.startsWith("data:")) continue
    const mime = media.mimeType || "application/octet-stream"
    setTimeout(() => preloadSingle(media.url, mime), 0)
  }
}
