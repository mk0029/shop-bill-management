// FCM disabled: provide no-op stubs so imports remain safe
export type Messaging = unknown

export function getFirebaseConfig() {
  return {}
}

export function getFirebaseApp() {
  // no-op
}

export async function getMessagingIfSupported(): Promise<Messaging | null> {
  return null
}
