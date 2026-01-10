"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select";
import { toast } from "sonner";
import { Receipt } from "lucide-react";
import { BillDetailModal } from "@/components/ui/bill-detail-modal";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Search, Filter } from "lucide-react";
import { sanityApiService } from "@/lib/sanity-api-service";
import { useCashBookRealtime } from "@/hooks/use-cash-book-realtime";
import ResponsiveAccordion from "@/components/ui/responsive-accordion";

interface CashBookEntry {
  _id: string;
  _createdAt: string;
  user?: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  userName: string;
  amount: number;
  type: 'credit' | 'debit';
  source: 'Manual' | 'Bill Payment';
  bill?: {
    _id: string;
    billNumber: string;
    customer?: {
      _id: string;
      name: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface User {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}

export default function CashBookHistoryPage() {
  const [entries, setEntries] = useState<CashBookEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "credit" | "debit">("all");
  const [filterSource, setFilterSource] = useState<"all" | "Manual" | "Bill Payment">("all");
  const [filterUser, setFilterUser] = useState<string>("all");

  // Real-time updates
  const { isConnected } = useCashBookRealtime({
    onEntryAdded: (newEntry) => {
      setEntries(prev => [newEntry, ...prev]);
      toast.success(`Cash book entry added: ${newEntry.type === 'credit' ? '+' : '-'}₹${newEntry.amount}`);
    },
    onEntryUpdated: (updatedEntry) => {
      setEntries(prev => prev.map(entry => 
        entry._id === updatedEntry._id ? updatedEntry : entry
      ));
    },
    onEntryDeleted: (deletedId) => {
      setEntries(prev => prev.filter(entry => entry._id !== deletedId));
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesResponse, usersResponse] = await Promise.all([
        sanityApiService.cashBook.getAllEntries(),
        sanityApiService.users.getAllUsers()
      ]);

      if (entriesResponse.success && entriesResponse.data) {
        setEntries(entriesResponse.data);
      }

      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data);
      }
    } catch (error) {
      console.error('Error loading cash book data:', error);
      toast.error("Failed to load cash book data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (entry.user?.phone && entry.user.phone.includes(searchTerm)) ||
                         (entry.bill?.billNumber && entry.bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === "all" || entry.type === filterType;
    const matchesSource = filterSource === "all" || entry.source === filterSource;
    const matchesUser = filterUser === "all" || entry.user?._id === filterUser;

    return matchesSearch && matchesType && matchesSource && matchesUser;
  });

  // Group entries by date
  const groupEntriesByDate = (entries: CashBookEntry[]) => {
    const groups: { [date: string]: CashBookEntry[] } = {};
    
    entries.forEach(entry => {
      const date = format(new Date(entry.createdAt), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });
    
    return groups;
  };
  
  const groupedEntries = groupEntriesByDate(filteredEntries);

  const handleViewBill = async (billId: string) => {
    try {
      const bill = await sanityApiService.bills.getBillById(billId);
      if (bill.success && bill.data) {
        setSelectedBill(bill.data);
        setShowBillModal(true);
      } else {
        toast.error("Failed to fetch bill details");
      }
    } catch (error) {
      console.error("Error fetching bill:", error);
      toast.error("Failed to fetch bill details");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading cash book history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 rounded-lg max-md:p-4">
      
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
              Cash Book History
              </h1>
             
            </div>
          </div>
        
      
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 mt-6">
        {/* Filters */}
        <ResponsiveAccordion
        title={  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </h3>}>
        <Card className="bg-gray-800 border-gray-700 p-4">
        
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search" className="text-gray-300 text-sm">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, phone, bill..."
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="type" className="text-gray-300 text-sm">Type</Label>
              <SelectField
                value={filterType}
                onValueChange={(value: "all" | "credit" | "debit") => setFilterType(value)}
                options={[
                  { value: "all", label: "All Types" },
                  { value: "credit", label: "Credit" },
                  { value: "debit", label: "Debit" }
                ]}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="source" className="text-gray-300 text-sm">Source</Label>
              <SelectField
                value={filterSource}
                onValueChange={(value: "all" | "Manual" | "Bill Payment") => setFilterSource(value)}
                options={[
                  { value: "all", label: "All Sources" },
                  { value: "Manual", label: "Manual" },
                  { value: "Bill Payment", label: "Bill Payment" }
                ]}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="user" className="text-gray-300 text-sm">User</Label>
              <SelectField
                value={filterUser}
                onValueChange={setFilterUser}
                options={[
                  { value: "all", label: "All Users" },
                  ...users.map((user) => ({
                    value: user._id,
                    label: user.name
                  }))
                ]}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
        </Card>
        </ResponsiveAccordion>

        {/* Records */}
        <div className="lg:hidden max-h-[88dvh] overflow-auto">
          {Object.keys(groupedEntries).length === 0 ? (
            <Card className="bg-gray-800 border-gray-700 p-8 text-center">
              <p className="text-gray-400">No entries found matching your filters</p>
            </Card>
          ) : (
            Object.entries(groupedEntries).map(([date, dateEntries]) => (
              <div key={date} className="mb-4">
                {/* Date Separator */}
                <div className="border-t border-gray-600 my-2"></div>
                <div className="px-4 py-2 bg-gray-700 rounded-md sticky top-1 z-10">
                  <p className="text-sm font-medium text-gray-300">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
                <div className="space-y-1 mt-2">
                  {dateEntries.map((entry,index) => (
                    <Card key={entry._id} className={`bg-gray-800 border-gray-700 p-4 ${index===0 ? 'rounded-none rounded-t-lg' : dateEntries.length-1 === index? 'rounded-none rounded-b-lg' : 'rounded-none '}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-white font-medium">{entry.userName}</h4>
                          {entry.user?.phone && (
                            <p className="text-gray-400 text-sm">{entry.user.phone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${
                            entry.type === 'credit' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {entry.type === 'credit' ? '+' : '-'}{formatCurrency(entry.amount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={entry.type === 'credit' ? 'default' : 'destructive'}
                               className={entry.type === 'credit' 
                                 ? 'bg-green-600 text-white text-xs' 
                                 : 'bg-red-600 text-white text-xs'}>
                          {entry.type === 'credit' ? 'Credit' : 'Debit'}
                        </Badge>
                        <Badge variant="outline" className="border-gray-600 text-gray-300 text-xs">
                          {entry.source}
                        </Badge>
                        {entry.bill && (
                          <>
                            <span className="text-gray-400 text-xs">
                              Bill: {entry.bill.billNumber}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => entry.bill && handleViewBill(entry.bill._id)}
                              className="h-5 px-2 text-xs border-blue-600 text-blue-400 hover:bg-blue-600/20"
                            >
                              <Receipt className="w-2 h-2 mr-1" />
                              View
                            </Button>
                          </>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs">
                        {format(new Date(entry.createdAt), 'hh:mm a')}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block">
          <Card className="bg-gray-800 border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                All Records ({filteredEntries.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              {Object.keys(groupedEntries).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No entries found matching your filters</p>
                </div>
              ) : (
                Object.entries(groupedEntries).map(([date, dateEntries]) => (
                  <div key={date}>
                    <div className="border-t border-gray-600 my-2"></div>
                    <div className="px-4 py-2 bg-gray-700/50">
                      <p className="text-sm font-medium text-gray-300">
                        {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-4 text-gray-400 font-medium">User</th>
                          <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                          <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                          <th className="text-left p-4 text-gray-400 font-medium">Source</th>
                          <th className="text-left p-4 text-gray-400 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dateEntries.map((entry) => (
                          <tr key={entry._id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                            <td className="p-4">
                              <div>
                                <p className="text-white font-medium">{entry.userName}</p>
                                {entry.user?.phone && (
                                  <p className="text-gray-400 text-sm">{entry.user.phone}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <p className={`font-bold ${
                                entry.type === 'credit' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {entry.type === 'credit' ? '+' : '-'}{formatCurrency(entry.amount)}
                              </p>
                            </td>
                            <td className="p-4">
                              <Badge variant={entry.type === 'credit' ? 'default' : 'destructive'}
                                     className={entry.type === 'credit' 
                                       ? 'bg-green-600 text-white' 
                                       : 'bg-red-600 text-white'}>
                                {entry.type === 'credit' ? 'Credit' : 'Debit'}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-gray-600 text-gray-300">
                                  {entry.source}
                                </Badge>
                                {entry.bill && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => entry.bill && handleViewBill(entry.bill._id)}
                                    className="h-6 px-2 text-xs border-blue-600 text-blue-400 hover:bg-blue-600/20"
                                  >
                                    Check Bill
                                  </Button>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-gray-300">
                                {format(new Date(entry.createdAt), 'hh:mm a')}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Bill Detail Modal */}
        <BillDetailModal
          isOpen={showBillModal}
          onClose={() => setShowBillModal(false)}
          bill={selectedBill}
          onDownloadPDF={() => {}}
          showShareButton={false}
          showPaymentControls={false}
        />
      </div>
    </div>
  );
}
