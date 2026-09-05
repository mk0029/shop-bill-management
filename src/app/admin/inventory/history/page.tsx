import { Card, CardContent } from "@/components/ui/card";

export default function StockHistoryPage() {
  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto">
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <h1 className="text-lg font-bold text-white mb-2">Stock History</h1>
          <p className="text-gray-400 text-sm">
            The stock transaction history page is no longer available. Stock
            transaction data has been moved to the inventory database; use{" "}
            <span className="text-white">Inventory → /admin/inventory</span> for
            inventory management.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}