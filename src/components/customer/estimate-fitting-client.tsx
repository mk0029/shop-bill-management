"use client";

import { useState } from "react";

type FittingCategory = "underground" | "open_pvc" | "open_wire";

type FittingRatesDoc = {
  rates: {
    underground: number;
    open_pvc: number;
    open_wire: number;
  };
  updatedAt: string;
};

export default function EstimateFittingClient({
  data,
}: {
  data: FittingRatesDoc | null;
}) {
  const [type, setType] = useState<FittingCategory>("underground");
  const [qty, setQty] = useState<number>(1);

  const rates = data?.rates || null;
  const unitRate = rates ? rates[type] : 0;
  const estimated = Math.max(0, qty || 0) * unitRate;

  return (
    <div className="p-4 md:p-6 lg:p-8 text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Estimate fitting cos
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          Quickly estimate your fitting cost. Rates are fetched live from the
          shop.
        </p>

        {!rates && (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            Loading rates…
          </div>
        )}

        {rates && (
          <div className="grid gap-4">
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <label className="block text-sm text-gray-300 mb-2">
                Fitting type
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    {
                      key: "underground",
                      label: "Underground / Wall",
                      rate: rates.underground,
                    },
                    {
                      key: "open_pvc",
                      label: "Open PVC Casing",
                      rate: rates.open_pvc,
                    },
                    {
                      key: "open_wire",
                      label: "Open Wire",
                      rate: rates.open_wire,
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setType(opt.key as FittingCategory)}
                    className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                      type === opt.key
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
                    }`}
                  >
                    {opt.label}{" "}
                    <span className="opacity-70">(₹{opt.rate}/point)</span>
                  </button>
                ))}
              </div>
              {data?.updatedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Rates updated: {new Date(data.updatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <label htmlFor="qty" className="block text-sm text-gray-300 mb-2">
                Quantity (points)
              </label>
              <input
                id="qty"
                type="number"
                min={0}
                inputMode="numeric"
                className="w-full max-w-xs bg-gray-800 border border-gray-700 rounded-md p-2 text-white"
                value={Number.isFinite(qty) ? qty : 0}
                onChange={(e) =>
                  setQty(Math.max(0, Number(e.target.value || 0)))
                }
              />
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Estimated total</p>
                <p className="text-3xl font-semibold">
                  ₹{estimated.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Selected rate</p>
                <p className="text-sm">₹{unitRate} per point</p>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Note: This is an estimate. Final cost may vary based on on-site
              conditions and materials.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
