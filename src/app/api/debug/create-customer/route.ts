import { NextRequest, NextResponse } from 'next/server'
import { createDocument } from '@/lib/sanity/write-router'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const { userId, clerkId, customerId, name, email } = body || {}
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Provide userId' }, { status: 400 })
    }

    // Create new customer user
    const newUser: Record<string, unknown> = {
      _type: 'user',
      _id: userId,
      clerkId: clerkId || userId,
      customerId: customerId || userId,
      name: name || 'Customer',
      email: email || '',
      phone: '',
      role: 'customer',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fcmTokens: null,
      fcmTokensProd: null,
      fcmTokensDev: null
    }

    const result = await createDocument(newUser, 'users', { documentId: userId })
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: result,
      message: 'Customer account created successfully'
    })
  } catch (error) {
    console.error('Create customer error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Server error'
    }, { status: 500 })
  }
}
