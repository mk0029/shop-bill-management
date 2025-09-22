"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useChatStore } from "@/store/chat-store";
import { SwipeableMessage } from "./SwipeableMessage";
import { SendHorizontalIcon } from "lucide-react";
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
  type LiteBill = { _id: string; billNumber?: string; totalAmount?: number; createdAt: string };
  const [bills, setBills] = useState<LiteBill[]>([]);

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
          const list: LiteBill[] = (json.data as Array<Record<string, unknown>>).map((b) => ({
            _id: String(b._id as string),
            billNumber: b.billNumber as string | undefined,
            totalAmount: Number((b.totalAmount as number | string | undefined) ?? 0),
            createdAt: String(b.createdAt as string),
          }));
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
      b: { _id: string; billNumber?: string; totalAmount?: number; createdAt: string };
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

  const onSend = async () => {
    const content = text.trim();
    if (!content) return;
    const currentEditing = editingId;
    const currentReply = replyingTo;
    setText("");
    setEditingId(null);
    setReplyingTo(null);
    if (currentEditing) {
      await editMessage(roomId, currentEditing, content);
      return;
    }
    
    // Include parent message details when replying
    const parentMessage = currentReply ? {
      _id: currentReply._id,
      content: currentReply.content,
      sender: currentReply.sender
    } : undefined;
    
    await sendMessage(roomId, content, senderId, actor === "customer", currentReply?._id, parentMessage);
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
              <div className="sticky top-0 z-10 flex justify-center">
                <div className="bg-white dark:bg-zinc-800 px-3 py-1 rounded-full text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                  {group.formattedDate}
                </div>
              </div>
              {group.items.map((item, idx) => {
                if (item.kind === 'bill') {
                  const b = item.b;
                  return (
                    <div key={`bill-${b._id}-${idx}`} className="flex justify-start w-full">
                      <div className="max-w-[90%] md:max-w-[80%] border rounded-md p-3 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-medium">
                              Bill Created of   ₹{Number(b.totalAmount ?? 0).toLocaleString('en-IN')}
                              {/* {b.billNumber ? `#${b.billNumber}` : 'Draft'} */}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {new Date(item.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                           
                            <BillDetailTrigger 
                              bill={b}
                              buttonLabel="View"
                              variant="outline"
                              size="sm"
                              className="h-8"
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
          className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="Scroll to latest message"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <button disabled={text.trim() === ''} className="px-2 py-1 rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-50" onClick={onSend}>{editingId ? 'Update' : <SendHorizontalIcon />}</button>
      </div>
    </div>
  );
}

