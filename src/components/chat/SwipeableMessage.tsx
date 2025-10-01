import { ChatMessage } from "@/lib/chat-api";
import { motion, PanInfo, useAnimation } from "framer-motion";
import { Check, CheckCheck, Clock, File, Download, Play, ZoomIn, MoreVertical } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { AttachmentPreviewModal } from "@/components/chat/AttachmentPreviewModal";
import { AudioPlayer } from "@/components/chat/AudioPlayer";

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
  uploadProgress?: Record<string, number>; // Upload progress for attachments
  groupPosition?: 'single' | 'first' | 'middle' | 'last'; // Position in message group
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
  actor,
  uploadProgress = {},
  groupPosition = 'single'
}: SwipeableMessageProps) {
  const controls = useAnimation();
  const constraintsRef = useRef(null);
  const dragX = useRef(0);

  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

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
            className={`text-sm px-2.5 py-1.5 border shadow-md leading-[120%] ${
              isSelf
                ? 'bg-emerald-500 text-white border-emerald-600'
                : 'bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100'
            } ${
              // Dynamic border radius based on group position
              groupPosition === 'single'
                ? isSelf
                  ? 'rounded-xl rounded-br-sm' // Single message from self
                  : 'rounded-2xl rounded-bl-sm' // Single message from other
                : groupPosition === 'first'
                ? isSelf
                  ? 'rounded-xl rounded-br-md' // First in group from self (less rounded bottom-right)
                  : 'rounded-2xl rounded-bl-md' // First in group from other (less rounded bottom-left)
                : groupPosition === 'middle'
                ? isSelf
                  ? 'rounded-lg rounded-br-md' // Middle in group from self (minimal rounding)
                  : 'rounded-lg rounded-bl-md' // Middle in group from other (minimal rounding)
                : // groupPosition === 'last'
                  isSelf
                  ? 'rounded-xl rounded-tr-md' // Last in group from self (less rounded top-right)
                  : 'rounded-2xl rounded-tl-md' // Last in group from other (less rounded top-left)
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
            <div className="whitespace-pre-wrap leading-[120%]">{message.content}</div>
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2">
                {/* Group images together */}
                {(() => {
                  const images = (message.attachments || []).filter(a => a.type?.startsWith('image/'));
                  const nonImages = (message.attachments || []).filter(a => !a.type?.startsWith('image/'));
                  
                  return (
                    <>
                      {/* Image Grid (WhatsApp style with Flexbox) */}
                      {images.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {images.map((attachment, idx) => {
                            // Check if uploading by looking at uploadProgress
                            const isUploading = attachment._id && uploadProgress[attachment._id] !== undefined && uploadProgress[attachment._id] < 100;
                            const progress = attachment._id ? uploadProgress[attachment._id] || 0 : 0;
                            
                            // Calculate flex basis and width based on image count and position
                            let flexBasis = '100%';
                            let maxWidth = '100%';
                            
                            if (images.length === 1) {
                              // Single image: full width but constrained
                              flexBasis = '100%';
                              maxWidth = 'min(400px, 100%)';
                            } else if (images.length === 2) {
                              // Two images: 50% each
                              flexBasis = 'calc(50% - 2px)';
                              maxWidth = 'calc(50% - 2px)';
                            } else if (images.length === 3) {
                              // Three images: 2 on top (50% each), 1 full width bottom
                              if (idx < 2) {
                                flexBasis = 'calc(50% - 2px)';
                                maxWidth = 'calc(50% - 2px)';
                              } else {
                                flexBasis = '100%';
                                maxWidth = '100%';
                              }
                            } else if (images.length === 4) {
                              // Four images: 2x2 grid (50% each)
                              flexBasis = 'calc(50% - 2px)';
                              maxWidth = 'calc(50% - 2px)';
                            } else if (images.length === 5) {
                              // Five images: 2-2-1 layout
                              if (idx < 4) {
                                flexBasis = 'calc(50% - 2px)';
                                maxWidth = 'calc(50% - 2px)';
                              } else {
                                flexBasis = '100%';
                                maxWidth = '100%';
                              }
                            } else if (images.length === 6) {
                              // Six images: 3x2 grid (33.33% each)
                              flexBasis = 'calc(33.333% - 3px)';
                              maxWidth = 'calc(33.333% - 3px)';
                            } else if (images.length === 7) {
                              // Seven images: 3-3-1 layout
                              if (idx < 6) {
                                flexBasis = 'calc(33.333% - 3px)';
                                maxWidth = 'calc(33.333% - 3px)';
                              } else {
                                flexBasis = '100%';
                                maxWidth = '100%';
                              }
                            } else if (images.length === 8) {
                              // Eight images: 3-3-2 layout
                              if (idx < 6) {
                                flexBasis = 'calc(33.333% - 3px)';
                                maxWidth = 'calc(33.333% - 3px)';
                              } else {
                                flexBasis = 'calc(50% - 2px)';
                                maxWidth = 'calc(50% - 2px)';
                              }
                            } else if (images.length === 9) {
                              // Nine images: 3x3 grid (33.33% each)
                              flexBasis = 'calc(33.333% - 3px)';
                              maxWidth = 'calc(33.333% - 3px)';
                            } else {
                              // 10+ images: 3 columns, last row flexible
                              const isLastRow = idx >= Math.floor(images.length / 3) * 3;
                              const remainingInLastRow = images.length % 3;
                              
                              if (isLastRow && remainingInLastRow === 1 && idx === images.length - 1) {
                                flexBasis = '100%';
                                maxWidth = '100%';
                              } else if (isLastRow && remainingInLastRow === 2) {
                                flexBasis = 'calc(50% - 2px)';
                                maxWidth = 'calc(50% - 2px)';
                              } else {
                                flexBasis = 'calc(33.333% - 3px)';
                                maxWidth = 'calc(33.333% - 3px)';
                              }
                            }
                            
                            return (
                              <div 
                                key={idx} 
                                className={`relative rounded-lg overflow-hidden border p-1 ${idx===0&&images.length===1&&'!min-w-[150px]'} ${
                                  isSelf ? 'border-slate-500/70 bg-white/10 backdrop-blur-sm' : 'border-zinc-300 dark:border-zinc-500/50'
                                }`}
                                style={{
                                  flexBasis,
                                  maxWidth,
                                  aspectRatio: images.length === 1 ? 'auto' : '1/1',
                                  // Responsive heights for mobile and desktop
                                  maxHeight: images.length === 1 ? 'clamp(200px, 40vw, 280px)' : 'clamp(100px, 25vw, 160px)',
                                  minHeight: images.length === 1 ? 'clamp(100px, 20vw, 140px)' : 'clamp(80px, 15vw, 120px)'
                                }}
                              >
                                {attachment.url && !attachment.url.startsWith('blob:') ? (
                                  <>
                                    <Image
                                      src={attachment.url}
                                      alt={attachment.filename}
                                      width={240}
                                      height={240}
                                      className={` cursor-pointer hover:opacity-90 transition-opacity object-contain  ${idx !== 0 ? 'absolute size-[90%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ' size-full'}`}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                      onClick={() => openPreview(attachment as ChatAttachment)}
                                    />
                                    {/* Upload Progress Overlay - only show if actively uploading */}
                                    {isUploading && progress > 0 && progress < 100 && (
                                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                                        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-2" />
                                        <div className="text-white text-sm font-medium">{Math.round(progress)}%</div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="w-full h-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                                    <div className="text-zinc-400 text-xs">
                                      {isUploading ? `${Math.round(progress)}%` : (attachment.url?.startsWith('blob:') ? 'Image expired' : 'Loading...')}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Zoom button on hover */}
                                {attachment.url && !isUploading && (
                                  <button
                                    onClick={() => openPreview(attachment as ChatAttachment)}
                                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                                    title="View fullscreen"
                                  >
                                    <ZoomIn className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Other attachments (audio, video, pdf, etc.) */}
                      {nonImages.map((attachment, idx) => {
                        const isVideo = attachment.type?.startsWith('video/') || false;
                        const isAudio = attachment.type?.startsWith('audio/') || false;
                        const isPdf = attachment.type === 'application/pdf';

                        // Check if uploading by looking at uploadProgress
                        const isUploading = attachment._id && uploadProgress[attachment._id] !== undefined && uploadProgress[attachment._id] < 100;
                        const progress = attachment._id ? uploadProgress[attachment._id] || 0 : 0;

                        return (
                    <div key={idx} className={`border rounded-lg p-2 md:p-3 relative ${
                      isSelf 
                        ? 'bg-emerald-600/40 border-emerald-400/30 backdrop-blur-sm' 
                        : 'bg-zinc-100 dark:bg-zinc-600/30 border-zinc-300 dark:border-zinc-500/50'
                    }`}>
                      {/* Upload Progress Overlay */}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex flex-col items-center justify-center z-10">
                          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-2" />
                          <div className="text-white text-sm font-medium">{Math.round(progress)}%</div>
                        </div>
                      )}
                      {!attachment.url && isUploading && (
                        <div style={{ width: '100%', height: `${Math.max(50, Math.min(200, attachment.size / 1000))}px`, backgroundColor: '#e2e8f0' }} className="rounded-lg flex items-center justify-center">
                          <div className="text-zinc-500">Uploading...</div>
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

                      {isAudio && (
                        <div>
                          {attachment.url ? (
                            <AudioPlayer 
                              src={attachment.url} 
                              isSelf={isSelf}
                              filename={attachment.filename}
                            />
                          ) : (
                            <div className={`flex items-center gap-3 min-w-[220px] p-3 rounded-lg ${
                              isSelf ? 'bg-white/10' : 'bg-zinc-200 dark:bg-zinc-700'
                            }`}>
                              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-emerald-500" />
                              <div className={`text-sm ${isSelf ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                {isUploading ? `Uploading audio... ${Math.round(progress)}%` : 'Processing audio...'}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Show disabled message indicator for audio errors */}
                      {isAudio && !attachment.url && (
                        <div className={`mb-2 p-2 rounded text-xs ${
                          isSelf ? 'bg-red-500/20 text-white/80' : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        }`}>
                          ⚠️ Audio file unavailable
                        </div>
                      )}

                      {!isVideo && !isPdf && !isAudio && (
                        <div className="mb-2 flex items-center gap-2 p-2 bg-white/5 rounded border border-white/10">
                          <File className="w-4 h-4 text-white/60" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{attachment.filename}</div>
                          </div>
                        </div>
                      )}

                      {/* Three-dot menu for non-audio attachments */}
                      {!isAudio && (
                        <div className="flex items-center justify-end relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === attachment._id ? null : attachment._id || `${idx}`)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="Options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {menuOpen === (attachment._id || `${idx}`) && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-8 z-20 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 min-w-[140px]">
                                <button
                                  onClick={() => {
                                    handleDownload(attachment as ChatAttachment);
                                    setMenuOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2 text-zinc-700 dark:text-zinc-200"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                    </>
                  );
                })()}
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
