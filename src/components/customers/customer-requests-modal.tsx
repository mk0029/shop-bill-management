"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { sanityClient } from "@/lib/sanity"
import { toast } from "sonner"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCustomer } from "@/lib/form-service"
import { useRegistrationRequestStore } from "@/store/registration-request-store"
import {
  Search, RefreshCw, Eye, UserPlus,
  Loader2, User, Mail, Phone, MapPin,
  Tag, Globe, Fingerprint, Shield, Calendar, FileText, AlertTriangle,
  Clock, XCircle,
} from "lucide-react"

interface CustomerRequest {
  _id: string; requestId: string; name: string; phone: string; email: string
  location?: string; nickname?: string; serviceType?: string; company?: string; requestType: string
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled"
  submittedAt: string; expiresAt?: string; resolvedAt?: string
  rejectionReason?: string; customerId?: string; ipAddress?: string
  deviceFingerprint?: string
  cancelledReason?: string; cancelledAt?: string; cancelledBy?: string
  resolvedBy?: { _id: string; name: string }
  customerRef?: { _id: string; name: string; customerId: string }
}

interface CustomerRequestsModalProps {
  isOpen: boolean
  onClose: () => void
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—"
  try { return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) }
  catch { return dateStr }
}

export function CustomerRequestsModal({ isOpen, onClose }: CustomerRequestsModalProps) {
  const [requests, setRequests] = useState<CustomerRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null)
  const [detailData, setDetailData] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createFormData, setCreateFormData] = useState({ name: "", nickname: "", phone: "", email: "", location: "", serviceType: "" })
  const [isCreating, setIsCreating] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateMessage, setDuplicateMessage] = useState("")
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [isRejecting, setIsRejecting] = useState(false)
  const pendingCount = useRegistrationRequestStore((s) => s.pendingCount)
  const fetchRef = useRef<() => void>(() => {})

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("status", "pending")
      if (searchTerm) params.set("search", searchTerm)
      params.set("pageSize", "50")
      params.set("sortOrder", "desc")
      const res = await fetch(`/api/admin/customer-requests?${params}`)
      const data = await res.json()
      if (data.success) {
        setRequests(data.data)
        // Keep the heading count in sync with the list by deriving it from the same
        // response that feeds the rows. The global store count can go stale (e.g. when
        // requests live in the operations/customers DBs, which the primary-only live
        // listener doesn't observe), causing "Registration Requests (1)" with an empty list.
        if (!searchTerm) {
          const next = Number(data?.pagination?.total ?? requests.length)
          useRegistrationRequestStore.getState().setPendingCount(next)
        }
      }
    } catch { toast.error("Failed to load requests") }
    finally { setIsLoading(false) }
  }, [searchTerm])

  useEffect(() => {
    fetchRef.current = fetchRequests
  }, [fetchRequests])

  useEffect(() => {
    if (!isOpen) return
    fetchRequests()
    const sub = sanityClient
      .listen('*[_type == "customerRequest"]', {}, { includeResult: false })
      .subscribe(() => fetchRef.current())
    return () => sub.unsubscribe()
  }, [isOpen, fetchRequests])

  const handleSearch = useCallback(() => {
    setSearchTerm(searchInput)
  }, [searchInput])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, isOpen])

  const openDetails = async (req: CustomerRequest) => {
    setSelectedRequest(req)
    setDetailData(null)
    try {
      const res = await fetch(`/api/admin/customer-requests/${req._id}`)
      const data = await res.json()
      if (data.success) setDetailData(data.data)
    } catch { toast.error("Failed to load details") }
  }

  const handleReject = async () => {
    if (!selectedRequest) return
    setIsRejecting(true)
    try {
      const res = await fetch(`/api/admin/customer-requests/${selectedRequest._id}/reject`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Failed to reject"); return }
      toast.success("Request deleted")
      setShowRejectModal(false)
      setSelectedRequest(null)
      setRejectReason("")
    } catch { toast.error("Network error") }
    finally { setIsRejecting(false) }
  }

  const openCreateModal = (req: CustomerRequest) => {
    setCreateFormData({
      name: req.name,
      nickname: req.nickname || "",
      phone: req.phone.replace(/\D/g, ""),
      email: req.email || "",
      location: req.location || "",
      serviceType: req.serviceType || "",
    })
    setShowCreateModal(true)
  }

  const handleCreateCustomer = async () => {
    if (!selectedRequest) return
    const { name, nickname, phone, email, location } = createFormData
    if (!name.trim() || !phone.trim() || !location.trim()) {
      toast.error("Name, phone, and location are required")
      return
    }

    setIsCreating(true)
    try {
      const result = await createCustomer({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        phone: phone.replace(/\D/g, ""),
        email: email.trim() || undefined,
        location: location.trim(),
      })

      if (!result.success) {
        if (result.code === "DUPLICATE_IDENTITY") {
          setDuplicateMessage(result.error || "A customer with these identity details already exists.")
          setShowDuplicateModal(true)
          setIsCreating(false)
          return
        }
        toast.error(result.error || "Failed to create customer")
        return
      }

      const approveRes = await fetch(`/api/admin/customer-requests/${selectedRequest._id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          nickname: nickname.trim() || undefined,
          phone: phone.replace(/\D/g, ""),
          email: email.trim() || undefined,
          location: location.trim(),
        }),
      })

      if (!approveRes.ok) {
        const approveData = await approveRes.json().catch(() => ({}))
        if (approveData?.code === "DUPLICATE_IDENTITY") {
          setDuplicateMessage(approveData.error || "A customer with these identity details already exists. Request has been cancelled.")
          setShowDuplicateModal(true)
          setIsCreating(false)
          return
        }
      }

      toast.success(`Customer "${name}" created and request approved!`)
      setShowCreateModal(false)
      setSelectedRequest(null)
    } catch {
      toast.error("Network error")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen && !selectedRequest} onClose={onClose} title={`Registration Requests${pendingCount > 0 ? ` (${pendingCount})` : ""}`} size="lg">
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8C0CC]/50" />
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search by name, email, phone..."
                className="glass-input w-full rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder:text-[#B8C0CC]/50 border border-white/10 focus:border-sky-400/30 focus:outline-none transition-colors" />
            </div>
            <button onClick={() => fetchRequests()} className="p-2.5 rounded-xl border border-white/10 text-[#B8C0CC]/50 hover:text-white transition-all"><RefreshCw className="w-4 h-4" /></button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto space-y-1.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-sky-400" /></div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FileText className="w-10 h-10 text-[#B8C0CC]/20 mx-auto mb-3" />
                <p className="text-white/70 text-sm font-medium mb-1">No Pending Registration Requests</p>
                <p className="text-[#B8C0CC]/50 text-xs max-w-xs mx-auto leading-relaxed">All customer registration requests have been reviewed. New requests will appear here automatically.</p>
              </div>
            ) : requests.map((req) => (
              <div key={req._id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => openDetails(req)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium truncate">{req.name}</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border text-amber-400 bg-amber-400/10 border-amber-400/20">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#B8C0CC]/50 mt-0.5">
                    <span>{req.email}</span>
                    <span>{req.phone}</span>
                    <span>{formatDate(req.submittedAt)}</span>
                  </div>
                </div>
                <Eye className="w-4 h-4 text-[#B8C0CC]/30 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Request Detail Modal */}
      <Modal isOpen={!!selectedRequest && !showRejectModal && !showCreateModal && !showDuplicateModal} onClose={() => setSelectedRequest(null)} title="Request Details" size="md">
        {selectedRequest && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border text-amber-400 bg-amber-400/10 border-amber-400/20">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Pending</span>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#B8C0CC]/60 uppercase tracking-wider mb-3">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoField icon={<User className="w-4 h-4" />} label="Name" value={selectedRequest.name} />
                <InfoField icon={<Mail className="w-4 h-4" />} label="Email" value={selectedRequest.email} />
                <InfoField icon={<Phone className="w-4 h-4" />} label="Phone" value={selectedRequest.phone} />
                <InfoField icon={<MapPin className="w-4 h-4" />} label="Location" value={selectedRequest.location} />
                <InfoField icon={<Tag className="w-4 h-4" />} label="Request Type" value={selectedRequest.requestType} />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#B8C0CC]/60 uppercase tracking-wider mb-3">Registration Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoField icon={<Calendar className="w-4 h-4" />} label="Submitted At" value={formatDate(selectedRequest.submittedAt)} />
                <InfoField icon={<FileText className="w-4 h-4" />} label="Request ID" value={selectedRequest.requestId} />
                <InfoField icon={<Globe className="w-4 h-4" />} label="Source" value="Website" />
                <InfoField icon={<Fingerprint className="w-4 h-4" />} label="Device" value={selectedRequest.deviceFingerprint || "N/A"} />
                <InfoField icon={<Shield className="w-4 h-4" />} label="IP" value={selectedRequest.ipAddress || "N/A"} />
              </div>
            </div>

            {selectedRequest.status === "pending" && (
              <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-white/[0.06]">
                <Button onClick={() => openCreateModal(selectedRequest)}
                  className="glass-button-primary flex-1 h-11 rounded-xl text-sky-200 font-semibold gap-2">
                  <UserPlus className="w-4 h-4" /> Create Customer
                </Button>
                <Button onClick={() => setShowRejectModal(true)}
                  className="glass-button h-11 rounded-xl text-rose-300 font-medium border border-rose-400/20 gap-2 hover:bg-rose-950/30">
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Customer Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Customer" size="sm">
        <div className="space-y-5">
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-[#B8C0CC] mb-1.5 block">Full Name *</Label>
              <Input value={createFormData.name} onChange={(e) => setCreateFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="Enter customer name" className="bg-white/[0.04] border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-sm text-[#B8C0CC] mb-1.5 block">Nickname</Label>
              <Input value={createFormData.nickname} onChange={(e) => setCreateFormData(p => ({ ...p, nickname: e.target.value }))}
                placeholder="Enter nickname" className="bg-white/[0.04] border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-sm text-[#B8C0CC] mb-1.5 block">Phone *</Label>
              <Input value={createFormData.phone} onChange={(e) => setCreateFormData(p => ({ ...p, phone: e.target.value }))}
                placeholder="Enter phone number" className="bg-white/[0.04] border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-sm text-[#B8C0CC] mb-1.5 block">Email</Label>
              <Input value={createFormData.email} onChange={(e) => setCreateFormData(p => ({ ...p, email: e.target.value }))}
                placeholder="Enter email" className="bg-white/[0.04] border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-sm text-[#B8C0CC] mb-1.5 block">Location *</Label>
              <Input value={createFormData.location} onChange={(e) => setCreateFormData(p => ({ ...p, location: e.target.value }))}
                placeholder="Enter location" className="bg-white/[0.04] border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-sm text-[#B8C0CC] mb-1.5 block">Service Type</Label>
              <Input value={createFormData.serviceType} onChange={(e) => setCreateFormData(p => ({ ...p, serviceType: e.target.value }))}
                placeholder="e.g. repair, sale, installation" className="bg-white/[0.04] border-white/10 text-white" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={handleCreateCustomer} disabled={isCreating}
              className="glass-button-primary flex-1 h-11 rounded-xl text-sky-200 font-semibold gap-2">
              {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><UserPlus className="w-4 h-4" /> Create Customer</>}
            </Button>
            <Button onClick={() => setShowCreateModal(false)}
              className="glass-button h-11 rounded-xl text-[#B8C0CC] border border-white/10 gap-2">Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Duplicate Identity Error Modal */}
      <Modal isOpen={showDuplicateModal} onClose={() => setShowDuplicateModal(false)} title="Duplicate Customer Detected" size="sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
            <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-300">Customer Creation Cancelled</p>
              <p className="text-sm text-[#B8C0CC]">{duplicateMessage}</p>
              <p className="text-xs text-[#B8C0CC]/50">A customer already exists with one or more of the identity details entered. Customer creation has been cancelled to protect data integrity.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowDuplicateModal(false)}
              className="glass-button flex-1 h-11 rounded-xl text-[#B8C0CC] border border-white/10 gap-2">Close</Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => { setShowRejectModal(false); setRejectReason("") }} title="Reject & Delete Request" size="sm">
        <div className="space-y-5">
          <p className="text-sm text-[#B8C0CC]">This will permanently delete the registration request.</p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#E5E7EB]">Reason (optional)</label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
              placeholder="e.g. Duplicate, incomplete information..."
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white border border-white/10 resize-none placeholder:text-[#B8C0CC]/40" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleReject} disabled={isRejecting}
              className="glass-button flex-1 h-11 rounded-xl text-rose-300 font-medium border border-rose-400/20 gap-2 hover:bg-rose-950/30">
              {isRejecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><XCircle className="w-4 h-4" /> Confirm Delete</>}
            </Button>
            <Button onClick={() => { setShowRejectModal(false); setRejectReason("") }}
              className="glass-button h-11 rounded-xl text-[#B8C0CC] border border-white/10 gap-2">Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function InfoField({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <div className="mt-0.5 text-[#B8C0CC]/40 shrink-0">{icon}</div>
      <div className="min-w-0"><p className="text-xs text-[#B8C0CC]/50 mb-0.5">{label}</p><p className="text-sm text-white/90 truncate">{value || "—"}</p></div>
    </div>
  )
}
