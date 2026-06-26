import { create } from "zustand"

interface AudioPlaybackState {
  activeUrl: string | null
  pauseFn: (() => void) | null
  setActive: (url: string, fn: () => void) => void
  clearActive: (url: string) => void
}

export const useAudioPlaybackStore = create<AudioPlaybackState>((set, get) => ({
  activeUrl: null,
  pauseFn: null,
  setActive: (url, fn) => {
    const { activeUrl, pauseFn: prevPause } = get()
    if (activeUrl && activeUrl !== url) {
      prevPause?.()
    }
    set({ activeUrl: url, pauseFn: fn })
  },
  clearActive: (url) => {
    const { activeUrl } = get()
    if (activeUrl === url) {
      set({ activeUrl: null, pauseFn: null })
    }
  },
}))
