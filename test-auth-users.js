require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@sanity/client");

const client = createClient({
  projectId: "idji8ni7",
  dataset: "production",
  useCdn: false,
  apiVersion: "2024-01-01",
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
});

// Helper function to generate IDs
const generateId = () =>
  Buffer.from(Date.now().toString() + Math.random().toString())
    .toString("base64")
    .substring(0, 12);

async function createTestUsers() {
  console.log("🔐 Creating test authentication users...");

  try {
    // Create test admin user
    const adminUser = {
      _type: "user",
      clerkId: "admin_test_123",
      customerId: "admin",
      secretKey: "admin123",
      name: "Admin User",
      email: "admin@electricianshop.com",
      phone: "+91-9876543210",
      location: "Shop Office, Main Street",
      role: "admin",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdAdmin = await client.create(adminUser);
    console.log("✅ Created admin user:", createdAdmin._id);
    console.log("   Customer ID: admin");
    console.log("   Secret Key: admin123");

    // Create test customer user
    const customerUser = {
      _type: "user",
      clerkId: "customer_test_456",
      customerId: "customer1",
      secretKey: "secret123",
      name: "John Customer",
      email: "john@example.com",
      phone: "+91-9876543211",
      location: "Customer Address, City, State",
      role: "customer",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdCustomer = await client.create(customerUser);
    console.log("✅ Created customer user:", createdCustomer._id);
    console.log("   Customer ID: customer1");
    console.log("   Secret Key: secret123");

    // Create another customer with generated credentials
    const customerId = generateId();
    const secretKey = generateId();

    const customer2 = {
      _type: "user",
      clerkId: "customer_test_789",
      customerId,
      secretKey,
      name: "Sarah Customer",
      email: "sarah@example.com",
      phone: "+91-9876543212",
      location: "Another Address, City, State",
      role: "customer",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdCustomer2 = await client.create(customer2);
    console.log("✅ Created customer user 2:", createdCustomer2._id);
    console.log("   Customer ID:", customerId);
    console.log("   Secret Key:", secretKey);

    console.log("\n🎉 Test users created successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("Admin Login:");
    console.log("  Customer ID: admin");
    console.log("  Secret Key: admin123");
    console.log("\nCustomer Login:");
    console.log("  Customer ID: customer1");
    console.log("  Secret Key: secret123");
    console.log("\nCustomer 2 Login:");
    console.log(`  Customer ID: ${customerId}`);
    console.log(`  Secret Key: ${secretKey}`);

    return {
      success: true,
      users: [createdAdmin, createdCustomer, createdCustomer2],
    };
  } catch (error) {
    console.error("❌ Error creating test users:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the creation
createTestUsers().then((result) => {
  if (result.success) {
    console.log("\n✅ All test users created successfully!");
    console.log("You can now test the authentication system.");
  } else {
    console.log("\n❌ Failed to create test users:", result.error);
  }
  process.exit(result.success ? 0 : 1);
});
