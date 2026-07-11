"use client"

import { useEffect, useRef } from "react"
import { useRegistrationRequestStore, initializeRegistrationListener, destroyRegistrationListener } from "@/store/registration-request-store"

export function useRegistrationRealtime() {
  const pendingCount = useRegistrationRequestStore((s) => s.pendingCount)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    initializeRegistrationListener()
    return () => {
      destroyRegistrationListener()
      initRef.current = false
    }
  }, [])

  return { pendingCount }
}
