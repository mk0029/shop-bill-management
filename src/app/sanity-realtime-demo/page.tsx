"use client";

import { SanityRealtimeProvider } from "@/components/providers/SanityRealtimeProvider";
import { SanityRealtimeBillList } from "@/components/bills/SanityRealtimeBillList";
import { RealtimeInventoryStatus } from "@/components/inventory/RealtimeInventoryStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SanityRealtimeDemoPage() {
  return (
    <SanityRealtimeProvider>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Sanity Real-time Updates Demo
            </h1>
            <p className="text-gray-600 mt-2">
              See live updates powered by Sanity's real-time infrastructure
              across all connected clients
            </p>
          </div>
        </div>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>How Sanity Real-time Updates Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <div>
                  <strong>Sanity Real-time:</strong> Uses Sanity's built-in
                  real-time listeners to detect document changes
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <div>
                  <strong>Automatic Sync:</strong> When you create/update/delete
                  documents, all clients receive updates instantly
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <div>
                  <strong>No External Server:</strong> No need for Socket.io or
                  external WebSocket servers
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <div>
                  <strong>Multi-device Sync:</strong> Open this page in multiple
                  tabs or devices to see real-time synchronization
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sanity Real-time Bills */}
          <div>
            <SanityRealtimeBillList />
          </div>

          {/* Real-time Inventory (still works with Sanity updates) */}
          <div>
            <RealtimeInventoryStatus />
          </div>
        </div>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle>Sanity Real-time Implementation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Sanity Features:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Built-in real-time listeners</li>
                  <li>• Document change detection</li>
                  <li>• Automatic client synchronization</li>
                  <li>• No external infrastructure needed</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Frontend Integration:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Zustand stores with Sanity integration</li>
                  <li>• React hooks for real-time events</li>
                  <li>• Optimistic UI updates</li>
                  <li>• Automatic error handling</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Sanity vs Socket.io Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-green-600">
                  ✅ Sanity Real-time (Recommended)
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• No external server required</li>
                  <li>• Built-in to your CMS</li>
                  <li>• Automatic document synchronization</li>
                  <li>• Handles connection management</li>
                  <li>• Scales automatically</li>
                  <li>• Works with your existing data</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-orange-600">
                  ⚠️ Socket.io Approach
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Requires separate server</li>
                  <li>• Manual event management</li>
                  <li>• Additional infrastructure</li>
                  <li>• Connection handling complexity</li>
                  <li>• Scaling considerations</li>
                  <li>• Duplicate data synchronization</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SanityRealtimeProvider>
  );
}
