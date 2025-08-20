"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getSupportContact, createCustomerAccount } from "@/lib/auth-service";
import {
  UserX,
  Phone,
  Mail,
  MessageCircle,
  ArrowLeft,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
} from "lucide-react";

export default function CustomerNotFoundPage() {
  const router = useRouter();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    location: "",
  });

  const supportContact = getSupportContact();

  const handleCopyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      "Hello! I need help creating a customer account for the Electrician Shop Management System. Please assist me with the registration process."
    );
    const whatsappUrl = `https://wa.me/${supportContact.whatsapp.replace(
      /[^0-9]/g,
      ""
    )}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleEmailContact = () => {
    const subject = encodeURIComponent(
      "Customer Account Request - Electrician Shop"
    );
    const body = encodeURIComponent(
      "Hello,\n\nI would like to request a customer account for the Electrician Shop Management System.\n\nPlease provide me with my Customer ID and Secret Key.\n\nThank you!"
    );
    const emailUrl = `mailto:${supportContact.email}?subject=${subject}&body=${body}`;
    window.open(emailUrl, "_blank");
  };

  const handlePhoneContact = () => {
    window.open(`tel:${supportContact.phone}`, "_blank");
  };

  const handleRequestAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await createCustomerAccount(formData);

      if (result.success && result.user) {
        setRequestStatus("success");
        // Show success with credentials
        alert(
          `Account created successfully!\n\nCustomer ID: ${result.user.customerId}\nSecret Key: ${result.user.secretKey}\n\nPlease save these credentials safely.`
        );

        // Redirect to login after a delay
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setRequestStatus("error");
      }
    } catch (error) {
      console.error("Failed to create account:", error);
      setRequestStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl">
        <Card className="bg-gray-900/80 backdrop-blur-sm border-gray-800 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-full mb-6 mx-auto shadow-lg">
              <UserX className="w-10 h-10 text-white" />
            </motion.div>

            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3">
              Customer Not Found
            </CardTitle>
            <p className="text-gray-400 text-lg">
              We couldn't find your customer account in our system
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Information Message */}
            <div className="sm:p-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-yellow-200 font-medium mb-1">
                    Account Required
                  </p>
                  <p className="text-yellow-300 text-sm">
                    To access the system, you need a customer account with a
                    valid Customer ID and Secret Key. Please contact our support
                    team to get your account created.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Contact Support
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                {/* WhatsApp */}
                <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors cursor-pointer">
                  <CardContent className="sm:p-4 p-3">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-green-600 rounded-full mb-3">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-medium text-white mb-2">WhatsApp</h4>
                      <p className="text-gray-400 text-sm mb-3">
                        {supportContact.whatsapp}
                      </p>
                      <div className="space-y-2">
                        <Button
                          onClick={handleWhatsAppContact}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          size="sm">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Chat Now
                        </Button>
                        <Button
                          onClick={() =>
                            handleCopyToClipboard(
                              supportContact.whatsapp,
                              "whatsapp"
                            )
                          }
                          variant="outline"
                          size="sm"
                          className="w-full">
                          {copiedText === "whatsapp" ? (
                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 mr-2" />
                          )}
                          Copy Number
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Phone */}
                <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors cursor-pointer">
                  <CardContent className="sm:p-4 p-3">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full mb-3">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-medium text-white mb-2">Phone</h4>
                      <p className="text-gray-400 text-sm mb-3">
                        {supportContact.phone}
                      </p>
                      <div className="space-y-2">
                        <Button
                          onClick={handlePhoneContact}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          size="sm">
                          <Phone className="w-4 h-4 mr-2" />
                          Call Now
                        </Button>
                        <Button
                          onClick={() =>
                            handleCopyToClipboard(supportContact.phone, "phone")
                          }
                          variant="outline"
                          size="sm"
                          className="w-full">
                          {copiedText === "phone" ? (
                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 mr-2" />
                          )}
                          Copy Number
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Email */}
                <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors cursor-pointer">
                  <CardContent className="sm:p-4 p-3">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 rounded-full mb-3">
                        <Mail className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-medium text-white mb-2">Email</h4>
                      <p className="text-gray-400 text-sm mb-3 break-all">
                        {supportContact.email}
                      </p>
                      <div className="space-y-2">
                        <Button
                          onClick={handleEmailContact}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                          size="sm">
                          <Mail className="w-4 h-4 mr-2" />
                          Send Email
                        </Button>
                        <Button
                          onClick={() =>
                            handleCopyToClipboard(supportContact.email, "email")
                          }
                          variant="outline"
                          size="sm"
                          className="w-full">
                          {copiedText === "email" ? (
                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 mr-2" />
                          )}
                          Copy Email
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Quick Account Request */}
            <div className="sm:p-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 font-medium">
                    Quick Account Request
                  </p>
                  <p className="text-blue-300 text-sm">
                    Fill out a quick form to request your customer account
                  </p>
                </div>
                <Button
                  onClick={() => setIsRequestModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Request Account
                </Button>
              </div>
            </div>

            {/* Back to Login */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => router.push("/login")}
                variant="outline"
                className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Request Modal */}
        <Modal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          title="Request Customer Account">
          {requestStatus === "success" ? (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Account Created!
              </h3>
              <p className="text-gray-400 mb-4">
                Your customer account has been created successfully. You will be
                redirected to the login page.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRequestAccount} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Full Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Phone Number *
                </label>
                <Input
                  type="number"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Enter your email (optional)"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Location/Address *
                </label>
                <Input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Enter your location"
                  required
                />
              </div>

              {requestStatus === "error" && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-200 text-sm">
                  Failed to create account. Please try again or contact support.
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="flex-1"
                  disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {isLoading ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </motion.div>
    </div>
  );
}
