import { CashBookPage } from "@/components/cash-book/cash-book-page";
import { RealtimeProvider } from "@/components/providers/realtime-provider";

export const dynamic = "force-dynamic";

export default function CashBook() {
  return (
    <RealtimeProvider enableNotifications={false}>
      <CashBookPage />
    </RealtimeProvider>
  );
}
