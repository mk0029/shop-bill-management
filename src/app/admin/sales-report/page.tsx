import { Card, CardContent } from "@/components/ui/card";

export default function SalesReportPage() {
  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto">
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <h1 className="text-lg font-bold text-white mb-2">Sales Report</h1>
          <p className="text-gray-400 text-sm">
            The sales report feature is no longer available. Bill data has been
            migrated out of the primary database; use{" "}
            <span className="text-white">Bills → /admin/billing</span> for bill
            views going forward.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}