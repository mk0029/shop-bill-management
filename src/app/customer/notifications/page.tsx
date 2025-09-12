"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CustomerNotificationsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/customer/bills")
  }, [router])
  return null
}
