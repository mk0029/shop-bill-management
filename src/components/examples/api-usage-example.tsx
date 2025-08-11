"use client";

import React, { useState } from "react";
import { useSanityApi } from "../../hooks/use-sanity-api";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Table } from "../ui/table";
import { Dropdown } from "../ui/dropdown";

export const ApiUsageExample: React.FC = () => {
  const api = useSanityApi();
  const [selectedTab, setSelectedTab] = useState<
    "users" | "products" | "bills"
  >("users");

  // Example user creation
  const handleCreateUser = async () => {
    await api.users.createUser.execute({
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      location: "New York",
      role: "customer",
    });
  };

  // Example product creation
  const handleCreateProduct = async () => {
    await api.products.createProduct.execute({
      name: "LED Bulb 10W",
      description: "Energy efficient LED bulb",
      brand: { _type: "reference", _ref: "brand-id" },
      category: { _type: "reference", _ref: "category-id" },
      pricing: {
        costPrice: 50,
        sellingPrice: 100,
        mrp: 120,
      },
      inventory: {
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 500,
        unit: "pcs",
      },
    });
  };

  // Example bill creation
  const handleCreateBill = async () => {
    await api.bills.createBill.execute({
      customer: { _type: "reference", _ref: "user-id" },
      serviceType: "sale",
      locationType: "shop",
      totalAmount: 500,
      items: [
        {
          product: { _type: "reference", _ref: "product-id" },
          quantity: 2,
          unitPrice: 250,
          totalPrice: 500,
        },
      ],
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sanity API Usage Examples</h1>
        <div className="flex space-x-2">
          <Button
            variant={selectedTab === "users" ? "default" : "outline"}
            onClick={() => setSelectedTab("users")}
          >
            Users
          </Button>
          <Button
            variant={selectedTab === "products" ? "default" : "outline"}
            onClick={() => setSelectedTab("products")}
          >
            Products
          </Button>
          <Button
            variant={selectedTab === "bills" ? "default" : "outline"}
            onClick={() => setSelectedTab("bills")}
          >
            Bills
          </Button>
        </div>
      </div>

      {/* Users Tab */}
      {selectedTab === "users" && (
        <div className="space-y-6">
          <Card className="p-4 md:p-6">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="userName">Name</Label>
                <Input id="userName" placeholder="Enter user name" />
              </div>
              <div>
                <Label htmlFor="userEmail">Email</Label>
                <Input id="userEmail" type="email" placeholder="Enter email" />
              </div>
              <div>
                <Label htmlFor="userPhone">Phone</Label>
                <Input id="userPhone" placeholder="Enter phone number" />
              </div>
              <div>
                <Label htmlFor="userLocation">Location</Label>
                <Input id="userLocation" placeholder="Enter location" />
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={handleCreateUser}
                disabled={api.users.createUser.loading}
              >
                {api.users.createUser.loading ? "Creating..." : "Create User"}
              </Button>
              <Button
                variant="outline"
                onClick={() => api.users.getAllUsers.execute()}
                disabled={api.users.getAllUsers.loading}
              >
                {api.users.getAllUsers.loading
                  ? "Loading..."
                  : "Load All Users"}
              </Button>
              <Button
                variant="outline"
                onClick={() => api.users.getCustomers.execute()}
                disabled={api.users.getCustomers.loading}
              >
                {api.users.getCustomers.loading
                  ? "Loading..."
                  : "Load Customers"}
              </Button>
            </div>

            {api.users.createUser.error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {api.users.createUser.error}
              </div>
            )}

            {api.users.createUser.data && (
              <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                User created successfully: {api.users.createUser.data.name}
              </div>
            )}

            {/* Display Users */}
            {(api.users.getAllUsers.data || api.users.getCustomers.data) && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Users</h3>
                <Table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      api.users.getAllUsers.data ||
                      api.users.getCustomers.data ||
                      []
                    ).map((user: any) => (
                      <tr key={user._id}>
                        <td>{user.name}</td>
                        <td>{user.email || "-"}</td>
                        <td>{user.phone}</td>
                        <td>
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : "secondary"
                            }
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td>
                          <Badge
                            variant={user.isActive ? "default" : "destructive"}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Products Tab */}
      {selectedTab === "products" && (
        <div className="space-y-6">
          <Card className="p-4 md:p-6">
            <h2 className="text-xl font-semibold mb-4">Product Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="productName">Product Name</Label>
                <Input id="productName" placeholder="Enter product name" />
              </div>
              <div>
                <Label htmlFor="productDescription">Description</Label>
                <Textarea
                  id="productDescription"
                  placeholder="Enter product description"
                />
              </div>
              <div>
                <Label htmlFor="productCost">Cost Price</Label>
                <Input
                  id="productCost"
                  type="number"
                  placeholder="Enter cost price"
                />
              </div>
              <div>
                <Label htmlFor="productSelling">Selling Price</Label>
                <Input
                  id="productSelling"
                  type="number"
                  placeholder="Enter selling price"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={handleCreateProduct}
                disabled={api.products.createProduct.loading}
              >
                {api.products.createProduct.loading
                  ? "Creating..."
                  : "Create Product"}
              </Button>
              <Button
                variant="outline"
                onClick={() => api.products.getAllProducts.execute()}
                disabled={api.products.getAllProducts.loading}
              >
                {api.products.getAllProducts.loading
                  ? "Loading..."
                  : "Load All Products"}
              </Button>
              <Button
                variant="outline"
                onClick={() => api.products.getActiveProducts.execute()}
                disabled={api.products.getActiveProducts.loading}
              >
                {api.products.getActiveProducts.loading
                  ? "Loading..."
                  : "Load Active Products"}
              </Button>
            </div>

            {api.products.createProduct.error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {api.products.createProduct.error}
              </div>
            )}

            {api.products.createProduct.data && (
              <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                Product created successfully:{" "}
                {api.products.createProduct.data.name}
              </div>
            )}

            {/* Display Products */}
            {(api.products.getAllProducts.data ||
              api.products.getActiveProducts.data) && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Products</h3>
                <Table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Brand</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      api.products.getAllProducts.data ||
                      api.products.getActiveProducts.data ||
                      []
                    ).map((product: any) => (
                      <tr key={product._id}>
                        <td>{product.name}</td>
                        <td>{product.brand?.name || "-"}</td>
                        <td>{product.category?.name || "-"}</td>
                        <td>₹{product.pricing?.sellingPrice || 0}</td>
                        <td>{product.inventory?.currentStock || 0}</td>
                        <td>
                          <Badge
                            variant={
                              product.isActive ? "default" : "destructive"
                            }
                          >
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Bills Tab */}
      {selectedTab === "bills" && (
        <div className="space-y-6">
          <Card className="p-4 md:p-6">
            <h2 className="text-xl font-semibold mb-4">Bill Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="billCustomer">Customer</Label>
                <Input id="billCustomer" placeholder="Select customer" />
              </div>
              <div>
                <Label htmlFor="billServiceType">Service Type</Label>
                <Dropdown
                  options={[
                    { value: "sale", label: "Sale" },
                    { value: "repair", label: "Repair" },
                    { value: "installation", label: "Installation" },
                    { value: "maintenance", label: "Maintenance" },
                  ]}
                  value=""
                  onValueChange={() => {}}
                  placeholder="Select Service Type"
                />
              </div>
              <div>
                <Label htmlFor="billLocation">Location Type</Label>
                <Dropdown
                  options={[
                    { value: "shop", label: "Shop" },
                    { value: "home", label: "Home" },
                    { value: "office", label: "Office" },
                  ]}
                  value=""
                  onValueChange={() => {}}
                  placeholder="Select Location"
                />
              </div>
              <div>
                <Label htmlFor="billAmount">Total Amount</Label>
                <Input
                  id="billAmount"
                  type="number"
                  placeholder="Enter total amount"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={handleCreateBill}
                disabled={api.bills.createBill.loading}
              >
                {api.bills.createBill.loading ? "Creating..." : "Create Bill"}
              </Button>
              <Button
                variant="outline"
                onClick={() => api.bills.getAllBills.execute()}
                disabled={api.bills.getAllBills.loading}
              >
                {api.bills.getAllBills.loading
                  ? "Loading..."
                  : "Load All Bills"}
              </Button>
            </div>

            {api.bills.createBill.error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {api.bills.createBill.error}
              </div>
            )}

            {api.bills.createBill.data && (
              <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                Bill created successfully:{" "}
                {api.bills.createBill.data.billNumber}
              </div>
            )}

            {/* Display Bills */}
            {api.bills.getAllBills.data && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Bills</h3>
                <Table>
                  <thead>
                    <tr>
                      <th>Bill Number</th>
                      <th>Customer</th>
                      <th>Service Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {api.bills.getAllBills.data.map((bill: any) => (
                      <tr key={bill._id}>
                        <td>{bill.billNumber}</td>
                        <td>{bill.customer?.name || "-"}</td>
                        <td>
                          <Badge variant="outline">{bill.serviceType}</Badge>
                        </td>
                        <td>₹{bill.totalAmount || 0}</td>
                        <td>
                          <Badge
                            variant={
                              bill.status === "completed"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {bill.status}
                          </Badge>
                        </td>
                        <td>
                          <Badge
                            variant={
                              bill.paymentStatus === "paid"
                                ? "default"
                                : bill.paymentStatus === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {bill.paymentStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Error Display */}
      <div className="space-y-4">
        {Object.entries(api).map(([serviceName, service]) => {
          const errors = Object.values(service).filter(
            (operation: any) => operation.error
          );
          if (errors.length === 0) return null;

          return (
            <Card
              key={serviceName}
              className="sm:p-4 p-3 border-red-200 bg-red-50"
            >
              <h3 className="font-medium text-red-800 mb-2">
                {serviceName} Errors:
              </h3>
              {errors.map((operation: any, index: number) => (
                <div key={index} className="text-red-700 text-sm">
                  {operation.error}
                </div>
              ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
