"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  Calendar,
  Receipt,
} from "lucide-react";
import { BillDetails } from "@/lib/whatsapp-utils";
import { useWhatsAppMessaging } from "@/hooks/use-whatsapp-config";

export default function BillSender() {
  const { sendBillMessage, isConfigured, error } = useWhatsAppMessaging();
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const [bill, setBill] = useState<BillDetails>({
    billNumber: "BILL-" + Date.now().toString().slice(-6),
    customerName: "",
    customerPhone: "",
    billDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    items: [
      { name: "LED Bulb", quantity: 5, price: 90, total: 450 },
      { name: "Wire Cable", quantity: 10, price: 150, total: 1500 },
    ],
    subtotal: 1950,
    tax: 195,
    total: 2145,
    notes: "Thank you for your business!",
    userId: "customer_" + Math.random().toString(36).substr(2, 9),
    passKey: "pass_" + Math.random().toString(36).substr(2, 12),
  });

  const handleInputChange = (field: keyof BillDetails, value: any) => {
    setBill((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setBill((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItem = () => {
    setBill((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", quantity: 1, price: 0, total: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    setBill((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    const subtotal = bill.items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    setBill((prev) => ({ ...prev, subtotal, tax, total }));
  };

  const handleSendMessage = async () => {
    if (!isConfigured) {
      alert("WhatsApp is not configured. Please configure it in settings.");
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    try {
      calculateTotals();
      const result = await sendBillMessage(bill);
      setLastResult(result);
    } catch (err) {
      setLastResult({
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            WhatsApp Bill Sender
            {!isConfigured && (
              <Badge variant="destructive">Not Configured</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer Name
              </Label>
              <Input
                value={bill.customerName}
                onChange={(e) =>
                  handleInputChange("customerName", e.target.value)
                }
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Customer Phone
              </Label>
              <Input
                value={bill.customerPhone}
                onChange={(e) =>
                  handleInputChange("customerPhone", e.target.value)
                }
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="+917015493276"
              />
            </div>
          </div>

          {/* Bill Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Bill Number
              </Label>
              <Input
                value={bill.billNumber}
                onChange={(e) =>
                  handleInputChange("billNumber", e.target.value)
                }
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Bill Date
              </Label>
              <Input
                type="date"
                value={bill.billDate}
                onChange={(e) => handleInputChange("billDate", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Due Date
              </Label>
              <Input
                type="date"
                value={bill.dueDate}
                onChange={(e) => handleInputChange("dueDate", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Authentication */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">User ID</Label>
              <Input
                value={bill.userId || ""}
                onChange={(e) => handleInputChange("userId", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="customer_user_id"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Pass Key</Label>
              <Input
                value={bill.passKey || ""}
                onChange={(e) => handleInputChange("passKey", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="customer_pass_key"
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-gray-300 text-lg">Bill Items</Label>
              <Button onClick={addItem} variant="outline" size="sm">
                Add Item
              </Button>
            </div>

            {bill.items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 bg-gray-800 rounded-lg">
                <Input
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) =>
                    handleItemChange(index, "name", e.target.value)
                  }
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value) || 0;
                    handleItemChange(index, "quantity", qty);
                    handleItemChange(index, "total", qty * item.price);
                  }}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Input
                  type="number"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value) || 0;
                    handleItemChange(index, "price", price);
                    handleItemChange(index, "total", item.quantity * price);
                  }}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Input
                  type="number"
                  placeholder="Total"
                  value={item.total}
                  readOnly
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Button
                  onClick={() => removeItem(index)}
                  variant="destructive"
                  size="sm"
                  disabled={bill.items.length === 1}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-gray-300">Notes</Label>
            <Textarea
              value={bill.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          {/* Totals */}
          <div className="bg-gray-800 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-gray-300">
              <span>Subtotal:</span>
              <span>₹{bill.subtotal}</span>
            </div>
            {bill.tax && (
              <div className="flex justify-between text-gray-300">
                <span>Tax:</span>
                <span>₹{bill.tax}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold text-lg border-t border-gray-700 pt-2">
              <span>Total:</span>
              <span>₹{bill.total}</span>
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={
              isLoading ||
              !isConfigured ||
              !bill.customerName ||
              !bill.customerPhone
            }
            className="w-full flex items-center gap-2">
            <Send className="w-4 h-4" />
            {isLoading ? "Sending..." : "Send WhatsApp Message"}
          </Button>

          {/* Result Display */}
          {lastResult && (
            <Card
              className={`border ${lastResult.status === "failed" ? "border-red-600" : "border-green-600"}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  {lastResult.status === "failed" ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  <span className="text-white font-medium">
                    {lastResult.status === "failed"
                      ? "Message Failed"
                      : "Message Sent Successfully"}
                  </span>
                </div>
                {lastResult.deviceUsed && (
                  <p className="text-gray-400 text-sm mt-1">
                    Device used: {lastResult.deviceUsed}
                  </p>
                )}
                {lastResult.error && (
                  <p className="text-red-400 text-sm mt-1">
                    Error: {lastResult.error}
                  </p>
                )}
                {lastResult.timestamp && (
                  <p className="text-gray-400 text-sm mt-1">
                    Time: {new Date(lastResult.timestamp).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Configuration Error */}
          {error && (
            <Card className="border border-red-600">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-white font-medium">
                    Configuration Error
                  </span>
                </div>
                <p className="text-red-400 text-sm mt-1">{error}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
