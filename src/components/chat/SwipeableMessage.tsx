import { ChatMessage } from "@/lib/chat-api";
import { motion, PanInfo, useAnimation } from "framer-motion";
import { Check, CheckCheck, Clock, File, Download, Play, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { AttachmentPreviewModal } from "@/components/chat/AttachmentPreviewModal";

interface ChatAttachment {
  _id?: string;
  filename: string;
  size: number;
  type: string;
  url: string;
}

type SwipeableMessageProps = {
  message: ChatMessage;
  isSelf: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  parentMessage?: ChatMessage | null;
  onView?: () => void;
  showSenderName?: boolean;
  senderName?: string;
  actor?: "admin" | "customer";
};

export function SwipeableMessage({
  message,
  isSelf,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  parentMessage,
  onView,
  showSenderName = false,
  senderName,
  actor
}: SwipeableMessageProps) {
  const controls = useAnimation();
  const constraintsRef = useRef(null);
  const dragX = useRef(0);

  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);

  const handleDownload = async (attachment: ChatAttachment) => {
    if (!attachment || !attachment.url) return;

    try {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.filename || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const toggleVideoPlay = (attachmentId: string, url: string) => {
    if (playingVideo === attachmentId) {
      setPlayingVideo(null);
    } else {
      setPlayingVideo(attachmentId);
    }
  };

  const openPreview = (attachment: ChatAttachment) => {
    setPreviewAttachment(attachment);
    setPreviewOpen(true);
  };

  // no-op: AttachmentPreviewModal handles its own UX

  const renderPreviewModal = () => (
    <AttachmentPreviewModal
      attachment={previewAttachment}
      isOpen={previewOpen}
      onClose={() => { setPreviewOpen(false); setPreviewAttachment(null); setPlayingVideo(null); }}
    />
  );

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 80; // Reduced threshold for easier swiping
    const verticalThreshold = 20; // Very small threshold to prevent accidental vertical swipes

    // Block vertical scrolling during horizontal swipes
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y) * 2) {
      // Horizontal swipe takes precedence
      if (info.offset.x < -threshold) {
        // Swipe left to reply
        onSwipeLeft?.();
      } else if (info.offset.x > threshold && isSelf) {
        // Swipe right to edit (only for own messages)
        onSwipeRight?.();
      }
    } else if (Math.abs(info.offset.y) > verticalThreshold) {
      // Vertical swipes - just for scrolling, no action
      // We'll let the scroll container handle this
    }

    // Always return to original position with smooth animation
    controls.start({
      x: 0,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
        bounce: 0.2
      }
    });
  };

  const renderMessage = () => (
    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
      <div className="relative max-w-[75%] w-full overflow-hidden" ref={constraintsRef}>
        <motion.div
          drag="x"
          dragConstraints={constraintsRef}
          onDragEnd={handleDragEnd}
          animate={controls}
          dragElastic={0.1}
          dragMomentum={false}
          className={`relative z-10 w-fit ${isSelf ? 'ml-auto' : 'mr-auto'}`}
          style={{ x: dragX.current, touchAction: 'pan-y' }}
          onClick={onView}
        >
          <div
            className={`text-sm px-2 py-1 border shadow-sm leading-[120%] ${
              isSelf
                ? 'bg-emerald-600/90 text-white border-emerald-700 rounded-2xl rounded-br-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-white/90 dark:text-zinc-100 rounded-2xl rounded-bl-sm'
            }`}
          >
            {(message.parentMessage || parentMessage) && (
              <div className={`mb-1 border-l-2 pl-2 mt-1 text-xs ${isSelf ? 'border-white/40 text-white/85' : 'border-zinc-400 text-zinc-200'}`}>
                <div className="opacity-80">Replying to</div>
                <div className="line-clamp-2 whitespace-pre-wrap ">
                  {message.parentMessage?.content || parentMessage?.content}
                </div>
              </div>
            )}
            <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
            {message.attachments && message.attachments.length > 0 && message.status !== 'pending' && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment, idx) => {
                  const isVideo = attachment.type?.startsWith('video/') || false;
                  const isImage = attachment.type?.startsWith('image/') || false;
                  const isPdf = attachment.type === 'application/pdf';

                  return (
                    <div key={idx} className="border rounded-lg p-2 bg-white/10 dark:bg-zinc-800/50 border-white/20 dark:border-zinc-600/50">
                      {isImage && attachment.url && (
                        <div className="mb-2 relative group">
                          <Image
                            src={attachment.url}
                            alt={attachment.filename}
                            width={200}
                            height={200}
                            className="w-full max-w-xs max-h-48 object-cover rounded border border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                            onClick={() => openPreview(attachment as ChatAttachment)}
                          />
                          <button
                            onClick={() => openPreview(attachment as ChatAttachment)}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="View fullscreen"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {isVideo && attachment.url && (
                        <div className="mb-2 relative group">
                          <div className="relative">
                            <video
                              src={attachment.url}
                              className="w-full max-w-xs max-h-48 object-cover rounded border border-white/10 cursor-pointer"
                              controls={playingVideo !== attachment._id}
                              onClick={() => toggleVideoPlay(attachment._id || `video-${idx}`, attachment.url)}
                            />
                            {playingVideo !== attachment._id && (
                              <button
                                onClick={() => toggleVideoPlay(attachment._id || `video-${idx}`, attachment.url)}
                                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded hover:bg-black/30 transition-colors"
                              >
                                <Play className="w-8 h-8 text-white" />
                              </button>
                            )}
                            <button
                              onClick={() => openPreview(attachment as ChatAttachment)}
                              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              title="View fullscreen"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {isPdf && attachment.url && (
                        <div className="mb-2">
                          <iframe
                            src={attachment.url}
                            className="w-full max-w-xs h-48 border border-white/10 rounded"
                            title={attachment.filename}
                          />
                        </div>
                      )}

                      {!isImage && !isVideo && !isPdf && (
                        <div className="mb-2 flex items-center gap-2 p-2 bg-white/5 rounded border border-white/10">
                          <File className="w-4 h-4 text-white/60" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{attachment.filename}</div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(attachment as ChatAttachment)}
                          className="text-xs px-2 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors flex items-center gap-1"
                          title="Download"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className={`flex items-center gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-[11px] ${isSelf ? 'text-white/80' : 'opacity-70'}`}>
                {new Date(message.createdAt as string).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                {showSenderName && senderName && (
                  <span className="ml-1 font-medium">
                    • {senderName}
                  </span>
                )}
              </span>
              {message.editedAt && <span className={`text-[10px] italic ml-auto ${isSelf ? 'text-white/70' : 'opacity-60'}`}>edited</span>}
              {isSelf && (
                <span className="inline-flex items-center gap-1">
                  {message.status === 'seen' ? (
                    <CheckCheck className="w-3 h-3 text-sky-300" />
                  ) : message.status === 'delivered' ? (
                    <CheckCheck className="w-3 h-3 text-white/80" />
                  ) : message.status === 'pending' ? (
                    <Clock className="w-3 h-3 text-white/80" />
                  ) : (
                    <Check className="w-3 h-3 text-white/80" />
                  )}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );

  return (
    <>
      {renderMessage()}
      {renderPreviewModal()}
    </>
  );
}
