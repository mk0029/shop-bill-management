import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const { userId, clerkId, customerId, name, email } = body || {}
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Provide userId' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await sanityClient.fetch(
      `*[_type=="user" && _id == $userId][0]`,
      { userId }
    )

    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'User already exists in database' 
      })
    }

    // Create new customer user
    const newUser = {
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

    const result = await sanityClient.create(newUser)
    
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
