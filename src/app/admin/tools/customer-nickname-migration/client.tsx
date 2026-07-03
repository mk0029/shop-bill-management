"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CheckCircle, Eye, Play, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { sanityClient } from "@/lib/sanity";
import { userApiService } from "@/lib/sanity-api-service";

const BRACKET_REGEX = /\s*[\[({]([^\]})]+)[\]})]\s*$/;

function splitNameAndNickname(name: string) {
  const match = name.match(BRACKET_REGEX);
  if (!match) {
    return { cleanName: name.trim(), nickname: "" };
  }
  const inside = match[1].trim();
  const cleanName = name.slice(0, name.indexOf(match[0])).trim().replace(/\s+/g, " ");
  return { cleanName, nickname: inside };
}

interface CustomerRow {
  _id: string;
  name: string;
  nickname?: string;
  newName: string;
  newNickname: string;
  status: "pending" | "skipped" | "success" | "failed";
  error?: string;
}

type LogEntry = {
  type: "info" | "success" | "error" | "warning";
  message: string;
};

export default function CustomerNicknameMigrationClient() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewDone, setPreviewDone] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs(prev => [...prev, entry]);
  }, []);

  const fetchAndPreview = useCallback(async () => {
    setLoading(true);
    setPreviewDone(false);
    setMigrationDone(false);
    setLogs([]);
    try {
      addLog({ type: "info", message: "Fetching all customers..." });
      const res = await userApiService.getCustomers();
      if (!res.success || !Array.isArray(res.data)) {
        throw new Error(res.error || "Failed to fetch customers");
      }
      const allCustomers = res.data;
      addLog({ type: "info", message: `Total customers fetched: ${allCustomers.length}` });

      const rows: CustomerRow[] = allCustomers.map((c: any) => {
        const { cleanName, nickname: extracted } = splitNameAndNickname(c.name || "");
        const existingNick = (c.nickname || "").trim();
        const hasBracket = !!extracted;

        let status: CustomerRow["status"] = "skipped";
        if (hasBracket) {
          const shouldUpdateNick =
            !existingNick ||
            existingNick === (c.name || "").trim() ||
            existingNick === cleanName;
          status = shouldUpdateNick ? "pending" : "pending";
        }

        return {
          _id: c._id,
          name: c.name,
          nickname: c.nickname,
          newName: cleanName,
          newNickname: extracted,
          status,
        };
      });

      const needsUpdate = rows.filter(r => r.status === "pending");
      const skipped = rows.filter(r => r.status === "skipped");

      addLog({ type: "info", message: `Customers needing update: ${needsUpdate.length}` });
      addLog({ type: "info", message: `Customers skipped (no bracket text): ${skipped.length}` });

      setCustomers(rows);
      setPreviewDone(true);
    } catch (err: any) {
      addLog({ type: "error", message: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  const runMigration = useCallback(async () => {
    setConfirmOpen(false);
    setMigrating(true);
    setMigrationDone(false);
    try {
      const toUpdate = customers.filter(r => r.status === "pending");
      let successCount = 0;
      let failCount = 0;
      const failedRecords: { name: string; error: string }[] = [];

      addLog({ type: "info", message: `Starting migration for ${toUpdate.length} customers...` });

      for (const row of toUpdate) {
        try {
          const patch = sanityClient.patch(row._id);
          const setFields: Record<string, any> = {
            updatedAt: new Date().toISOString(),
          };

          setFields.name = row.newName;

          const existingNick = (row.nickname || "").trim();
          const shouldUpdateNick =
            !existingNick ||
            existingNick === row.name.trim() ||
            existingNick === row.newName;

          if (row.newNickname && shouldUpdateNick) {
            setFields.nickname = row.newNickname;
          }

          await patch.set(setFields).commit();

          row.status = "success";
          successCount++;
          addLog({
            type: "success",
            message: `✓ ${row.name} → name: "${row.newName}", nickname: "${row.newNickname}"`,
          });
        } catch (err: any) {
          row.status = "failed";
          row.error = err.message;
          failCount++;
          failedRecords.push({ name: row.name, error: err.message });
          addLog({ type: "error", message: `✗ ${row.name}: ${err.message}` });
        }
      }

      addLog({ type: "info", message: `Successfully updated: ${successCount}` });
      addLog({ type: "info", message: `Failed updates: ${failCount}` });

      if (failedRecords.length > 0) {
        addLog({ type: "warning", message: "Failed records:" });
        failedRecords.forEach(f => {
          addLog({ type: "warning", message: `  - ${f.name}: ${f.error}` });
        });
      }

      setCustomers([...customers]);
      setMigrationDone(true);
    } catch (err: any) {
      addLog({ type: "error", message: `Migration failed: ${err.message}` });
    } finally {
      setMigrating(false);
    }
  }, [customers, addLog]);

  const needsUpdate = customers.filter(r => r.status === "pending");
  const skipped = customers.filter(r => r.status === "skipped");
  const updated = customers.filter(r => r.status === "success");
  const failed = customers.filter(r => r.status === "failed");

  const previewRows = customers.filter(r => r.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Fix Name &amp; Nickname Migration</h1>
        <p className="text-gray-400 text-sm mt-1">
          Extract bracket text from customer names and save as nickname.
          <br />
          <code className="text-blue-400">Vishnu Godara (Ugersain)</code> → name:{" "}
          <code className="text-green-400">Vishnu Godara</code>, nickname:{" "}
          <code className="text-green-400">Ugersain</code>
        </p>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Migration Tool</CardTitle>
          <CardDescription>
            Supports parentheses <code className="text-blue-400">()</code>, curly braces{" "}
            <code className="text-blue-400">{"{}"}</code>, and square brackets{" "}
            <code className="text-blue-400">[]</code>. Always updates the name field. Only
            overwrites nickname if empty, or if it was wrongly set to the full name by a previous bug.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!previewDone && !loading && (
            <Button
              onClick={fetchAndPreview}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview Changes
            </Button>
          )}

          {loading && (
            <div className="flex items-center gap-3 text-gray-400">
              <LoadingSpinner />
              <span>Fetching customers...</span>
            </div>
          )}

          {previewDone && !migrating && (
            <div className="flex gap-3">
              <Button
                onClick={fetchAndPreview}
                variant="outline"
                className="border-gray-700 text-gray-300"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={needsUpdate.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="mr-2 h-4 w-4" />
                Fix Name &amp; Nickname ({needsUpdate.length})
              </Button>
            </div>
          )}

          {migrating && (
            <div className="flex items-center gap-3 text-gray-400">
              <LoadingSpinner />
              <span>Running migration...</span>
            </div>
          )}

          {previewDone && previewRows.length > 0 && (
            <div className="rounded-lg border border-gray-800 overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 bg-gray-800/50 cursor-pointer select-none"
                onClick={() => setExpanded(!expanded)}
              >
                <span className="text-sm font-medium text-gray-300">
                  Customers to update ({previewRows.length})
                </span>
                {expanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
              {expanded && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead className="text-gray-400">Old Name</TableHead>
                        <TableHead className="text-gray-400">New Name</TableHead>
                        <TableHead className="text-gray-400">Old Nickname</TableHead>
                        <TableHead className="text-gray-400">New Nickname</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row) => (
                        <TableRow key={row._id} className="border-gray-800">
                          <TableCell className="text-gray-400">{row.name}</TableCell>
                          <TableCell className="text-white font-medium">{row.newName}</TableCell>
                          <TableCell className="text-gray-400">
                            {row.nickname?.trim() ? (
                              <Badge variant="secondary">{row.nickname}</Badge>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-green-400">{row.newNickname}</TableCell>
                          <TableCell>
                            {row.status === "success" && (
                              <Badge variant="default" className="bg-green-600">Updated</Badge>
                            )}
                            {row.status === "failed" && (
                              <Badge variant="destructive">Failed</Badge>
                            )}
                            {row.status === "pending" && (
                              <Badge variant="outline" className="text-yellow-400 border-yellow-600">Pending</Badge>
                            )}
                            {row.status === "skipped" && (
                              <Badge variant="secondary">Skipped</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {previewDone && previewRows.length === 0 && (
            <div className="flex items-center gap-2 text-gray-400 py-4">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>No customers need updates.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {previewDone && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg bg-gray-800/50 p-3">
                <div className="text-2xl font-bold text-white">{customers.length}</div>
                <div className="text-xs text-gray-400">Total Customers</div>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-3">
                <div className="text-2xl font-bold text-yellow-400">{needsUpdate.length}</div>
                <div className="text-xs text-gray-400">Needs Update</div>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-3">
                <div className="text-2xl font-bold text-gray-400">{skipped.length}</div>
                <div className="text-xs text-gray-400">Skipped</div>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-3">
                <div className="text-2xl font-bold text-green-400">{updated.length}</div>
                <div className="text-xs text-gray-400">Updated</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setShowLogs(!showLogs)}
            >
              <CardTitle className="text-white">Logs</CardTitle>
              {showLogs ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </CardHeader>
          {showLogs && (
            <CardContent>
              <div className="max-h-64 overflow-y-auto space-y-1 bg-gray-950 rounded-lg p-3 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {log.type === "info" && <span className="text-blue-400">ℹ</span>}
                    {log.type === "success" && <span className="text-green-400">✓</span>}
                    {log.type === "error" && <span className="text-red-400">✗</span>}
                    {log.type === "warning" && <span className="text-yellow-400">⚠</span>}
                    <span
                      className={
                        log.type === "info"
                          ? "text-blue-300"
                          : log.type === "success"
                          ? "text-green-300"
                          : log.type === "error"
                          ? "text-red-300"
                          : "text-yellow-300"
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={runMigration}
        title="Confirm Migration"
        message={`Are you sure you want to update name and nickname for ${needsUpdate.length} customers?`}
        type="confirm"
        confirmText="Run Migration"
        cancelText="Cancel"
      />
    </div>
  );
}
