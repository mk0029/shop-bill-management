import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { useLocaleStore } from "@/store/locale-store";

interface CustomerInfoSectionProps {
  formData: any;
  customers: any[];
  customersLoading: boolean;
  onInputChange: (field: string, value: string) => void;
}

const serviceTypeOptions = [
  { value: "sale", label: "Sale" },
  { value: "repair", label: "Repair" },
  { value: "custom", label: "Custom" },
];

const locationOptions = [
  { value: "home", label: "Home Service" },
  { value: "shop", label: "Shop Service" },
];

export const CustomerInfoSection = ({
  formData,
  customers,
  customersLoading,
  onInputChange,
}: CustomerInfoSectionProps) => {
  const router = useRouter();
  const { currency } = useLocaleStore();

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          Customer Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerId" className="text-gray-300">
              Select Customer *
            </Label>
            <Dropdown
              options={customers.map((c) => ({
                value: c._id,
                label: `${c.name} (${c.phone}) - ${c.location}`,
              }))}
              value={formData.customerId}
              onValueChange={(value) => onInputChange("customerId", value)}
              placeholder={
                customersLoading
                  ? "Loading customers..."
                  : customers.length === 0
                  ? "No customers found"
                  : "Choose customer"
              }
              searchable={true}
              searchPlaceholder="Search customers..."
              className="bg-gray-800 border-gray-700"
              disabled={customersLoading || customers.length === 0}
            />
            {customers.length === 0 && !customersLoading && (
              <div className="text-xs text-yellow-400">
                <p>No customers available.</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => router.push("/admin/customers/add")}
                  className="text-blue-400 hover:text-blue-300 p-0 h-auto text-xs"
                >
                  Add your first customer →
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceType" className="text-gray-300">
              Service Type *
            </Label>
            <Dropdown
              options={serviceTypeOptions}
              value={formData.serviceType}
              onValueChange={(value) => onInputChange("serviceType", value)}
              placeholder="Select service type"
              searchable={false}
              className="bg-gray-800 border-gray-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-gray-300">
              Location Type *
            </Label>
            <Dropdown
              options={locationOptions}
              value={formData.location}
              onValueChange={(value) => onInputChange("location", value)}
              placeholder="Select location type"
              searchable={false}
              className="bg-gray-800 border-gray-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billDate" className="text-gray-300">
              Bill Date *
            </Label>
            <Input
              id="billDate"
              type="date"
              value={formData.billDate}
              onChange={(e) => onInputChange("billDate", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-gray-300">
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => onInputChange("dueDate", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-gray-300">
            Notes
          </Label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => onInputChange("notes", e.target.value)}
            className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 resize-none focus:outline-none   focus:border-transparent"
            placeholder="Add any additional notes..."
          />
        </div>

        {/* Conditional charges based on service type and location */}
        {formData.serviceType === "repair" && (
          <div className="space-y-2">
            <Label htmlFor="repairCharges" className="text-gray-300">
              Repair Charges ({currency})
            </Label>
            <Input
              id="repairCharges"
              type="number"
              min="0"
              step="0.01"
              value={formData.repairCharges || ""}
              onChange={(e) => onInputChange("repairCharges", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter repair charges"
            />
          </div>
        )}

        {formData.location === "home" && (
          <div className="space-y-2">
            <Label htmlFor="homeVisitFee" className="text-gray-300">
              Home Visit Fee ({currency})
            </Label>
            <Input
              id="homeVisitFee"
              type="number"
              min="50"
              max="200"
              step="1"
              value={formData.homeVisitFee || ""}
              onChange={(e) => onInputChange("homeVisitFee", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="50-200"
            />
            <p className="text-xs text-gray-400">Minimum ₹50, Maximum ₹200</p>
          </div>
        )}

        {formData.location === "home" && (
          <div className="space-y-2">
            <Label htmlFor="laborCharges" className="text-gray-300">
              Labor Charges ({currency})
            </Label>
            <Input
              id="laborCharges"
              type="number"
              min="0"
              step="0.01"
              value={formData.laborCharges || ""}
              onChange={(e) => onInputChange("laborCharges", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter labor charges"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
