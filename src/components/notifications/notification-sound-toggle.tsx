"use client"

import React from 'react'
import { isSoundEnabled, setSoundEnabled, initSoundOnUserGesture } from '@/lib/notification-sound'

type Props = {
  className?: string
  labelOn?: string
  labelOff?: string
}

export default function NotificationSoundToggle({ className, labelOn = 'Sound: On', labelOff = 'Sound: Off' }: Props) {
  const [enabled, setEnabled] = React.useState<boolean>(false)

  React.useEffect(() => {
    try {
      setEnabled(isSoundEnabled())
    } catch {}
  }, [])

  const onToggle = React.useCallback(() => {
    const next = !enabled
    setEnabled(next)
    setSoundEnabled(next)
    if (next) {
      // Attempt to unlock the AudioContext on a user gesture
      initSoundOnUserGesture()
    }
  }, [enabled])

  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        className ||
        `inline-flex items-center rounded-md border px-3 py-1 text-sm font-medium transition-colors ` +
          (enabled
            ? 'bg-green-600 text-white border-green-700 hover:bg-green-700'
            : 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300')
      }
      aria-pressed={enabled}
      aria-label="Toggle notification sound"
      title="Toggle notification sound"
    >
      {enabled ? labelOn : labelOff}
    </button>
  )
}
