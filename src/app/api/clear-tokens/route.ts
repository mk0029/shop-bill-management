import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get current user
    const userQuery = `*[_type=="user" && (clerkId == $userId || customerId == $userId || _id == $userId)][0]{
      _id,
      fcmTokens,
      fcmTokensProd,
      fcmTokensDev
    }`

    const user = await sanityClient.fetch(userQuery, { userId })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Clear all tokens
    const updateData = {
      fcmTokens: [],
      fcmTokensProd: [],
      fcmTokensDev: []
    }

    await sanityClient
      .patch(user._id)
      .set(updateData)
      .commit()

    return NextResponse.json({ 
      success: true, 
      message: 'All tokens cleared successfully',
      previousTokens: {
        fcmTokens: user.fcmTokens || [],
        fcmTokensProd: user.fcmTokensProd || [],
        fcmTokensDev: user.fcmTokensDev || []
      }
    })

  } catch (error) {
    console.error('Clear tokens error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
