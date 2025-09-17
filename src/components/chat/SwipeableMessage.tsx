import { ChatMessage } from "@/lib/chat-api";
import { motion, PanInfo, useAnimation } from "framer-motion";
import { Check, CheckCheck, Clock } from "lucide-react";
import { useRef } from "react";

type SwipeableMessageProps = {
  message: ChatMessage;
  isSelf: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  parentMessage?: ChatMessage | null;
  onView?: () => void;
};

export function SwipeableMessage({ 
  message, 
  isSelf, 
  onSwipeLeft, 
  onSwipeRight,
  parentMessage,
  onView
}: SwipeableMessageProps) {
  const controls = useAnimation();
  const constraintsRef = useRef(null);
  const dragX = useRef(0);

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

  return (
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
            <div className={`flex items-center gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-[11px] ${isSelf ? 'text-white/80' : 'opacity-70'}`}>
                {/* {new Date(message.createdAt as string).toLocaleString()} */}
                {new Date(message.createdAt as string).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
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
}
