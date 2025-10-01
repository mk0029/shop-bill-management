"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BillDetailTrigger } from "@/components/bills/bill-detail-trigger";
import { PaperclipIcon, LinkIcon, ReceiptIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react";
import type { ChatMessage } from "@/lib/chat-api";
import { AttachmentPreviewModal } from "@/components/chat/AttachmentPreviewModal";
import Image from "next/image";

interface CustomerInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  roomId?: string;
  messages?: ChatMessage[]; // optional: when provided, avoids API call for messages
}

interface MediaFile {
  id: string;
  filename: string;
  url: string;
  type: string;
  size: number;
  messageId: string;
  createdAt: string;
}

interface LinkItem {
  id: string;
  url: string;
  text: string;
  messageId: string;
  createdAt: string;
}

interface BillItem {
  _id: string;
  billNumber?: string;
  totalAmount?: number;
  paymentStatus?: string;
  balanceAmount?: number;
  createdAt: string;
}

export function CustomerInfoPopup({ isOpen, onClose, customerId, customerName, roomId, messages: messagesProp }: CustomerInfoPopupProps) {
  const [activeTab, setActiveTab] = useState("media");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [bills, setBills] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{
    _id?: string;
    filename: string;
    size: number;
    type: string;
    url: string;
  } | null>(null);

  // Fetch bills for the customer
  const fetchBills = useCallback(async () => {
    try {
      const billsRes = await fetch(`/api/bill-book/user/${customerId}/list`, { cache: 'no-store' });
      if (billsRes.ok) {
        const billsData = await billsRes.json();
        if (billsData.success && Array.isArray(billsData.data)) {
          const billItems: BillItem[] = (billsData.data as Array<Record<string, unknown>>).map((bill) => ({
            _id: String(bill._id),
            billNumber: bill.billNumber as string | undefined,
            totalAmount: Number((bill.totalAmount as number | string | undefined) ?? 0),
            paymentStatus: bill.paymentStatus as string | undefined,
            balanceAmount: Number((bill.balanceAmount as number | string | undefined) ?? 0),
            createdAt: String(bill.createdAt as string)
          }));
          setBills(billItems);
        } else {
          setBills([]);
        }
      }
    } catch {
      setBills([]);
    }
  }, [customerId]);

  // Fetch messages (fallback path when messages not provided from props)
  const fetchCustomerData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch messages with attachments and content for links
      const [messagesRes] = await Promise.all([
        fetch(`/api/chat/customer/${customerId}/messages`, { cache: 'no-store' })
      ]);

      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        if (messagesData.success) {
          processMessages(messagesData.data);
        }
      }

      await fetchBills();
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId, fetchBills]);

  useEffect(() => {
    if (!isOpen || !customerId) return;
    // If messages are provided via props, process them directly
    if (messagesProp && Array.isArray(messagesProp)) {
      setLoading(true);
      try {
        processMessages(messagesProp);
      } finally {
        setLoading(false);
      }
      // Still fetch bills
      void fetchBills();
    } else {
      // Fallback: attempt to fetch messages via API plus bills
      void fetchCustomerData();
    }
  }, [isOpen, customerId, roomId, messagesProp, fetchBills, fetchCustomerData]);

  const processMessages = (messages: ChatMessage[]) => {
    const mediaFiles: MediaFile[] = [];
    const links: LinkItem[] = [];

    messages.forEach((message) => {
      // Process attachments for media
      if (message.attachments) {
        message.attachments.forEach((attachment) => {
          mediaFiles.push({
            id: attachment._id,
            filename: attachment.filename,
            url: attachment.url,
            type: attachment.type,
            size: attachment.size,
            messageId: message._id,
            createdAt: message.createdAt
          });
        });
      }

      // Extract URLs from message content
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = message.content.match(urlRegex);
      if (matches) {
        matches.forEach((url, index) => {
          links.push({
            id: `${message._id}-${index}`,
            url,
            text: url,
            messageId: message._id,
            createdAt: message.createdAt
          });
        });
      }
    });

    setMediaFiles(mediaFiles);
    setLinks(links);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openPreview = (file: MediaFile) => {
    setPreviewAttachment({
      _id: file.id,
      filename: file.filename,
      size: file.size,
      type: file.type,
      url: file.url,
    });
    setPreviewOpen(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${customerName} - Information`}
      size="lg"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sticky -top-3 z-10">
          <TabsTrigger value="media" className="flex items-center gap-2">
            <PaperclipIcon className="w-4 h-4" />
            Media ({mediaFiles.length})
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Links ({links.length})
          </TabsTrigger>
          <TabsTrigger value="bills" className="flex items-center gap-2">
            <ReceiptIcon className="w-4 h-4" />
            Bills ({bills.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="media" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2">Loading media files...</span>
            </div>
          ) : mediaFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No media files found
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {mediaFiles.map((file) => (
                <div key={file.id} className="border rounded-lg p-3 bg-gray-800 border-gray-700">
                  {file.type.startsWith('image/') ? (
                    <button type="button" onClick={() => openPreview(file)} className="relative group w-full">
                      <Image width={200} height={200}
                        src={file.url}
                        alt={file.filename}
                        className="w-full h-24 object-contain rounded"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                        <ExternalLinkIcon className="w-5 h-5 text-white" />
                      </div>
                    </button>
                  ) : (
                    <div className="w-full h-24 bg-gray-700 rounded flex items-center justify-center">
                      <PaperclipIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  <div className="mt-2">
                    <div className="text-sm font-medium text-white truncate" title={file.filename}>
                      {file.filename}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatFileSize(file.size)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(file.createdAt)}
                    </div>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => openPreview(file)}
                      className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    >
                      View
                    </button>
                    <BillDetailTrigger billId={file.messageId}>
                      <button className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors">
                        View
                      </button>
                    </BillDetailTrigger>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2">Loading links...</span>
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No links found
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link) => (
                <div key={link.id} className="border rounded-lg p-3 bg-gray-800 border-gray-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-blue-400 break-all">
                        {link.url}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(link.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={() => window.open(link.url, '_blank')}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex-shrink-0"
                    >
                      <ExternalLinkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bills" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2">Loading bills...</span>
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No bills found
            </div>
          ) : (
            <div className="space-y-3">
              {bills.map((bill) => {
                const status = bill.paymentStatus?.toLowerCase();
                const statusColors = {
                  paid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                  partial: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                  pending: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                  due: 'bg-red-500/20 text-red-400 border-red-500/30'
                };
                const statusColor = statusColors[status as keyof typeof statusColors] || statusColors.pending;
                
                return (
                <div key={bill._id} className="border rounded-lg p-3 bg-gray-800 border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-white">
                          Bill {bill.billNumber ? `#${bill.billNumber}` : ''}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColor}`}>
                          {status?.toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        ₹{Number(bill.totalAmount || 0).toLocaleString('en-IN')}
                      </div>
                      {status !== 'paid' && bill.balanceAmount && bill.balanceAmount > 0 && (
                        <div className="text-xs text-red-400 mt-0.5">
                          Due: ₹{Number(bill.balanceAmount).toLocaleString('en-IN')}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(bill.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <BillDetailTrigger billId={bill._id}>
                      <button className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors">
                        View
                      </button>
                    </BillDetailTrigger>
                  </div>
                </div>
              )})}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
        attachment={previewAttachment}
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewAttachment(null); }}
      />
    </Modal>
  );
}
