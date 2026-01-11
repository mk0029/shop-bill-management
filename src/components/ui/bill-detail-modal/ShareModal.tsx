"use client";

import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Smartphone, Copy } from "lucide-react";

interface ShareModalProps {
  showShareModal: boolean;
  setShowShareModal: (show: boolean) => void;
  onShareOnWhatsApp: () => void;
  onNativeShare: () => void;
  onCopyToClipboard: () => void;
}

export const ShareModal = ({ 
  showShareModal, 
  setShowShareModal, 
  onShareOnWhatsApp, 
  onNativeShare, 
  onCopyToClipboard 
}: ShareModalProps) => {
  return (
    <AnimatePresence>
      {showShareModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowShareModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", duration: 0.2 }}
            className="bg-gray-800 rounded-lg p-6 max-w-sm w-full border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Share Bill</h3>
            <div className="space-y-3">
              <Button
                onClick={onShareOnWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center gap-3"
              >
                <MessageSquare className="w-5 h-5" />
                Share on WhatsApp
              </Button>
              
              <Button
                onClick={onNativeShare}                variant="outline"

                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center gap-3"
              >
                <Smartphone className="w-5 h-5" />
                Native Share
              </Button>
              
              <Button
                onClick={onCopyToClipboard}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center gap-3"
              >
                <Copy className="w-5 h-5" />
                Copy to Clipboard
              </Button>
              
              <Button
                onClick={() => setShowShareModal(false)}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
