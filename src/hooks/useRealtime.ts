import { useEffect } from "react";

export function useRealtimeEvent(event: string, callback: (data: any) => void) {
  useEffect(() => {
    // Mock implementation for now
    console.log(`Listening for realtime event: ${event}`);

    // Cleanup function
    return () => {
      console.log(`Stopped listening for realtime event: ${event}`);
    };
  }, [event, callback]);
}
