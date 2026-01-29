import React, { useState } from 'react'
import { sendBillReminder } from '../services/billReminderService'
import { formatCurrency, getDaysUntilDue } from '../services/billReminderService'

const BillReminderButton = ({ bill, customer, onSent, className = '' }) => {
  const [loading, setLoading] = useState(false)
  const [showCustomMessage, setShowCustomMessage] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [result, setResult] = useState(null)

  const handleSendReminder = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await sendBillReminder({
        billId: bill?._id,
        customerId: customer?._id,
        customMessage: customMessage || undefined
      })

      setResult(response)
      if (onSent) onSent(response)
      
      // Reset form
      setCustomMessage('')
      setShowCustomMessage(false)
      
    } catch (error) {
      setResult({ 
        ok: false, 
        error: error.message 
      })
    } finally {
      setLoading(false)
    }
  }

  const daysUntilDue = bill?.dueDate ? getDaysUntilDue(bill.dueDate) : null
  const isOverdue = daysUntilDue?.isOverdue
  const isDueSoon = daysUntilDue?.isDueSoon

  return (
    <div className={`bill-reminder ${className}`}>
      <button
        onClick={() => setShowCustomMessage(!showCustomMessage)}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          isOverdue 
            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
            : isDueSoon 
            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
        disabled={loading}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending...
          </>
        ) : (
          <>
            💬 Send Reminder
          </>
        )}
      </button>

      {daysUntilDue && (
        <div className={`mt-2 text-sm ${
          isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-gray-600'
        }`}>
          {daysUntilDue.text}
        </div>
      )}

      {showCustomMessage && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Custom Message (Optional)</h4>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Enter custom message for the customer..."
            className="w-full p-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          
          {bill && (
            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
              <div className="text-sm text-gray-600">
                <div><strong>Bill:</strong> {bill.billNumber}</div>
                <div><strong>Amount:</strong> {formatCurrency(bill.totalAmount)}</div>
                {bill.balanceAmount && bill.balanceAmount > 0 && (
                  <div><strong>Balance:</strong> {formatCurrency(bill.balanceAmount)}</div>
                )}
                {bill.dueDate && (
                  <div><strong>Due:</strong> {new Date(bill.dueDate).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSendReminder}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reminder'}
            </button>
            <button
              onClick={() => {
                setShowCustomMessage(false)
                setCustomMessage('')
                setResult(null)
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className={`mt-4 p-3 rounded-md ${
          result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {result.ok ? (
            <div>
              <strong>✅ Reminder sent successfully!</strong>
              {result.results && result.results.length > 0 && (
                <div className="mt-2 text-sm">
                  {result.results.map((r, i) => (
                    <div key={i}>
                      Bill {r.billNumber}: 
                      {r.email?.ok && <span className="ml-1">✉️ Email sent</span>}
                      {r.whatsapp?.ok && <span className="ml-1">💬 WhatsApp sent</span>}
                      {r.email?.skipped && r.whatsapp?.skipped && <span className="ml-1 text-gray-500">No contact info</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <strong>❌ Failed to send reminder</strong>
              <div className="text-sm mt-1">{result.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BillReminderButton
