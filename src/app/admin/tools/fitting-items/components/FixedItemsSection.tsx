"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { AMP_OPTIONS, MCB_BOX_OPTIONS, FAMILY_REGEX } from "../types";
import { SECTION_SETS } from "../constants";
import ResponsiveAccordion from "@/components/ui/responsive-accordion";

interface FixedItemsSectionProps {
  fitType: string;
  fixedQuantities: Record<string, number>;
  familySelect: Record<string, string>;
  wireUnitMode: "roll" | "mtr";
  onFixedQtyChange: (name: string, value: number) => void;
  onFamilySelectChange: (family: string, value: string) => void;
  onWireUnitModeChange: (mode: "roll" | "mtr") => void;
  onApplyFixedToList: () => void;
}

export default function FixedItemsSection({
  fitType,
  fixedQuantities,
  familySelect,
  wireUnitMode,
  onFixedQtyChange,
  onFamilySelectChange,
  onWireUnitModeChange,
  onApplyFixedToList,
}: FixedItemsSectionProps) {
  return (
    <Card className="">
      <CardContent className="space-y-4 text-gray-300">
        <div className="space-y-6">
          {SECTION_SETS[fitType as keyof typeof SECTION_SETS].map((sec) => {
            const hasIsolater = sec.items.some((n) =>
              FAMILY_REGEX.Isolater.test(n),
            );
            const hasChange = sec.items.some((n) =>
              FAMILY_REGEX.Changeovevr.test(n),
            );
            const hasRccb = sec.items.some((n) => FAMILY_REGEX.RCCB.test(n));
            const hasMcbBox = sec.items.some((n) =>
              FAMILY_REGEX.McbBox.test(n),
            );
            const filtered = sec.items.filter(
              (n) =>
                !FAMILY_REGEX.Isolater.test(n) &&
                !FAMILY_REGEX.Changeovevr.test(n) &&
                !FAMILY_REGEX.RCCB.test(n) &&
                !FAMILY_REGEX.McbBox.test(n),
            );
            return (
              <div key={sec.title}>
                <div className="text-gray-200 font-medium mb-2">
                  {sec.title}
                  {sec.title === "Wires" && (
                    <div className="mt-2 flex items-center gap-3">
                      <Label className="text-gray-300 text-sm">
                        Wire Unit:
                      </Label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onWireUnitModeChange("roll")}
                          className={`px-3 py-1 rounded text-sm border transition-colors ${
                            wireUnitMode === "roll"
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
                          }`}
                        >
                          Roll
                        </button>
                        <button
                          onClick={() => onWireUnitModeChange("mtr")}
                          className={`px-3 py-1 rounded text-sm border transition-colors ${
                            wireUnitMode === "mtr"
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
                          }`}
                        >
                          Meters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((n) => (
                    <div
                      key={n}
                      className="flex items-center justify-between gap-3 p-2 rounded-md border border-gray-800 bg-gray-950"
                    >
                      <div className="text-white text-sm">{n}</div>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={fixedQuantities[n] ?? ""}
                        onChange={(e) =>
                          onFixedQtyChange(n, Number(e.target.value || ""))
                        }
                        className="bg-gray-800 border-gray-700 text-white w-24"
                      />
                    </div>
                  ))}

                  {hasIsolater && (
                    <div className="flex items-center justify-between gap-3 p-2 rounded-md border border-gray-800 bg-gray-950">
                      <div className="text-white text-sm">Isolater</div>
                      <div className="flex items-center gap-2">
                        <Dropdown
                          options={AMP_OPTIONS}
                          value={familySelect.Isolater}
                          onValueChange={(v) =>
                            onFamilySelectChange("Isolater", v)
                          }
                          placeholder="Amp"
                          className="min-w-[100px]"
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={
                            fixedQuantities[
                              `Isolater ${familySelect.Isolater}`
                            ] ?? ""
                          }
                          onChange={(e) =>
                            onFixedQtyChange(
                              `Isolater ${familySelect.Isolater}`,
                              Number(e.target.value || ""),
                            )
                          }
                          className="bg-gray-800 border-gray-700 text-white w-24"
                        />
                      </div>
                    </div>
                  )}

                  {hasChange && (
                    <div className="flex items-center justify-between gap-3 p-2 rounded-md border border-gray-800 bg-gray-950">
                      <div className="text-white text-sm">Changeovevr</div>
                      <div className="flex items-center gap-2">
                        <Dropdown
                          options={AMP_OPTIONS}
                          value={familySelect.Changeovevr}
                          onValueChange={(v) =>
                            onFamilySelectChange("Changeovevr", v)
                          }
                          placeholder="Amp"
                          className="min-w-[100px]"
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={
                            fixedQuantities[
                              `Changeovevr ${familySelect.Changeovevr}`
                            ] ?? ""
                          }
                          onChange={(e) =>
                            onFixedQtyChange(
                              `Changeovevr ${familySelect.Changeovevr}`,
                              Number(e.target.value || ""),
                            )
                          }
                          className="bg-gray-800 border-gray-700 text-white w-24"
                        />
                      </div>
                    </div>
                  )}

                  {hasRccb && (
                    <div className="flex items-center justify-between gap-3 p-2 rounded-md border border-gray-800 bg-gray-950">
                      <div className="text-white text-sm">RCCB</div>
                      <div className="flex items-center gap-2">
                        <Dropdown
                          options={AMP_OPTIONS}
                          value={familySelect.RCCB}
                          onValueChange={(v) => onFamilySelectChange("RCCB", v)}
                          placeholder="Amp"
                          className="min-w-[100px]"
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={
                            fixedQuantities[`RCCB ${familySelect.RCCB}`] ?? ""
                          }
                          onChange={(e) =>
                            onFixedQtyChange(
                              `RCCB ${familySelect.RCCB}`,
                              Number(e.target.value || ""),
                            )
                          }
                          className="bg-gray-800 border-gray-700 text-white w-24"
                        />
                      </div>
                    </div>
                  )}

                  {hasMcbBox && (
                    <div className="flex items-center justify-between gap-3 p-2 rounded-md border border-gray-800 bg-gray-950">
                      <div className="text-white text-sm">Mcb Box</div>
                      <div className="flex items-center gap-2">
                        <Dropdown
                          options={MCB_BOX_OPTIONS}
                          value={familySelect.McbBox}
                          onValueChange={(v) =>
                            onFamilySelectChange("McbBox", v)
                          }
                          placeholder="Ways"
                          className="min-w-[100px]"
                          removeSearchForce
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={
                            fixedQuantities[`Mcb Box ${familySelect.McbBox}`] ??
                            ""
                          }
                          onChange={(e) =>
                            onFixedQtyChange(
                              `Mcb Box ${familySelect.McbBox}`,
                              Number(e.target.value || ""),
                            )
                          }
                          className="bg-gray-800 border-gray-700 text-white w-24"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="pt-1">
            <Button
              className="bg-blue-500/50 hover:bg-transparent text-white"
              onClick={onApplyFixedToList}
            >
              Add Selected to List
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
