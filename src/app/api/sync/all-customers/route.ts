import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'

export async function POST(req: NextRequest) {
  try {
    // Get all users from Sanity users table (your custom auth system)
    const allUsers = await sanityClient.fetch(`
      *[_type == "user"] {
        _id,
        name,
        email,
        phone,
        role,
        isActive,
        createdAt,
        updatedAt,
        fcmTokens,
        fcmTokensProd,
        fcmTokensDev,
        customerId,
        clerkId
      } | order(createdAt desc)
    `)

    console.log(`Found ${allUsers.length} users in Sanity database`)

    // Filter for customer role users
    const customerUsers = allUsers.filter(user => user.role === 'customer')
    const customersWithTokens = customerUsers.filter(user => 
      Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0
    )

    return NextResponse.json({
      success: true,
      message: `Found ${customerUsers.length} customers (${customersWithTokens.length} with FCM tokens)`,
      stats: {
        totalUsers: allUsers.length,
        customerUsers: customerUsers.length,
        customersWithTokens: customersWithTokens.length,
        adminUsers: allUsers.filter(user => user.role === 'admin').length
      },
      users: customerUsers.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        tokenCount: Array.isArray(user.fcmTokens) ? user.fcmTokens.length : 0,
        createdAt: user.createdAt
      }))
    })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Server error'
    }, { status: 500 })
  }
}
