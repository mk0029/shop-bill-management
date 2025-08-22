"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  MessageCircle,
  Phone,
  Building2,
  Mail,
  Globe,
  CheckCircle,
  Plus,
  Trash2,
  Settings,
  BarChart3,
  AlertTriangle,
  Smartphone,
  Key,
  User,
  Zap,
  RefreshCw,
  TestTube,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { WhatsAppDevice } from "@/lib/whatsapp-utils";
import { useWhatsAppConfig } from "@/hooks/use-whatsapp-config";
import { SanityWhatsAppTest } from "@/components/whatsapp/sanity-test";
import { setConfig } from "next/config";

export default function EnhancedWhatsAppSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("business");

  const {
    config,
    isLoading: configLoading,
    error,
    updateConfiguration,
    addDevice,
    removeDevice,
    updateDevice,
    toggleDevice,
    deviceAnalytics,
    refreshAnalytics,
    resetDailyCounters,
    testDeviceConnection,
  } = useWhatsAppConfig();

  const handleBusinessInfoChange = (field: string, value: string) => {
    if (!config) return;

    const updatedConfig = {
      ...config,
      businessInfo: {
        ...config.businessInfo,
        [field]: value,
      },
    };
    // Update local state immediately for better UX
    // The actual save will happen on form submit
  };

  const handleDeviceChange = (
    deviceName: string,
    field: keyof WhatsAppDevice,
    value: unknown
  ) => {
    updateDevice(deviceName, { [field]: value });
  };

  const handleAddDevice = () => {
    if (!config) return;

    const newDevice: WhatsAppDevice = {
      deviceName: `Device ${config.devices.length + 1}`,
      phoneNumber: "",
      userId: "",
      passKey: "",
      isActive: true,
      priority: config.devices.length + 1,
      maxDailyMessages: 1000,
      currentDailyCount: 0,
    };

    addDevice(newDevice);
  };

  const handleRemoveDevice = (deviceName: string) => {
    removeDevice(deviceName);
  };

  const handleLoadBalancingChange = (field: string, value: unknown) => {
    if (!config) return;

    const updatedConfig = {
      ...config,
      loadBalancing: {
        ...config.loadBalancing,
        [field]: value,
      },
    };
    // Update local state immediately
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setIsLoading(true);

    try {
      await updateConfiguration("default", config);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving WhatsApp config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestDevice = async (deviceName: string) => {
    try {
      const isConnected = await testDeviceConnection(deviceName);
      alert(
        isConnected
          ? "Device connection successful!"
          : "Device connection failed!"
      );
    } catch (error) {
      alert("Failed to test device connection");
    }
  };

  const handleResetCounters = async () => {
    try {
      await resetDailyCounters();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error resetting counters:", error);
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading WhatsApp configuration...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">No WhatsApp configuration found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Enhanced WhatsApp Configuration
          </h1>
          <p className="text-gray-400 mt-1">
            Manage multiple WhatsApp devices with authentication and load
            balancing
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Business
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Business Information Tab */}
          <TabsContent value="business">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="text-gray-300">
                      Business Name *
                    </Label>
                    <Input
                      id="businessName"
                      value={config.businessInfo.businessName}
                      onChange={(e) =>
                        handleBusinessInfoChange("businessName", e.target.value)
                      }
                      className="bg-gray-800 border-gray-700 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessEmail" className="text-gray-300">
                      Business Email
                    </Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      value={config.businessInfo.businessEmail || ""}
                      onChange={(e) =>
                        handleBusinessInfoChange(
                          "businessEmail",
                          e.target.value
                        )
                      }
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessAddress" className="text-gray-300">
                    Business Address *
                  </Label>
                  <Textarea
                    id="businessAddress"
                    value={config.businessInfo.businessAddress}
                    onChange={(e) =>
                      handleBusinessInfoChange(
                        "businessAddress",
                        e.target.value
                      )
                    }
                    className="bg-gray-800 border-gray-700 text-white"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessWebsite" className="text-gray-300">
                    Business Website
                  </Label>
                  <Input
                    id="businessWebsite"
                    type="url"
                    value={config.businessInfo.businessWebsite || ""}
                    onChange={(e) =>
                      handleBusinessInfoChange(
                        "businessWebsite",
                        e.target.value
                      )
                    }
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">
                  WhatsApp Devices
                </h3>
                <div className="flex gap-2">
                  <Button
                    onClick={handleResetCounters}
                    variant="outline"
                    className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Reset Counters
                  </Button>
                  <Button
                    onClick={handleAddDevice}
                    className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Device
                  </Button>
                </div>
              </div>

              {config.devices.map((device, index) => (
                <Card
                  key={device.deviceName}
                  className="bg-gray-900 border-gray-800">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Smartphone className="w-5 h-5" />
                      {device.deviceName}
                      {device.isActive ? (
                        <Badge variant="default" className="bg-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestDevice(device.deviceName)}
                        className="flex items-center gap-1">
                        <TestTube className="w-4 h-4" />
                        Test
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveDevice(device.deviceName)}
                        disabled={config.devices.length === 1}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Device Name</Label>
                        <Input
                          value={device.deviceName}
                          onChange={(e) =>
                            handleDeviceChange(
                              device.deviceName,
                              "deviceName",
                              e.target.value
                            )
                          }
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-50" />
                          <Input
                            value={device.phoneNumber}
                            onChange={(e) =>
                              handleDeviceChange(
                                device.deviceName,
                                "phoneNumber",
                                e.target.value
                              )
                            }
                            className="pl-10 bg-gray-800 border-gray-700 text-white"
                            placeholder="+917015493276"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">User ID</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-50" />
                          <Input
                            value={device.userId}
                            onChange={(e) =>
                              handleDeviceChange(
                                device.deviceName,
                                "userId",
                                e.target.value
                              )
                            }
                            className="pl-10 bg-gray-800 border-gray-700 text-white"
                            placeholder="whatsapp_user_id"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Pass Key</Label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-50" />
                          <Input
                            type="password"
                            value={device.passKey}
                            onChange={(e) =>
                              handleDeviceChange(
                                device.deviceName,
                                "passKey",
                                e.target.value
                              )
                            }
                            className="pl-10 bg-gray-800 border-gray-700 text-white"
                            placeholder="authentication_key"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">
                          API Endpoint (Optional)
                        </Label>
                        <Input
                          value={device.apiEndpoint || ""}
                          onChange={(e) =>
                            handleDeviceChange(
                              device.deviceName,
                              "apiEndpoint",
                              e.target.value
                            )
                          }
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="https://api.whatsapp.com/v1/messages"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Priority</Label>
                        <Input
                          type="number"
                          value={device.priority}
                          onChange={(e) =>
                            handleDeviceChange(
                              device.deviceName,
                              "priority",
                              parseInt(e.target.value)
                            )
                          }
                          className="bg-gray-800 border-gray-700 text-white"
                          min="1"
                          max="10"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">
                          Max Daily Messages
                        </Label>
                        <Input
                          type="number"
                          value={device.maxDailyMessages}
                          onChange={(e) =>
                            handleDeviceChange(
                              device.deviceName,
                              "maxDailyMessages",
                              parseInt(e.target.value)
                            )
                          }
                          className="bg-gray-800 border-gray-700 text-white"
                          min="1"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={device.isActive}
                          onCheckedChange={(checked) =>
                            handleDeviceChange(
                              device.deviceName,
                              "isActive",
                              checked
                            )
                          }
                        />
                        <Label className="text-gray-300">Active</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Load Balancing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Strategy</Label>
                      <select
                        value={config.loadBalancing.strategy}
                        onChange={(e) =>
                          handleLoadBalancingChange("strategy", e.target.value)
                        }
                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white">
                        <option value="priority">Priority Based</option>
                        <option value="roundRobin">Round Robin</option>
                        <option value="leastUsed">Least Used</option>
                        <option value="random">Random</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Retry Attempts</Label>
                      <Input
                        type="number"
                        value={config.loadBalancing.retryAttempts}
                        onChange={(e) =>
                          handleLoadBalancingChange(
                            "retryAttempts",
                            parseInt(e.target.value)
                          )
                        }
                        className="bg-gray-800 border-gray-700 text-white"
                        min="1"
                        max="10"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.loadBalancing.failoverEnabled}
                      onCheckedChange={(checked) =>
                        handleLoadBalancingChange("failoverEnabled", checked)
                      }
                    />
                    <Label className="text-gray-300">Enable Failover</Label>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Message Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Bill Template</Label>
                    <Textarea
                      value={config.messageTemplate.billTemplate}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          messageTemplate: {
                            ...prev.messageTemplate,
                            billTemplate: e.target.value,
                          },
                        }))
                      }
                      className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                      rows={15}
                    />
                    <p className="text-xs text-gray-400">
                      Use {"{variable}"} for dynamic content. Available
                      variables: businessName, billNumber, customerName,
                      customerPhone, userId, passKey, billDate, dueDate,
                      itemsList, subtotal, total, notes, businessAddress,
                      businessEmail, businessWebsite
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              {/* Sanity Connection Test */}
              <SanityWhatsAppTest />

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Device Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {deviceAnalytics.map((device, index) => (
                      <div key={index} className="p-4 bg-gray-800 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-white">
                            {device.deviceName}
                          </h4>
                          <Badge
                            variant={device.isActive ? "default" : "secondary"}>
                            {device.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Phone</p>
                            <p className="text-white">{device.phoneNumber}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Daily Usage</p>
                            <p className="text-white">
                              {device.dailyUsage}/{device.maxDaily}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Usage %</p>
                            <p className="text-white">
                              {device.usagePercentage.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Last Used</p>
                            <p className="text-white">
                              {device.lastUsed
                                ? new Date(device.lastUsed).toLocaleString()
                                : "Never"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min(device.usagePercentage, 100)}%`,
                              }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Submit Button */}
        <div className="flex gap-4 pt-6">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isLoading ? "Saving..." : "Save Configuration"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle className="w-5 h-5" />
          <span>Configuration saved successfully!</span>
        </div>
      )}
    </div>
  );
}
