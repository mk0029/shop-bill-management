"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ClientErrorLog = {
  _id: string;
  source?: string;
  message?: string;
  stack?: string;
  userId?: string;
  route?: string;
  userAgent?: string;
  browser?: string;
  platform?: string;
  isOppo?: boolean;
  isMobile?: boolean;
  occurredAt?: string;
  receivedAt?: string;
};

export default function ClientErrorLogsPage() {
  const [logs, setLogs] = useState<ClientErrorLog[]>([]);
  const [oppoOnly, setOppoOnly] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/client-error-logs?limit=75${oppoOnly ? "&oppo=1" : ""}`);
      const data = await response.json();
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [oppoOnly]);

  const title = useMemo(() => (oppoOnly ? "OPPO Client Errors" : "Client Errors"), [oppoOnly]);

  return (
    <div className="min-h-screen bg-gray-950 p-3 text-white sm:p-5">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-amber-400" />
            <div>
              <h1 className="text-2xl font-semibold">{title}</h1>
              <p className="text-sm text-gray-400">Runtime crashes, browser API failures, and unhandled promises.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOppoOnly((value) => !value)}>
              <Smartphone className="mr-2 h-4 w-4" />
              {oppoOnly ? "Show all" : "OPPO only"}
            </Button>
            <Button onClick={loadLogs} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {logs.map((log) => (
          <Card key={log._id} className="border-gray-800 bg-gray-900">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base text-white">{log.message || "Unknown client error"}</CardTitle>
                {log.isOppo ? <Badge className="bg-amber-500 text-gray-950">OPPO</Badge> : null}
                {log.isMobile ? <Badge variant="outline">Mobile</Badge> : null}
                {log.source ? <Badge variant="outline">{log.source}</Badge> : null}
              </div>
              <div className="text-xs text-gray-400">
                {log.receivedAt || log.occurredAt || "Unknown time"} {log.route ? `- ${log.route}` : ""}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-md bg-gray-950 p-3">
                  <div className="text-gray-500">User</div>
                  <div className="break-all text-gray-200">{log.userId || "Unknown"}</div>
                </div>
                <div className="rounded-md bg-gray-950 p-3">
                  <div className="text-gray-500">Browser</div>
                  <div className="break-all text-gray-200">{log.browser || log.platform || "Unknown"}</div>
                </div>
              </div>
              {log.stack ? (
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-gray-950 p-3 text-xs text-gray-300">
                  {log.stack}
                </pre>
              ) : null}
              {log.userAgent ? (
                <div className="break-all rounded-md bg-gray-950 p-3 text-xs text-gray-400">{log.userAgent}</div>
              ) : null}
            </CardContent>
          </Card>
        ))}

        {!loading && logs.length === 0 ? (
          <Card className="border-gray-800 bg-gray-900">
            <CardContent className="p-6 text-center text-gray-400">No client errors logged yet.</CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
