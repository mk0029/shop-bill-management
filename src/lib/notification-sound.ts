/*
  Notification sound utility for foreground messages
  - Persists user preference in localStorage
  - Initializes an AudioContext on first user gesture
  - Plays a short synthesized tone (no audio file needed)
*/

let audioCtx: AudioContext | null = null
let unlocked = false

const LS_KEY = 'notification_sound_enabled'

export function isSoundEnabled(): boolean {
  try {
    const v = localStorage.getItem(LS_KEY)
    if (v === null) return false
    return v === '1'
  } catch {
    return false
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(LS_KEY, enabled ? '1' : '0')
  } catch {}
}

// Must be called from a user gesture (click/tap) to unlock audio on mobile
export function initSoundOnUserGesture(): void {
  try {
    if (unlocked) return
    if (!audioCtx) {
      const w = window as unknown as Window & { webkitAudioContext?: { new (): AudioContext } }
      const Ctor = window.AudioContext || w.webkitAudioContext
      if (Ctor) audioCtx = new Ctor()
    }
    // Some platforms need a silent resume to unlock
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    unlocked = !!audioCtx
  } catch {
    // ignore
  }
}

export async function playNotificationSound(): Promise<void> {
  try {
    if (!isSoundEnabled()) return
    if (!audioCtx) {
      const w = window as unknown as Window & { webkitAudioContext?: { new (): AudioContext } }
      const Ctor = window.AudioContext || w.webkitAudioContext
      if (Ctor) audioCtx = new Ctor()
    }
    if (!audioCtx) return
    if (audioCtx.state === 'suspended') {
      try { await audioCtx.resume() } catch {}
    }

    const duration = 0.25 // seconds
    const now = audioCtx.currentTime

    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    // Nice short chirp
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now) // A5
    osc.frequency.exponentialRampToValueAtTime(1760, now + duration) // to A6

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    osc.connect(gain).connect(audioCtx.destination)
    osc.start(now)
    osc.stop(now + duration)
  } catch {
    // ignore
  }
}
