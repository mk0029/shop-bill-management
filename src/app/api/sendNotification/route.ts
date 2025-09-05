/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { GoogleAuth } from 'google-auth-library'

export const runtime = 'nodejs'

function getGoogleAuth(): GoogleAuth {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (json) {
    const credentials = JSON.parse(json)
    return new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    })
  }
  return new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  })
}

async function getAccessToken(auth: GoogleAuth): Promise<string> {
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  if (typeof token === 'string') return token
  if (token && typeof token === 'object' && (token as any).token) return (token as any).token
  throw new Error('Unable to acquire Google OAuth2 access token')
}

function buildFcmV1Message({ token, title, body, data }: { token: string; title: string; body: string; data?: Record<string, any> }) {
  const sanitizedData: Record<string, string> = {}
  if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data)) {
      sanitizedData[k] = typeof v === 'string' ? v : JSON.stringify(v)
    }
  }
  return {
    message: {
      token,
      notification: { title, body },
      data: sanitizedData,
    },
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const token: string | undefined = body?.token
    const title: string | undefined = body?.title
    const msgBody: string | undefined = body?.body
    const data: Record<string, any> | undefined = body?.data

    if (!token) return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'token is required' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'title is required' }, { status: 400 })
    if (!msgBody) return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'body is required' }, { status: 400 })

    const auth = getGoogleAuth()
    const accessToken = await getAccessToken(auth)

    const projectId = process.env.PROJECT_ID || (() => {
      try {
        const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
        if (json) return JSON.parse(json)?.project_id as string | undefined
        return undefined
      } catch {
        return undefined
      }
    })()

    if (!projectId) {
      return NextResponse.json({ error: 'CONFIG_ERROR', message: 'PROJECT_ID not configured' }, { status: 500 })
    }

    const payload = buildFcmV1Message({ token, title, body: msgBody, data })
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const json = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      return NextResponse.json(json, { status: resp.status })
    }

    return NextResponse.json(json, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
