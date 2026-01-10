"use client";

interface BillChargesProps {
  bill: any;
  currency: string;
  transportationFee: number;
  homeVisitFee: number;
  repairChargeValue: number;
  laborCharges: number;
}

export const BillCharges = ({ 
  bill, 
  currency, 
  transportationFee, 
  homeVisitFee, 
  repairChargeValue, 
  laborCharges 
}: BillChargesProps) => {
  // Show Additional Charges section if any charge field is present on the bill
  const hasAnyCharge =
    bill.homeVisitFee !== undefined ||
    bill.transportationFee !== undefined ||
    bill.repairCharges !== undefined ||
    (bill as any).repairCharge !== undefined ||
    bill.repairFee !== undefined ||
    bill.laborCharges !== undefined;

  if (!hasAnyCharge) {
    return null;
  }

  const additionalChargesF = [
    {
      label: "Transportation Fee",
      value: transportationFee,
    },
    {
      label: "Home Visit Fee",
      value: homeVisitFee,
    },
    {
      label: "Repair Charges",
      value: repairChargeValue,
    },
    {
      label: "Labor Charges",
      value: laborCharges,
    },
  ];

  return (
    <div>
      <h3 className="font-medium text-white mb-2 sm:mb-3 md:mb-4">
        Additional Charges
      </h3>
      <div className="space-y-3">
        {additionalChargesF?.map(
          (charge, index) =>
            charge.value > 0 && (
              <div
                key={index}
                className="flex justify-between items-center py-1.5 px-2 sm:p-3 bg-gray-800/50 rounded-lg border border-gray-700 sm:text-base text-sm"
              >
                <span className="text-gray-300">{charge.label}</span>
                <span className="font-medium text-white">
                  {currency}
                  {charge.value.toFixed(2)}
                </span>
              </div>
            )
        )}
      </div>
    </div>
  );
};
