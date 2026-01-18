// Debug script to check inventory cash book integration
// Run this in browser console when adding inventory

console.log("🔍 Starting Inventory Cash Book Debug...");

// Override console.log to capture all logs
const originalLog = console.log;
const originalError = console.error;
const cashBookLogs = [];

console.log = function (...args) {
  if (
    args[0] &&
    typeof args[0] === "string" &&
    (args[0].includes("cash book") ||
      args[0].includes("Creating cash book") ||
      args[0].includes("Inventory debit"))
  ) {
    cashBookLogs.push({
      type: "log",
      args: [...args],
      timestamp: new Date().toISOString(),
    });
    originalLog.apply(console, ["🔍 CASH BOOK LOG:", ...args]);
  } else {
    originalLog.apply(console, args);
  }
};

console.error = function (...args) {
  if (
    args[0] &&
    typeof args[0] === "string" &&
    (args[0].includes("cash book") ||
      args[0].includes("Failed to create cash book"))
  ) {
    cashBookLogs.push({
      type: "error",
      args: [...args],
      timestamp: new Date().toISOString(),
    });
    originalError.apply(console, ["🔍 CASH BOOK ERROR:", ...args]);
  } else {
    originalError.apply(console, args);
  }
};

// Monitor fetch requests for cash book API calls
const originalFetch = window.fetch;
window.fetch = function (...args) {
  const url = args[0];
  if (typeof url === "string" && url.includes("/api/cash-book")) {
    console.log("🔍 CASH BOOK API CALL:", url, args[1]);
    cashBookLogs.push({
      type: "api_call",
      url: url,
      options: args[1],
      timestamp: new Date().toISOString(),
    });
  }
  return originalFetch.apply(this, args);
};

// Function to show debug results
window.showCashBookDebug = function () {
  console.log("📊 Cash Book Debug Results:");
  console.log("Total logs captured:", cashBookLogs.length);
  cashBookLogs.forEach((log, index) => {
    console.log(
      `${index + 1}. [${log.timestamp}] ${log.type.toUpperCase()}:`,
      log.args || log.url,
    );
  });

  if (cashBookLogs.length === 0) {
    console.log("❌ No cash book activity detected!");
    console.log("🔧 Try adding inventory and check:");
    console.log("   1. Are you logged in?");
    console.log("   2. Is the inventory store working?");
    console.log("   3. Are there any JavaScript errors?");
  } else {
    console.log("✅ Cash book activity detected!");
  }
};

console.log(
  "🔍 Debug monitoring active. Add inventory and then run: showCashBookDebug()",
);
