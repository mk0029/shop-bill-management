import { toast } from "sonner";

export function handleRealtimeError(error: unknown) {
  // Check for timeout error
  if (error instanceof Error && error.message?.includes("No activity within 45000 milliseconds")) {
    toast.error("Connection timeout", {
      description: "Please refresh the page to restore real-time updates",
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      },
      duration: 0 // Keep visible until user acts
    });
  } else {
    // Other connection errors
    console.error("❌ Real-time connection error:", error);
    toast("Connection interrupted", {
      description: "Attempting to reconnect...",
      duration: 3000
    });
  }
}
