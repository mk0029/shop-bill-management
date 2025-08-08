"use client";

import { useState, useEffect } from "react";
import { testSanityConnection, fallbackQueries } from "@/lib/sanity-test";
import { testApiToken } from "@/lib/sanity-token-test";
import { sanityClient } from "@/lib/sanity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Info,
} from "lucide-react";

export function SanityDebug() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sampleData, setSampleData] = useState<any>({});

  const runTest = async () => {
    setIsLoading(true);
    try {
      const result = await testSanityConnection();
      setTestResult(result);

      // Try to fetch some sample data
      const samples: any = {};

      try {
        samples.brands = await sanityClient.fetch(fallbackQueries.brands);
      } catch (e) {
        samples.brands = {
          error: e instanceof Error ? e.message : "Unknown error",
        };
      }

      try {
        samples.categories = await sanityClient.fetch(
          fallbackQueries.categories
        );
      } catch (e) {
        samples.categories = {
          error: e instanceof Error ? e.message : "Unknown error",
        };
      }

      try {
        samples.products = await sanityClient.fetch(fallbackQueries.products);
      } catch (e) {
        samples.products = {
          error: e instanceof Error ? e.message : "Unknown error",
        };
      }

      setSampleData(samples);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runTest();
  }, []);

  return (
    <div className="space-y-6 p-6 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold !leading-[125%] text-white flex items-center gap-2">
              <Database className="h-6 w-6" />
              Sanity Connection Debug
            </h1>
            <p className="text-gray-400">
              Testing connection to Sanity CMS and checking available data
            </p>
          </div>
          <Button onClick={runTest} disabled={isLoading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Testing..." : "Retest"}
          </Button>
        </div>

        {/* Connection Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult?.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Testing connection...
              </div>
            ) : testResult?.success ? (
              <div className="space-y-2">
                <Badge variant="default" className="bg-green-600">
                  ✅ Connected to Sanity
                </Badge>
                <p className="text-sm text-gray-400">
                  Project ID: idji8ni7 | Dataset: production
                </p>
                {testResult.totalDocuments !== undefined && (
                  <p className="text-sm text-gray-400">
                    Total documents: {testResult.totalDocuments}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Badge variant="destructive">❌ Connection Failed</Badge>
                <p className="text-sm text-red-400">
                  {testResult?.error || "Unknown error"}
                </p>
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-yellow-200 font-medium">
                        Troubleshooting:
                      </p>
                      <ul className="text-yellow-300 mt-1 space-y-1">
                        <li>• Check your SANITY_API_TOKEN in .env.local</li>
                        <li>• Verify project ID and dataset name</li>
                        <li>• Ensure your Sanity project is accessible</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Types */}
        {testResult?.documentTypes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Available Document Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {testResult.documentTypes.map((type: any, index: number) => (
                  <Badge key={index} variant="outline">
                    {type.documentType} ({type.count})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sample Data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(sampleData).map(([key, data]: [string, any]) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="capitalize">{key}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.error ? (
                  <div className="text-red-400 text-sm">
                    Error: {data.error}
                  </div>
                ) : Array.isArray(data) ? (
                  <div>
                    <p className="text-green-400 text-sm mb-2">
                      ✅ Found {data.length} items
                    </p>
                    {data.length > 0 && (
                      <div className="bg-gray-800 p-2 rounded text-xs">
                        <pre className="text-gray-300 overflow-x-auto">
                          {JSON.stringify(data[0], null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">No data available</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Environment Info */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Project ID:</span>
                <span className="text-white">idji8ni7</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Dataset:</span>
                <span className="text-white">production</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">API Version:</span>
                <span className="text-white">2024-01-01</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">CDN:</span>
                <span className="text-white">Disabled (for real-time)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">API Token:</span>
                <span className="text-white">
                  {process.env.NEXT_PUBLIC_SANITY_API_TOKEN
                    ? "✅ Set"
                    : "❌ Missing"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
