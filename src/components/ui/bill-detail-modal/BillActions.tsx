"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

interface BillActionsProps {
  showShareButton: boolean;
  onShare: () => void;
  onCheckAllBills: () => void;
}

export const BillActions = ({ showShareButton, onShare, onCheckAllBills }: BillActionsProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {showShareButton && (
        <>
          <Button
            variant="outline"
            onClick={onCheckAllBills}
            className="w-full flex-1 border-gray-300 text-gray-200 hover:bg-gray-800 hover:text-white"
          >
            Check all bills
          </Button>
          <Button
            variant="outline"
            onClick={onShare}
            className="w-full flex-1 border-green-300 text-green-500 hover:bg-green-800 hover:text-white"
          >
            <Share2 className="w-4 h-4 mr-2" />
            <span className="sm:inline">Share</span>
          </Button>
        </>
      )}
    </div>
  );
};
