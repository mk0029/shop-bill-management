import { useEffect } from "react";

export function useRealtimeEvent(event: string, callback: (data: any) => void) {
  useEffect(() => {
    // Mock implementation for now

    // Cleanup function
    return () => {
    };
  }, [event, callback]);
}
