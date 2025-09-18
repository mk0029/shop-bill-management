"use client";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";

interface Bill {
  _id: string;
  billNumber?: string;
  totalAmount?: number;
  [key: string]: any; // Allow additional bill properties
}

interface BillDetailTriggerProps {
  bill: Bill | null;
  buttonLabel?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const BillDetailTrigger = ({
  bill,
  buttonLabel = "View",
  variant = "outline",
  size = "sm",
  className,
}: BillDetailTriggerProps) => {
  const router = useRouter();
  const { role } = useAuthStore();

  if (!bill) return null;

  const handleClick = () => {
    const basePath = role?.toLowerCase() === 'admin' ? '/admin/billing' : '/customer/bills';
    router.push(`${basePath}?open=${bill._id}`);
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleClick} 
      className={className}
    >
      {buttonLabel}
    </Button>
  );
};
