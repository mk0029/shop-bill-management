"use client";

import { useState } from "react";
import { sanityClient } from "@/lib/sanity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SanityWhatsAppTest() {
  const [testResults, setTestResults] = useState<{
    success: boolean;
    sampleDocs?: any[];
    whatsappConfigs?: unknown[];
    documentTypes?: string[];
    whatsappConfigCount?: number;
    error?: string;
    timestamp: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testSanityConnection = async () => {
    setIsLoading(true);
    try {
      // Test basic connection - get first few documents
      const sampleDocs = await sanityClient.fetch("*[0...5]{ _type, _id }");

      // Test WhatsApp config query
      const whatsappConfigs = await sanityClient.fetch(
        '*[_type == "whatsappConfig"]'
      );

      // Get document types (simplified)
      const allTypes = await sanityClient.fetch("*[]._type");
      const uniqueTypes = [...new Set(allTypes)];

      setTestResults({
        success: true,
        sampleDocs,
        whatsappConfigs,
        documentTypes: uniqueTypes,
        whatsappConfigCount: whatsappConfigs.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setTestResults({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">
          Sanity WhatsApp Connection Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={testSanityConnection}
          disabled={isLoading}
          className="w-full">
          {isLoading ? "Testing..." : "Test Sanity Connection"}
        </Button>

        {testResults && (
          <div className="bg-gray-800 p-4 rounded-lg">
            <pre className="text-sm text-white overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
