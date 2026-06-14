/*
  Notification sound utility for foreground messages
  - Persists user preference in localStorage
  - Initializes an AudioContext on first user gesture
  - Plays a short synthesized tone (no audio file needed)
*/

let audioCtx: AudioContext | null = null
let unlocked = false

const LS_KEY = 'notification_sound_enabled'
const TONE_KEY = 'notification_sound_tone'

type NotificationTone = 'Default' | 'Soft' | 'Alert' | 'Chime' | 'Urgent' | 'Silent'

function normalizeTone(tone?: string | null): NotificationTone {
  const value = String(tone || '').trim()
  if (value === 'Soft' || value === 'Alert' || value === 'Chime' || value === 'Urgent' || value === 'Silent') {
    return value
  }
  return 'Default'
}

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

export function getNotificationTone(): NotificationTone {
  try {
    return normalizeTone(localStorage.getItem(TONE_KEY))
  } catch {
    return 'Default'
  }
}

export function setNotificationTone(tone: string): void {
  try {
    localStorage.setItem(TONE_KEY, normalizeTone(tone))
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

export async function playNotificationSound(tone?: string): Promise<void> {
  try {
    if (!isSoundEnabled()) return
    const selectedTone = normalizeTone(tone || getNotificationTone())
    if (selectedTone === 'Silent') return
    if (!audioCtx) {
      const w = window as unknown as Window & { webkitAudioContext?: { new (): AudioContext } }
      const Ctor = window.AudioContext || w.webkitAudioContext
      if (Ctor) audioCtx = new Ctor()
    }
    if (!audioCtx) return
    if (audioCtx.state === 'suspended') {
      try { await audioCtx.resume() } catch {}
    }

    const toneMap: Record<Exclude<NotificationTone, 'Silent'>, { start: number; end: number; duration: number; type: OscillatorType; gain: number }> = {
      Default: { start: 880, end: 1760, duration: 0.25, type: 'sine', gain: 0.2 },
      Soft: { start: 660, end: 990, duration: 0.18, type: 'sine', gain: 0.12 },
      Alert: { start: 740, end: 1480, duration: 0.3, type: 'triangle', gain: 0.22 },
      Chime: { start: 1046, end: 1568, duration: 0.22, type: 'sine', gain: 0.16 },
      Urgent: { start: 988, end: 1976, duration: 0.35, type: 'square', gain: 0.18 },
    }
    const config = toneMap[selectedTone]
    const duration = config.duration
    const now = audioCtx.currentTime

    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    osc.type = config.type
    osc.frequency.setValueAtTime(config.start, now)
    osc.frequency.exponentialRampToValueAtTime(config.end, now + duration)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(config.gain, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    osc.connect(gain).connect(audioCtx.destination)
    osc.start(now)
    osc.stop(now + duration)
  } catch {
    // ignore
  }
}
