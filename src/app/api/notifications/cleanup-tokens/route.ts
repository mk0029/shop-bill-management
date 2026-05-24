import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const { tokens } = body || {}
    
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ success: false, error: 'Provide tokens array' }, { status: 400 })
    }

    // Remove invalid tokens from all users
    const query = `*[_type=="user" && defined(fcmTokens) && count(fcmTokens[@ in $invalidTokens]) > 0]{
      _id,
      fcmTokens
    }`
    
    const users = await sanityClient.fetch(query, { invalidTokens: tokens })
    let cleanedCount = 0
    
    for (const user of users || []) {
      const validTokens = (user.fcmTokens || []).filter(token => !tokens.includes(token))
      await sanityClient
        .patch(user._id)
        .set({ fcmTokens: validTokens.length > 0 ? validTokens : null })
        .commit()
      cleanedCount++
    }

    return NextResponse.json({ 
      success: true, 
      cleanedUsers: cleanedCount,
      removedTokens: tokens.length 
    })
  } catch (error) {
    console.error('Cleanup tokens error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    }, { status: 500 })
  }
}

// Also support GET for manual cleanup
export async function GET() {
  try {
    // Get ALL users and their tokens (not just those with tokens)
    const query = `*[_type=="user"]{
      _id,
      name,
      email,
      role,
      fcmTokens,
      isActive
    } | order(role asc, name asc)`
    
    const allUsers = await sanityClient.fetch(query)
    const customerUsers = allUsers.filter((user: any) => user.role === 'customer')
    const customersWithTokens = customerUsers.filter((user: any) => 
      Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0
    )
    
    const tokenStats = {
      totalUsers: allUsers.length,
      customerUsers: customerUsers.length,
      customersWithTokens: customersWithTokens.length,
      totalTokens: customersWithTokens.reduce((sum: number, user: any) => sum + (user.fcmTokens?.length || 0), 0),
      adminUsers: allUsers.filter((user: any) => user.role === 'admin').length
    }

    return NextResponse.json({ 
      success: true, 
      stats: tokenStats,
      users: customerUsers.map((user: any) => ({
        _id: user._id,
        name: user.name,
        tokenCount: user.fcmTokens?.length || 0
      }))
    })
  } catch (error) {
    console.error('Get tokens error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    }, { status: 500 })
  }
}
