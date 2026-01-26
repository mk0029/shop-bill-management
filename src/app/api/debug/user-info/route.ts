import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const { userId, clerkId, customerId } = body || {}
    
    if (!userId && !clerkId && !customerId) {
      return NextResponse.json({ success: false, error: 'Provide userId, clerkId, or customerId' }, { status: 400 })
    }

    // Search for user by multiple possible identifiers in your custom auth system
    const queries = []
    if (userId) queries.push(`*[_type=="user" && _id == $userId]`)
    if (clerkId) queries.push(`*[_type=="user" && clerkId == $clerkId]`)
    if (customerId) queries.push(`*[_type=="user" && customerId == $customerId]`)

    const combinedQuery = `{
      "byId": ${queries[0] || '[]'},
      "byClerkId": ${queries[1] || '[]'},
      "byCustomerId": ${queries[2] || '[]'}
    }`

    const results = await sanityClient.fetch(combinedQuery, { userId, clerkId, customerId })
    
    // Find the first match
    let userData = null
    let foundBy = null
    
    if (results.byId?.length > 0) {
      userData = results.byId[0]
      foundBy = 'id'
    } else if (results.byClerkId?.length > 0) {
      userData = results.byClerkId[0]
      foundBy = 'clerkId'
    } else if (results.byCustomerId?.length > 0) {
      userData = results.byCustomerId[0]
      foundBy = 'customerId'
    }

    if (!userData) {
      return NextResponse.json({ 
        success: true, 
        found: false,
        searched: { userId, clerkId, customerId }
      })
    }

    return NextResponse.json({ 
      success: true, 
      found: true,
      foundBy,
      userData: {
        _id: userData._id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        fcmTokens: userData.fcmTokens,
        isActive: userData.isActive
      },
      hasTokens: Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0,
      tokenCount: userData.fcmTokens?.length || 0
    })
  } catch (error) {
    console.error('User debug error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    }, { status: 500 })
  }
}
