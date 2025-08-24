import admin from 'firebase-admin'

// Initialize Firebase Admin SDK once per server runtime
// Supports either a full service account JSON in FIREBASE_SERVICE_ACCOUNT_JSON
// or individual env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
function getServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (json) {
    try {
      return JSON.parse(json)
    } catch {
      // If provided as base64
      try {
        const decoded = Buffer.from(json, 'base64').toString('utf8')
        return JSON.parse(decoded)
      } catch {
        return null
      }
    }
  }
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY
  if (privateKey && privateKey.includes('\n')) {
    // already formatted
  } else if (privateKey) {
    // handle escaped newlines
    privateKey = privateKey.replace(/\\n/g, '\n')
  }
  if (projectId && clientEmail && privateKey) {
    return { project_id: projectId, client_email: clientEmail, private_key: privateKey }
  }
  return null
}

function initAdmin() {
  if (admin.apps.length) return admin.app()
  const sa = getServiceAccount()
  if (!sa) throw new Error('Firebase Admin service account not configured')
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: (sa as any).project_id,
      clientEmail: (sa as any).client_email,
      privateKey: (sa as any).private_key,
    }),
  })
}

export function getAdminApp() {
  return initAdmin()
}

export function getAdminMessaging() {
  const app = getAdminApp()
  return admin.messaging(app)
}
