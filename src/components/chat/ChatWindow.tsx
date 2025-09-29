"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useChatStore } from "@/store/chat-store";
import { SwipeableMessage } from "./SwipeableMessage";
import { SendHorizontalIcon, PaperclipIcon, XIcon } from "lucide-react";
import { BillDetailTrigger } from "../bills/bill-detail-trigger";
import type { ChatMessage } from "@/lib/chat-api";
import { motion } from "framer-motion";

// Utility function to format date headers
const getFormattedDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if the date is today
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  // Check if the date is yesterday
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  // For older dates, return in DD/MM/YYYY format
  return date.toLocaleDateString('en-GB'); // This will format as DD/MM/YYYY
};

type Props = {
  roomId: string;
  senderId: string;
  actor: "admin" | "customer";
};

export default function ChatWindow({ roomId, senderId, actor }: Props) {
  const { messagesByRoomId, fetchMessages, sendMessage, markRead, markMessageSeen, rooms, editMessage } = useChatStore();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [seenQueue, setSeenQueue] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map());
  type LiteBill = { 
    _id: string; 
    billNumber?: string; 
    totalAmount?: number; 
    createdAt: string;
    paymentStatus?: string;
    status?: string;
    paidAmount?: number;
    balanceAmount?: number;
  };
  const [bills, setBills] = useState<LiteBill[]>([]);
  const [attachments, setAttachments] = useState<Array<{ file: File; preview?: string; id: string }>>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const messages = useMemo(() => messagesByRoomId[roomId] || [], [messagesByRoomId, roomId]);

  const customerId = useMemo(() => {
    const r = (rooms || []).find((x) => x._id === roomId);
    return r?.customer?._id;
  }, [rooms, roomId]);

  useEffect(() => {
    fetchMessages(roomId).then(() => {
      markRead(roomId, actor);
      // Auto-scroll to bottom when chat loads
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Handle scroll detection for scroll-to-bottom button
  useEffect(() => {
    const scrollContainer = listRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Fetch bills for this room's customer and keep a lightweight list
  useEffect(() => {
    let alive = true;
    if (!customerId) return;
    (async () => {
      try {
        const res = await fetch(`/api/bill-book/user/${encodeURIComponent(customerId)}/list`, { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        if (json?.success && Array.isArray(json.data)) {
          const list: LiteBill[] = (json.data as Array<Record<string, unknown>>).map((b) => {
            const paymentStatusUnknown = (b as { paymentStatus?: unknown }).paymentStatus;
            const statusUnknown = (b as { status?: unknown }).status;
            return {
              _id: String(b._id as string),
              billNumber: b.billNumber as string | undefined,
              totalAmount: Number((b.totalAmount as number | string | undefined) ?? 0),
              createdAt: String(b.createdAt as string),
              paymentStatus: typeof paymentStatusUnknown === 'string' ? paymentStatusUnknown : undefined,
              status: typeof statusUnknown === 'string' ? statusUnknown : undefined,
              paidAmount: typeof (b as { paidAmount?: unknown }).paidAmount === 'number' ? (b as { paidAmount?: unknown }).paidAmount as number : Number(((b as { paidAmount?: unknown }).paidAmount as string) || 0),
              balanceAmount: typeof (b as { balanceAmount?: unknown }).balanceAmount === 'number' ? (b as { balanceAmount?: unknown }).balanceAmount as number : Number(((b as { balanceAmount?: unknown }).balanceAmount as string) || 0),
            };
          });
          setBills(list);
        } else {
          setBills([]);
        }
      } catch { setBills([]); }
    })();
    return () => { alive = false; };
  }, [customerId]);

  // Realtime: listen to bill documents for this customer and update timeline immediately
  useEffect(() => {
    if (!customerId) return;
    // TODO: Implement real-time bill updates when sanityClient is available
    // For now, we'll rely on the initial fetch
    return () => {};
  }, [customerId]);

  // Auto scroll to bottom on messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    type MessageItem = { 
      kind: 'msg'; 
      createdAt: string; 
      m: ChatMessage;
    };

    type BillItem = { 
      kind: 'bill'; 
      createdAt: string; 
      b: LiteBill;
    };

    type GroupedItem = MessageItem | BillItem;
    
    const groups: Record<string, GroupedItem[]> = {};
    
    // Combine and sort all items (messages and bills)
    const msgItems: MessageItem[] = messages.map(m => ({
      kind: 'msg' as const,
      createdAt: m.createdAt as string,
      m
    }));
    
    const billItems: BillItem[] = bills.map(b => ({
      kind: 'bill' as const,
      createdAt: b.createdAt,
      b
    }));
    
    // Combine and sort all items by date
    const allItems = [...msgItems, ...billItems].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Group by date
    allItems.forEach(item => {
      const dateKey = new Date(item.createdAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    return Object.entries(groups).map(([date, items]) => ({
      date,
      formattedDate: getFormattedDate(date),
      items: items.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    }));
  }, [messages, bills]);

  // Helper: compute normalized bill status
  const getBillStatus = useCallback((b: LiteBill): string => {
    const stored = (b.paymentStatus || b.status || '').toLowerCase();
    if (stored) {
      // Normalize 'draft' to 'pending' for display
      if (stored === 'draft') return 'pending';
      // Prefer stored value to avoid flip-flops when numbers momentarily look stale
      return stored;
    }
    // Fallback to derived from numeric fields when no stored status
    const total = Number(b.totalAmount || 0);
    const paid = Number(b.paidAmount || 0);
    const bal = b.balanceAmount != null ? Number(b.balanceAmount) : (total - paid);
    if (Number.isFinite(bal)) {
      if (bal <= 0) return 'paid';
      if (bal > 0 && paid > 0) return 'partial';
      return 'pending';
    }
    if (total > 0 && paid >= total) return 'paid';
    if (paid > 0 && paid < total) return 'partial';
    return 'pending';
  }, []);

  // Helper: get Tailwind classes for bill status (pending=yellow, paid=green, partial=orange, due/overdue=red)
  const getBillStatusClasses = useCallback((b: LiteBill) => {
    const raw = getBillStatus(b);
    if (raw === 'paid') {
      return {
        container: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700',
        textMuted: 'text-emerald-700 dark:text-emerald-300',
        button: 'border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white',
        title: 'text-emerald-900 dark:text-emerald-200',
        badge: 'bg-emerald-600 text-white',
        badgeText: 'PAID',
      } as const;
    }
    if (raw === 'partial') {
      return {
        container: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700',
        textMuted: 'text-orange-700 dark:text-orange-300',
        button: 'border-orange-500 text-orange-700 dark:text-orange-300 hover:bg-orange-600 hover:text-white',
        title: 'text-orange-900 dark:text-orange-200',
        badge: 'bg-orange-500 text-white',
        badgeText: 'PARTIAL',
      } as const;
    }
    if (raw === 'pending') {
      return {
        container: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700',
        textMuted: 'text-yellow-700 dark:text-yellow-300',
        button: 'border-yellow-500 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-600 hover:text-white',
        title: 'text-yellow-900 dark:text-yellow-200',
        badge: 'bg-yellow-500 text-black',
        badgeText: 'PENDING',
      } as const;
    }
    if (raw === 'due' || raw === 'overdue') {
      return {
        container: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
        textMuted: 'text-red-700 dark:text-red-300',
        button: 'border-red-500 text-red-700 dark:text-red-300 hover:bg-red-600 hover:text-white',
        title: 'text-red-900 dark:text-red-200',
        badge: 'bg-red-600 text-white',
        badgeText: 'DUE',
      } as const;
    }
    return {
      container: 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
      textMuted: 'text-zinc-500 dark:text-zinc-400',
      button: 'border-zinc-400 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-700 hover:text-white',
      title: 'text-zinc-900 dark:text-zinc-100',
      badge: 'bg-zinc-600 text-white',
      badgeText: 'BILL',
    } as const;
  }, [getBillStatus]);

  // Queue mechanism for processing seen messages
  const processSeenQueue = useCallback(async () => {
    if (seenQueue.size === 0) return;
    
    const messagesToProcess = Array.from(seenQueue);
    setSeenQueue(new Set());
    
    // Process in batches to avoid overwhelming the API
    for (const messageId of messagesToProcess) {
      try {
        await markMessageSeen(roomId, messageId);
      } catch (error) {
        console.error('Failed to mark message as seen:', messageId, error);
      }
    }
  }, [seenQueue, roomId, markMessageSeen]);

  // Process queue every 2 seconds
  useEffect(() => {
    const interval = setInterval(processSeenQueue, 2000);
    return () => clearInterval(interval);
  }, [processSeenQueue]);

  // Intersection Observer for message visibility
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId) {
              const message = messages.find(m => m._id === messageId);
              if (message) {
                const isSelf = getMsgSenderId(message) === senderId;
                if (!isSelf && message.status !== 'seen') {
                  setSeenQueue(prev => new Set([...prev, messageId]));
                }
              }
            }
          }
        });
      },
      {
        threshold: [0.6],
        rootMargin: '0px 0px -20px 0px'
      }
    );

    // Observe all message elements
    messageRefs.current.forEach((element) => {
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [messages, senderId, markMessageSeen, roomId]);

  // Register message element for observation
  const registerMessageRef = useCallback((messageId: string, element: HTMLElement | null) => {
    if (element) {
      messageRefs.current.set(messageId, element);
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    } else {
      messageRefs.current.delete(messageId);
    }
  }, []);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const newAttachments = Array.from(files).map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      id: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  }, []);

  const uploadFileWithProgress = (file: File, attachmentId: string): Promise<{ _id: string; filename: string; size: number; type: string; url: string }> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(prev => ({ ...prev, [attachmentId]: percentComplete }));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (!result || !result.assetId || !result.url) {
              reject(new Error(`Invalid upload response for ${file.name}`));
            } else {
              resolve({
                _id: result.assetId,
                filename: file.name,
                size: file.size,
                type: file.type,
                url: result.url
              });
            }
          } catch (_error) {
            reject(new Error(`Failed to parse response for ${file.name}`));
          }
        } else {
          reject(new Error(`Upload failed for ${file.name}: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error(`Network error while uploading ${file.name}`));
      });

      xhr.open('POST', '/api/upload/chat');
      xhr.send(formData);
    });
  };

  const onSend = async () => {
    const content = text.trim();
    if (!content && (attachments?.length || 0) === 0) return;

    const currentEditing = editingId;
    const currentReply = replyingTo;
    setText("");
    setEditingId(null);
    setReplyingTo(null);

    if (currentEditing) {
      await editMessage(roomId, currentEditing, content);
      return;
    }

    try {
      // Upload attachments first if any
      let uploadedAttachments: Array<{ _id: string; filename: string; size: number; type: string; url: string }> = [];
      if ((attachments?.length || 0) > 0) {
        setUploadingFiles(new Set(attachments.map(a => a.id)));

        const uploadPromises = attachments.map(async (attachment) => {
          setUploadingFiles(prev => new Set([...prev, attachment.id]));

          try {
            const result = await uploadFileWithProgress(attachment.file, attachment.id);

            // Mark file as uploaded
            setUploadingFiles(prev => {
              const newSet = new Set(prev);
              newSet.delete(attachment.id);
              return newSet;
            });

            return result;
          } catch (error) {
            // Mark file as failed
            setUploadingFiles(prev => {
              const newSet = new Set(prev);
              newSet.delete(attachment.id);
              return newSet;
            });
            throw error;
          }
        });

        uploadedAttachments = await Promise.all(uploadPromises);
        setUploadingFiles(new Set());
      }

      // Include parent message details when replying
      const parentMessage = currentReply ? {
        _id: currentReply._id,
        content: currentReply.content,
        sender: currentReply.sender
      } : undefined;

      // Send message with attachments - content can be empty if attachments exist
      await sendMessage(roomId, content, senderId, actor === "customer", currentReply?._id, parentMessage, uploadedAttachments);

      // Clear attachments after successful send
      setAttachments([]);
      setUploadProgress({});
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the text if there was an error
      if (!currentEditing) {
        setText(content);
      }
    }
  };

  const getMsgSenderId = (m: ChatMessage): string | undefined => {
    if (!m?.sender) return undefined;
    const s = m.sender as { _id?: string; _ref?: string };
    return s._id ?? s._ref;
  };


  return (
    <div className="flex flex-col h-full relative">
      <div ref={listRef} className="flex flex-col grow overflow-y-auto pr-1">
        <div className="space-y-4">
          {groupedMessages.map((group, groupIndex) => (
            <div key={`group-${groupIndex}`} className="space-y-2">
              <div className="sticky top-0  flex justify-center z-50">
                <div className="bg-white dark:bg-zinc-800 px-3 py-1 rounded-full text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                  {group.formattedDate}
                </div>
              </div>
              {group.items.map((item, idx) => {
                if (item.kind === 'bill') {
                  const b = item.b;
                  const status = getBillStatus(b);
                  const billCls = getBillStatusClasses(b);
                  const total = Number(b.totalAmount ?? 0);
                  const paid = Number(b.paidAmount ?? 0);
                  const due = Number(
                    b.balanceAmount != null ? b.balanceAmount : Math.max(0, total - paid)
                  );
                  // Button label based on actor and status
                  const buttonLabel = actor === 'admin'
                    ? (status === 'paid' ? 'View' : 'Update')
                    : (status === 'paid' ? 'View' : 'Pay Now');
                  return (
                    <div key={`bill-${b._id}-${idx}`} className="flex justify-start w-full">
                      <div className={`max-w-[90%] md:max-w-[80%] border rounded-md p-3 ${billCls.container}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className={`text-sm font-semibold ${billCls.title}`}>
                              Bill Created of ₹{Number(b.totalAmount ?? 0).toLocaleString('en-IN')}
                            </div>
                            <div className={`text-xs ${billCls.textMuted}`}>
                              {new Date(item.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                            {/* Status-specific details */}
                            {status === 'partial' && (
                              <div className="mt-1 flex items-center gap-2 text-[11px]">
                                <span className="font-medium text-emerald-600 dark:text-emerald-300">Paid ₹{paid.toLocaleString('en-IN')}</span>
                                <span className="opacity-50">•</span>
                                <span className="font-medium text-orange-600 dark:text-orange-300">Due ₹{due.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {status === 'pending' && due > 0 && (
                              <div className="mt-1 text-[11px] font-medium text-yellow-700 dark:text-yellow-300">
                                Pending ₹{due.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${billCls.badge}`}>{(status || '').toUpperCase()}</span> */}
                            <BillDetailTrigger 
                              bill={b}
                              buttonLabel={buttonLabel}
                              variant="outline"
                              size="sm"
                              className={`h-8 ${billCls.button}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                const m = item.m;
                if (!m) return null;
                
                // In admin view: ALL admin messages appear on right, customer messages on left
                // In customer view: only own messages appear on right
                const msgSenderId = getMsgSenderId(m);
                let isSelf: boolean;
                
                if (actor === "admin") {
                  // For admin view: determine if message is from admin or customer
                  // Check if the sender is the customer for this room
                  const room = rooms.find(r => r._id === roomId);
                  const customerId = room?.customer?._id;
                  const isFromCustomer = msgSenderId === customerId;
                  
                  isSelf = !isFromCustomer; // All admin messages appear on right, customer messages on left
                } else {
                  // For customer view: only own messages appear on right
                  isSelf = msgSenderId === senderId;
                }
                
                // Determine if we should show sender names and get sender name
                const room = rooms.find(r => r._id === roomId);
                const customerId = room?.customer?._id;
                const isFromCustomer = msgSenderId === customerId;
                
                // Get unique admin senders in this chat (excluding customer)
                const adminSenders = messages
                  .filter(msg => {
                    const sId = getMsgSenderId(msg);
                    return sId && sId !== customerId;
                  })
                  .map(msg => getMsgSenderId(msg))
                  .filter((id, index, arr) => arr.indexOf(id) === index);
                
                const hasMultipleAdmins = adminSenders.length > 1;
                const shouldShowSenderName = hasMultipleAdmins && !isFromCustomer;
                
                // Get sender name from message sender object
                let senderName: string | undefined;
                if (shouldShowSenderName && m.sender) {
                  const sender = m.sender as { _id?: string; _ref?: string; name?: string };
                  senderName = sender.name || `Admin ${msgSenderId?.slice(-4)}`;
                }
                const parent = m.parentId ? messages.find((x) => x._id === m.parentId) : undefined;

                return (
                  <motion.div
                    key={`m-${m._id}-${idx}`}
                    ref={(el) => registerMessageRef(m._id, el)}
                    data-message-id={m._id}
                    initial={{ 
                      opacity: 0, 
                      x: isSelf ? 100 : -100, // Slide from right for sent, left for received
                      scale: 0.95 
                    }}
                    animate={{ 
                      opacity: 1, 
                      x: 0, 
                      scale: 1 
                    }}
                    transition={{ 
                      duration: 0.4, 
                      ease: "easeOut",
                      delay: idx * 0.05,
                      type: "spring",
                      stiffness: 100,
                      damping: 15
                    }}
                    whileInView={{ 
                      opacity: 1, 
                      x: 0,
                      transition: { duration: 0.3, ease: "easeOut" }
                    }}
                    viewport={{ once: false, margin: "-50px" }}
                  >
                    <SwipeableMessage
                      message={m}
                      isSelf={isSelf}
                      parentMessage={parent}
                      showSenderName={shouldShowSenderName}
                      senderName={senderName}
                      actor={actor}
                      onView={() => {}} // No longer needed, handled by observer
                      onSwipeLeft={() => {
                        // Allow replying to any message, including your own
                        setReplyingTo(m);
                        setEditingId(null);
                        const input = document.getElementById('message-input');
                        input?.focus();
                      }}
                      onSwipeRight={() => {
                        // Swipe right to edit (only for own messages)
                        if (isSelf) {
                          setEditingId(m._id);
                          setReplyingTo(null);
                          setText(m.content as string);
                          // Focus the input after a short delay to ensure it's rendered
                          setTimeout(() => {
                            const input = document.getElementById('message-input');
                            input?.focus();
                          }, 100);
                        }
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="border rounded-md p-6 text-center opacity-70">No messages yet</div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll to bottom button with animation */}
      <div className={`absolute bottom-20 right-4 z-10 transition-all duration-300 ease-in-out transform ${
        showScrollButton 
          ? 'translate-y-0 opacity-100 scale-100' 
          : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
      }`}>
        <button
          onClick={scrollToBottom}
          className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="Scroll to latest message"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>

      {replyingTo && (
        <div className="px-4 pt-2 border-t dark:border-zinc-700">
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 text-sm flex justify-between items-center">
            <div className="truncate">
              <span className="text-emerald-500">Replying to: </span>
              <span className="text-zinc-400 truncate">
                {typeof replyingTo?.content === 'string' ? 
                  replyingTo.content.slice(0, 50) + 
                  (replyingTo.content.length > 50 ? '...' : '') : ''}
              </span>
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {editingId && (
        <div className="mt-1 border rounded-md p-2 bg-blue-50 dark:bg-zinc-800/60 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">Editing message</div>
            <button 
              className="opacity-70 hover:opacity-100" 
              onClick={() => { 
                setEditingId(null); 
                setText("");
                // Focus the input after clearing
                const input = document.getElementById('message-input');
                input?.focus();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Global Upload Status */}
      {uploadingFiles.size > 0 && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                Uploading {uploadingFiles.size} file{uploadingFiles.size > 1 ? 's' : ''}...
              </span>
            </div>
            <div className="flex items-center gap-2">
              {Array.from(uploadingFiles).map(id => {
                const progress = uploadProgress[id] || 0;
                return (
                  <div key={id} className="flex items-center gap-1">
                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 min-w-[3ch] text-right">
                      {Math.round(progress)}%
                    </span>
                  </div>
                );

              })}
            </div>
          </div>
        </div>
      )}
      {/* Attachment Preview */}
      {(attachments?.length || 0) > 0 && (
        <div className="px-4 py-2 border-t dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => {
              const isUploading = uploadingFiles.has(attachment.id);
              const progress = uploadProgress[attachment.id] || 0;

              return (
                <div key={attachment.id} className="relative group border rounded-lg p-2 bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600">
                  {attachment.preview ? (
                    <img
                      src={attachment.preview}
                      alt={attachment.file.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center bg-zinc-100 dark:bg-zinc-600 rounded">
                      <PaperclipIcon className="w-6 h-6 text-zinc-400" />
                    </div>
                  )}

                  {/* Upload Progress Overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded flex flex-col items-center justify-center">
                      <div className="w-full px-2 mb-2">
                        <div className="w-full bg-white/20 rounded-full h-1">
                          <div
                            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-white text-xs font-medium">{Math.round(progress)}%</span>
                    </div>
                  )}

                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isUploading}
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 truncate w-16" title={attachment.file.name}>
                    {attachment.file.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="mt-1 flex items-center gap-2 border-t p-1">
        {replyingTo && (
          <div className="absolute bottom-full left-0 right-0 bg-zinc-100 dark:bg-zinc-800 p-2 text-sm border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
            <div className="truncate max-w-[calc(100%-24px)]">
              <span className="font-medium">Replying to:</span> {replyingTo?.content}
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
        )}
        <input
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.txt"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded cursor-pointer transition-colors">
          <PaperclipIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        </label>
        <input
          id="message-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={replyingTo ? 'Type your reply...' : 'Type a message...'}
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-base focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button
          disabled={text.trim() === '' && (attachments?.length || 0) === 0 || uploadingFiles.size > 0}
          className="px-2 py-1 rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-50 flex items-center gap-1"
          onClick={onSend}
        >
          {uploadingFiles.size > 0 && (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {editingId ? 'Update' : <SendHorizontalIcon />}
        </button>
      </div>
    </div>
  );
}
