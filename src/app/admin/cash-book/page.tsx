import { CashBookPage } from "@/components/cash-book/cash-book-page";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { sanityApiService } from "@/lib/sanity-api-service";

export const dynamic = 'force-dynamic';

export default async function CashBook() {
  // Fetch initial data on the server
  const [entriesRes, usersRes, summaryRes] = await Promise.all([
    sanityApiService.cashBook.getAllEntries(),
    sanityApiService.users.getAllUsers(),
    sanityApiService.cashBook.getSummary(),
  ]);

  const entries = entriesRes.success ? (entriesRes.data as any[]) : [];
  const users = usersRes.success ? (usersRes.data as any[]) : [];
  const summary = summaryRes.success ? (summaryRes.data as any) : { totalCredits: 0, totalDebits: 0, balance: 0 };

  return (
    <RealtimeProvider enableNotifications={false}>
      <CashBookPage 
        initialEntries={entries}
        initialUsers={users}
        initialSummary={summary}
      />
    </RealtimeProvider>
  );
}
