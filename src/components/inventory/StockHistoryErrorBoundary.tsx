/**
 * Error Boundary for Stock History Page
 * Catches and displays errors gracefully
 */

"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class StockHistoryErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Stock History Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-6 max-md:space-y-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
              Stock History
            </h1>
            <p className="text-gray-400 mt-1">
              Track all inventory transactions and stock movements
            </p>
          </div>

          <Card className="bg-red-900/20 border-red-800">
            <CardContent>
              <div className="flex items-start gap-4">
                <AlertTriangle className=" h-6 w-6 sm:w-8 sm:h-8  text-red-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-300 mb-2">
                    Something went wrong
                  </h3>
                  <p className="text-red-200 mb-4">
                    The stock history page encountered an error and couldn't
                    load properly.
                  </p>
                  {this.state.error && (
                    <details className="mb-4">
                      <summary className="text-red-300 cursor-pointer hover:text-red-200">
                        Error Details
                      </summary>
                      <pre className="mt-2 p-3 bg-red-950/50 rounded text-xs text-red-200 overflow-auto">
                        {this.state.error.message}
                        {this.state.error.stack && (
                          <>
                            {"\n\n"}
                            {this.state.error.stack}
                          </>
                        )}
                      </pre>
                    </details>
                  )}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        this.setState({ hasError: false, error: undefined });
                      }}
                      className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.location.reload()}
                      className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Reload Page
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fallback content */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent>
              <h3 className="text-white font-semibold mb-3">
                Alternative Actions
              </h3>
              <div className="space-y-2 text-gray-300">
                <p>
                  • Check the browser console for detailed error information
                </p>
                <p>• Verify your internet connection</p>
                <p>• Try refreshing the page</p>
                <p>• Contact support if the problem persists</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
