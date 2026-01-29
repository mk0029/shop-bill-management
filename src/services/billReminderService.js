// Bill Reminder Service for frontend
const API_BASE = process.env.REACT_APP_API_URL || '/api'

/**
 * Send bill reminder to customer
 * @param {Object} options - Reminder options
 * @param {string} options.billId - Bill ID (optional)
 * @param {string} options.customerId - Customer ID (optional)
 * @param {string} options.customMessage - Custom message (optional)
 * @returns {Promise<Object>} - Send result
 */
export async function sendBillReminder({ billId, customerId, customMessage }) {
  try {
    const response = await fetch(`${API_BASE}/bill-reminder/send-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-notify-secret': process.env.REACT_APP_NOTIFY_SECRET || '',
      },
      body: JSON.stringify({
        billId,
        customerId,
        customMessage
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `Failed to send reminder: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Bill reminder service error:', error)
    throw error
  }
}

/**
 * Get overdue bills
 * @returns {Promise<Object>} - Overdue bills list
 */
export async function getOverdueBills() {
  try {
    const response = await fetch(`${API_BASE}/bill-reminder/overdue`, {
      method: 'GET',
      headers: {
        'x-notify-secret': process.env.REACT_APP_NOTIFY_SECRET || '',
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `Failed to get overdue bills: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Get overdue bills error:', error)
    throw error
  }
}

/**
 * Get upcoming due bills
 * @param {number} days - Days ahead to look (default: 7)
 * @returns {Promise<Object>} - Upcoming bills list
 */
export async function getUpcomingBills(days = 7) {
  try {
    const response = await fetch(`${API_BASE}/bill-reminder/upcoming?days=${days}`, {
      method: 'GET',
      headers: {
        'x-notify-secret': process.env.REACT_APP_NOTIFY_SECRET || '',
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `Failed to get upcoming bills: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Get upcoming bills error:', error)
    throw error
  }
}

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency
 */
export function formatCurrency(amount) {
  if (typeof amount !== 'number') return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Calculate days until due
 * @param {string} dueDate - Due date string
 * @returns {Object} - Days calculation and status
 */
export function getDaysUntilDue(dueDate) {
  const due = new Date(dueDate)
  const now = new Date()
  const diffTime = due - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return {
    days: diffDays,
    isOverdue: diffDays < 0,
    isDueToday: diffDays === 0,
    isDueSoon: diffDays > 0 && diffDays <= 3,
    text: diffDays < 0 ? `${Math.abs(diffDays)} days overdue` : 
          diffDays === 0 ? 'Due today' : 
          diffDays === 1 ? 'Due tomorrow' : 
          `${diffDays} days`
  }
}
