export type NotificationCustomer = {
  name?: string;
};

type BillLike = {
  _id?: string;
  billId?: string;
  billNumber?: string;
  totalAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  dueDate?: string;
  paymentStatus?: string;
  serviceName?: string;
  service?: string;
  serviceType?: string;
  technicianName?: string;
  technician?: string;
  items?: Array<{ name?: string; description?: string; price?: number }>;
  notes?: string;
  note?: string;
};

export function formatCurrency(value: unknown) {
  const n = Number(value || 0);
  const safe = Number.isFinite(n) ? n : 0;
  const hasDecimals = Math.round(safe * 100) % 100 !== 0;
  return `\u20b9${safe.toLocaleString("en-IN", { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(date);
}

export function formatCustomerName(customerOrName?: NotificationCustomer | string | null) {
  if (typeof customerOrName === "string") return customerOrName.trim() || "Customer";
  return String(customerOrName?.name || "Customer").trim() || "Customer";
}

export function greetingByTime(customerOrName?: NotificationCustomer | string | null, date = new Date()) {
  const name = formatCustomerName(customerOrName);
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(date));
  if (hour >= 5 && hour < 12) return `Good Morning, ${name}.`;
  if (hour >= 12 && hour < 17) return `Good Afternoon, ${name}.`;
  if (hour >= 17 && hour < 22) return `Good Evening, ${name}.`;
  return `Dear ${name},`;
}

export function greetingText(customerOrName?: NotificationCustomer | string | null) {
  return `Dear ${formatCustomerName(customerOrName)},`;
}

export function signature() {
  return "Regards,\nJambh Electricals";
}

function pendingAmount(bill: BillLike) {
  if (typeof bill.balanceAmount === "number") return Math.max(0, bill.balanceAmount);
  return Math.max(0, Number(bill.totalAmount || 0) - Number(bill.paidAmount || 0));
}

function billLabel(bill: BillLike) {
  return bill.billNumber || bill.billId || bill._id || "Invoice";
}

export function generateBillId(bill: BillLike) {
  return billLabel(bill);
}

export function totalOutstanding(bills: BillLike[] = []) {
  return bills.reduce((sum, bill) => sum + pendingAmount(bill), 0);
}

export function formatInvoiceList(bills: BillLike[] = []) {
  const heading = bills.length === 1 ? "Outstanding Invoice" : "Outstanding Invoices";
  const lines = [heading, ""];
  for (const bill of bills.slice(0, 5)) lines.push(`\u2022 ${billLabel(bill)} \u2014 ${formatCurrency(pendingAmount(bill))}`);
  if (bills.length > 5) lines.push(`...and ${bills.length - 5} more outstanding invoices.`);
  return lines.join("\n");
}

export function secureAccountSection(loginUrl?: string) {
  if (!loginUrl) return null;
  return [
    "\uD83D\uDD10 Your Secure Account",
    "",
    "Click the link below to log in and securely access your account.",
    "",
    "From your account you can:",
    "",
    "\u2022 View all invoices",
    "\u2022 Make secure payments",
    "\u2022 Track payment history",
    "\u2022 Place new service requests",
    "\u2022 View order status",
    "\u2022 Access your account anytime",
    "",
    loginUrl,
  ].join("\n");
}

export function footerText() {
  return [
    "Thank you for choosing Jambh Electricals.",
    "",
    "If you have any questions, simply reply to this message and our team will be happy to assist you.",
    "",
    "Regards,",
    "Jambh Electricals",
  ].join("\n");
}

export function billDetailLineTS(bill: BillLike, index: number) {
  const lines = [
    `${index}) Bill ID: ${billLabel(bill)}`,
    `   Amount: ${formatCurrency(pendingAmount(bill))}`,
    bill.serviceName || bill.service || bill.serviceType ? `   Service: ${bill.serviceName || bill.service || bill.serviceType}` : null,
    bill.dueDate ? `   Date: ${formatDate(bill.dueDate)}` : null,
    bill.technicianName || bill.technician ? `   Technician: ${bill.technicianName || bill.technician}` : null,
  ];
  const items = bill.items || [];
  if (items.length > 0) {
    for (const item of items) {
      const label = item.name || item.description || "";
      const price = item.price ? ` \u2014 ${formatCurrency(item.price)}` : "";
      lines.push(`   \u2022 ${label}${price}`);
    }
  }
  const billNotes = bill.notes || bill.note || "";
  if (billNotes) {
    lines.push(`   Note: ${billNotes}`);
  }
  return lines.filter((p): p is string => p !== undefined && p !== null).join("\n");
}

export function billReminderCompose({ customerName, title, introLines, billCount, totalAmount, billDetails, actionLine, loginUrl }: {
  customerName: NotificationCustomer | string | null | undefined;
  title: string;
  introLines: string | string[];
  billCount: number;
  totalAmount: string;
  billDetails: string;
  actionLine: string;
  loginUrl?: string;
}) {
  const lines = [
    `Dear ${formatCustomerName(customerName)},`,
    "",
    `\uD83D\uDD14 ${title}`,
    "",
    ...(Array.isArray(introLines) ? introLines : [introLines]).filter(Boolean),
    "Here\u2019s a quick summary:",
    "",
    `\u2022 Total Pending Amount: ${totalAmount}`,
    `\u2022 Number of Pending Bills: ${billCount}`,
    "",
    "\uD83E\uDDFE Bill Details:",
    "",
    billDetails,
    "",
    `\uD83D\uDCA1 ${actionLine}`,
    "Timely payment helps us continue uninterrupted service.",
  ];

  if (loginUrl) {
    lines.push(
      "",
      "\uD83D\uDD10 View & pay your bills securely here:",
      loginUrl,
      "Your account is private \u2014 only you can access your billing info.",
    );
  }

  lines.push(
    "",
    "Thank you for choosing us \uD83D\uDE4F",
    "\u2014 Jambh Electrical Services",
  );

  return lines.join("\n");
}

export function composeMessage({ title, greeting, bodyParts = [], loginUrl }: { title: string; greeting: string; bodyParts: Array<string | undefined | false | null>; loginUrl?: string }) {
  const lines = [
    title,
    "",
    greeting,
    "",
    ...bodyParts.filter((p) => p !== undefined && p !== null && p !== false),
  ];

  const secureSection = loginUrl ? secureAccountSection(loginUrl) : null;
  if (secureSection) {
    lines.push("");
    lines.push(secureSection);
  }

  lines.push("");
  lines.push(footerText());

  return lines.join("\n");
}

export const notificationTemplates = {
  billCreated(input: { customer: NotificationCustomer; bill: BillLike; loginUrl?: string }) {
    const bill = input.bill;
    return composeMessage({
      title: "Bill Created",
      greeting: greetingText(input.customer),
      bodyParts: [
        "A new bill has been created in your account.",
        "",
        "Bill Details",
        "",
        `\u2022 Bill ID: ${billLabel(bill)}`,
        `\u2022 Amount: ${formatCurrency(bill.totalAmount)}`,
        bill.dueDate ? `\u2022 Due Date: ${formatDate(bill.dueDate)}` : null,
        bill.serviceName ? `\u2022 Service: ${bill.serviceName}` : null,
        bill.technicianName || bill.technician ? `\u2022 Technician: ${bill.technicianName || bill.technician}` : null,
        "",
        "Please review the details and complete the payment by the due date.",
      ],
      loginUrl: input.loginUrl,
    });
  },

  paymentReceived(input: { customer: NotificationCustomer; bill: BillLike; loginUrl?: string }) {
    const bill = input.bill;
    const customerDisplay = formatCustomerName(input.customer);
    const paid = formatCurrency(bill.paidAmount || bill.totalAmount || 0);
    const total = formatCurrency(bill.totalAmount || 0);
    const remaining = formatCurrency(pendingAmount(bill));
    return [
      "✅ Payment Received Successfully",
      "",
      `Dear ${customerDisplay},`,
      "",
      "We have successfully received your payment. Thank you for choosing Jambh Electricals.",
      "",
      "🧾 Bill Details",
      `• Bill ID: ${billLabel(bill)}`,
      "",
      "💳 Payment Summary",
      `• Total Amount: ${total}`,
      `• Amount Paid: ${paid}`,
      `• Remaining Balance: ${remaining}`,
      "",
      "✅ Bill Status: PAID",
      "",
      "Your payment has been successfully recorded. We appreciate your prompt payment and value the trust you place in us.",
      "",
      "If you have any questions or need assistance, simply reply to this message. Our team will be happy to help.",
      "",
      "Thank you for your business. We look forward to serving you again.",
      "",
      "Regards,",
      "Jambh Electricals",
    ].join("\n");
  },

  customerDetails(input: { customer: NotificationCustomer & { location?: string } }) {
    return composeMessage({
      title: "Customer Details",
      greeting: greetingText(input.customer),
      bodyParts: [
        "Your customer details have been shared.",
        input.customer.location ? `Location: ${input.customer.location}` : null,
        "",
        "Please contact us if any information needs to be updated.",
      ],
    });
  },

  paymentReminder(input: { customer: NotificationCustomer; bills: BillLike[]; dueDate?: string; loginUrl?: string }) {
    const bills = input.bills || [];
    const count = bills.length;
    const total = totalOutstanding(bills);
    const billDetails = bills.map((b, i) => billDetailLineTS(b, i + 1)).join("\n\n");
    return billReminderCompose({
      customerName: input.customer,
      title: "Payment Reminder \u2013 Pending Bills",
      introLines: `We noticed that you have ${count} pending bills with us.`,
      billCount: count,
      totalAmount: formatCurrency(total),
      billDetails,
      actionLine: "Please clear the pending amount at your earliest convenience.",
      loginUrl: input.loginUrl,
    });
  },

  workRequest(input: { customer: NotificationCustomer; request: { requestId?: string; _id?: string; title?: string; serviceType?: string; status?: string; priority?: string } }) {
    return composeMessage({
      title: "Work Request Update",
      greeting: greetingText(input.customer),
      bodyParts: [
        "Your work request details have been shared.",
        `Request: ${input.request.requestId || input.request._id || "-"}`,
        input.request.title || input.request.serviceType ? `Work: ${input.request.title || input.request.serviceType}` : null,
        input.request.status ? `Status: ${input.request.status}` : null,
        input.request.priority ? `Priority: ${input.request.priority}` : null,
        "",
        "We will keep you updated.",
      ],
    });
  },

  // New templates following the same design language
  welcome(input: { customer: NotificationCustomer; loginUrl?: string }) {
    return composeMessage({
      title: "Welcome to Jambh Electricals",
      greeting: greetingText(input.customer),
      bodyParts: [
        "We are delighted to welcome you to Jambh Electricals.",
        "",
        "It is our privilege to serve you with reliable electrical services and products. Our team is committed to delivering quality and professionalism in every interaction.",
      ],
      loginUrl: input.loginUrl,
    });
  },

  accountCreated(input: { customer: NotificationCustomer; loginUrl?: string }) {
    return composeMessage({
      title: "Account Created",
      greeting: greetingText(input.customer),
      bodyParts: [
        "Your customer account has been created successfully.",
        "",
        "From your account you can:",
        "",
        "\u2022 View all invoices and payment history",
        "\u2022 Make secure payments online",
        "\u2022 Track service requests and orders",
        "\u2022 Update your profile and preferences",
      ],
      loginUrl: input.loginUrl,
    });
  },

  billUpdated(input: { customer: NotificationCustomer; bill: BillLike; loginUrl?: string }) {
    const bill = input.bill;
    return composeMessage({
      title: "Bill Updated",
      greeting: greetingText(input.customer),
      bodyParts: [
        "Your bill has been updated. Please review the revised details below.",
        "",
        "Bill Details",
        "",
        `\u2022 Bill ID: ${billLabel(bill)}`,
        `\u2022 Amount: ${formatCurrency(bill.totalAmount)}`,
        bill.serviceName ? `\u2022 Service: ${bill.serviceName}` : null,
        `\u2022 Balance: ${formatCurrency(bill.balanceAmount ?? bill.totalAmount ?? 0)}`,
        bill.technicianName ? `\u2022 Technician: ${bill.technicianName}` : null,
      ],
      loginUrl: input.loginUrl,
    });
  },

  billDeleted(input: { customer: NotificationCustomer; bill: BillLike }) {
    const bill = input.bill;
    return composeMessage({
      title: "Bill Deleted",
      greeting: greetingText(input.customer),
      bodyParts: [
        "The following bill has been removed from your account.",
        "",
        "Bill Details",
        "",
        `\u2022 Bill ID: ${billLabel(bill)}`,
        bill.serviceName ? `\u2022 Service: ${bill.serviceName}` : null,
        `\u2022 Amount: ${formatCurrency(bill.totalAmount)}`,
        "",
        "If you have any questions regarding this deletion, please reply to this message.",
      ],
    });
  },

  paymentPartial(input: { customer: NotificationCustomer; bill: BillLike; loginUrl?: string }) {
    const bill = input.bill;
    const customerDisplay = formatCustomerName(input.customer);
    const paid = formatCurrency(bill.paidAmount || 0);
    const total = formatCurrency(bill.totalAmount || 0);
    const remaining = formatCurrency(pendingAmount(bill));
    return [
      "✅ Partial Payment Received",
      "",
      `Dear ${customerDisplay},`,
      "",
      "We have successfully received your partial payment. Thank you for choosing Jambh Electricals.",
      "",
      "🧾 Bill Details",
      `• Bill ID: ${billLabel(bill)}`,
      "",
      "💳 Payment Summary",
      `• Total Amount: ${total}`,
      `• Amount Paid: ${paid}`,
      `• Remaining Balance: ${remaining}`,
      "",
      "⚠️ Bill Status: PARTIALLY PAID",
      "",
      "Your payment has been successfully recorded. The remaining balance is still due. We kindly request you to complete the payment at your earliest convenience.",
      "",
      "If you have any questions or need assistance, simply reply to this message. Our team will be happy to help.",
      "",
      "Thank you for your business. We look forward to serving you again.",
      "",
      "Regards,",
      "Jambh Electricals",
    ].join("\n");
  },

  paymentDueToday(input: { customer: NotificationCustomer; bill: BillLike; bills?: BillLike[]; dueDate?: string; loginUrl?: string }) {
    const bills = input.bills || (input.bill ? [input.bill] : []);
    const bill = bills[0] || input.bill;
    const count = bills.length;
    const total = totalOutstanding(bills);
    const billDetails = bills.map((b, i) => billDetailLineTS(b, i + 1)).join("\n\n");
    return billReminderCompose({
      customerName: input.customer,
      title: "Payment Due Today \u2013 Pending Bills",
      introLines: "This is a polite reminder that your payment is due today.",
      billCount: count,
      totalAmount: formatCurrency(total),
      billDetails,
      actionLine: "Please clear the pending amount at your convenience today.",
      loginUrl: input.loginUrl,
    });
  },

  paymentUpcoming(input: { customer: NotificationCustomer; bill: BillLike; bills?: BillLike[]; dueDate?: string; loginUrl?: string }) {
    const bills = input.bills || (input.bill ? [input.bill] : []);
    const bill = bills[0] || input.bill;
    const count = bills.length;
    const total = totalOutstanding(bills);
    const billDetails = bills.map((b, i) => billDetailLineTS(b, i + 1)).join("\n\n");
    return billReminderCompose({
      customerName: input.customer,
      title: "Payment Reminder \u2013 Upcoming Due",
      introLines: `This is a friendly reminder that your payment is due on ${formatDate(bill.dueDate || input.dueDate)}.`,
      billCount: count,
      totalAmount: formatCurrency(total),
      billDetails,
      actionLine: "Please clear the pending amount on or before the due date.",
      loginUrl: input.loginUrl,
    });
  },

  paymentOverdue(input: { customer: NotificationCustomer; bill: BillLike; bills?: BillLike[]; dueDate?: string; loginUrl?: string }) {
    const bills = input.bills || (input.bill ? [input.bill] : []);
    const bill = bills[0] || input.bill;
    const count = bills.length;
    const total = totalOutstanding(bills);
    const billDetails = bills.map((b, i) => billDetailLineTS(b, i + 1)).join("\n\n");
    return billReminderCompose({
      customerName: input.customer,
      title: "Payment Overdue \u2013 Action Required",
      introLines: `We noticed that you have ${count} overdue bills with us.`,
      billCount: count,
      totalAmount: formatCurrency(total),
      billDetails,
      actionLine: "Please clear the overdue amount at your earliest convenience to avoid any disruption in service.",
      loginUrl: input.loginUrl,
    });
  },

  groupedReminder(input: { customer: NotificationCustomer; bills: BillLike[]; loginUrl?: string }) {
    const bills = input.bills || [];
    const count = bills.length;
    const total = totalOutstanding(bills);
    const billDetails = bills.map((bill, i) => billDetailLineTS(bill, i + 1)).join("\n\n");
    return billReminderCompose({
      customerName: input.customer,
      title: "Payment Reminder \u2013 Pending Bills",
      introLines: `We noticed that you have ${count} pending bills with us.`,
      billCount: count,
      totalAmount: formatCurrency(total),
      billDetails,
      actionLine: "Please clear the pending amount at your earliest convenience.",
      loginUrl: input.loginUrl,
    });
  },

  paymentFailed(input: { customer: NotificationCustomer; bill: BillLike; loginUrl?: string }) {
    const bill = input.bill;
    return composeMessage({
      title: "Payment Failed",
      greeting: greetingText(input.customer),
      bodyParts: [
        `We were unable to process your payment${billLabel(bill) !== "Invoice" ? ` for ${billLabel(bill)}` : ""}.`,
        "",
        "Please try again or contact us for assistance.",
      ],
      loginUrl: input.loginUrl,
    });
  },

  creditReminder(input: { customer: NotificationCustomer; outstandingAmount?: number; amount?: number; loginUrl?: string }) {
    return composeMessage({
      title: "Credit Reminder",
      greeting: greetingText(input.customer),
      bodyParts: [
        `Your current outstanding balance is ${formatCurrency(input.outstandingAmount || input.amount || 0)}.`,
        "",
        "We kindly request you to review your account and complete the pending payment at your earliest convenience.",
      ],
      loginUrl: input.loginUrl,
    });
  },

  orderCreated(input: { customer: NotificationCustomer; orderNumber?: string; orderId?: string; itemCount?: number; totalAmount?: number; orderDate?: string; deliveryDate?: string; loginUrl?: string }) {
    return composeMessage({
      title: "Order Confirmed",
      greeting: greetingText(input.customer),
      bodyParts: [
        "Your order has been confirmed successfully.",
        "",
        "Order Details",
        "",
        input.orderNumber || input.orderId ? `\u2022 Order ID: ${input.orderNumber || input.orderId}` : null,
        input.itemCount ? `\u2022 Items: ${input.itemCount}` : null,
        input.totalAmount ? `\u2022 Total Amount: ${formatCurrency(input.totalAmount)}` : null,
        input.orderDate ? `\u2022 Order Date: ${formatDate(input.orderDate)}` : null,
        input.deliveryDate ? `\u2022 Estimated Delivery: ${formatDate(input.deliveryDate)}` : null,
        "",
        "We will keep you updated on the progress of your order.",
      ],
      loginUrl: input.loginUrl,
    });
  },

  orderUpdated(input: { customer: NotificationCustomer; orderNumber?: string; orderId?: string; status?: string; updatedDate?: string; loginUrl?: string }) {
    return composeMessage({
      title: "Order Updated",
      greeting: greetingText(input.customer),
      bodyParts: [
        "Your order status has been updated.",
        "",
        "Order Details",
        "",
        input.orderNumber || input.orderId ? `\u2022 Order ID: ${input.orderNumber || input.orderId}` : null,
        input.status ? `\u2022 Status: ${input.status}` : null,
        input.updatedDate ? `\u2022 Updated on: ${formatDate(input.updatedDate)}` : null,
        "",
        "If you have any questions, please reply to this message.",
      ],
      loginUrl: input.loginUrl,
    });
  },

  orderCancelled(input: { customer: NotificationCustomer; orderNumber?: string; orderId?: string; cancelledDate?: string }) {
    return composeMessage({
      title: "Order Cancelled",
      greeting: greetingText(input.customer),
      bodyParts: [
        "Your order has been cancelled as requested.",
        "",
        "Order Details",
        "",
        input.orderNumber || input.orderId ? `\u2022 Order ID: ${input.orderNumber || input.orderId}` : null,
        input.cancelledDate ? `\u2022 Cancelled on: ${formatDate(input.cancelledDate)}` : null,
        "",
        "If you have any questions regarding this cancellation, please reply to this message.",
      ],
    });
  },

  orderDelivered(input: { customer: NotificationCustomer; orderNumber?: string; orderId?: string; deliveryDate?: string; loginUrl?: string }) {
    return composeMessage({
      title: "Order Delivered",
      greeting: greetingText(input.customer),
      bodyParts: [
        "Your order has been successfully delivered.",
        "",
        "Order Details",
        "",
        input.orderNumber || input.orderId ? `\u2022 Order ID: ${input.orderNumber || input.orderId}` : null,
        input.deliveryDate ? `\u2022 Delivered on: ${formatDate(input.deliveryDate)}` : null,
        "",
        "We hope you are satisfied with your purchase. If you have any feedback, we would love to hear from you.",
      ],
      loginUrl: input.loginUrl,
    });
  },

  appointmentReminder(input: { customer: NotificationCustomer; appointmentDate?: string; appointmentTime?: string; serviceName?: string; technician?: string; location?: string }) {
    return composeMessage({
      title: "Appointment Reminder",
      greeting: greetingText(input.customer),
      bodyParts: [
        "This is a reminder regarding your upcoming appointment.",
        "",
        "Appointment Details",
        "",
        input.appointmentDate ? `\u2022 Date: ${formatDate(input.appointmentDate)}` : null,
        input.appointmentTime ? `\u2022 Time: ${input.appointmentTime}` : null,
        input.serviceName ? `\u2022 Service: ${input.serviceName}` : null,
        input.technician ? `\u2022 Technician: ${input.technician}` : null,
        input.location ? `\u2022 Location: ${input.location}` : null,
        "",
        "Please ensure availability at the scheduled time. If you need to reschedule, kindly reply to this message.",
      ],
    });
  },

  serviceReminder(input: { customer: NotificationCustomer; serviceName?: string; lastServiceDate?: string; dueDate?: string; technician?: string; loginUrl?: string }) {
    return composeMessage({
      title: "Service Reminder",
      greeting: greetingText(input.customer),
      bodyParts: [
        "This is a friendly reminder that your service is due.",
        "",
        "Service Details",
        "",
        input.serviceName ? `\u2022 Service: ${input.serviceName}` : null,
        input.lastServiceDate ? `\u2022 Last Service: ${formatDate(input.lastServiceDate)}` : null,
        input.dueDate ? `\u2022 Due Date: ${formatDate(input.dueDate)}` : null,
        input.technician ? `\u2022 Technician: ${input.technician}` : null,
        "",
        "Please reply to this message to schedule your service appointment.",
      ],
      loginUrl: input.loginUrl,
    });
  },

  thankYou(input: { customer: NotificationCustomer }) {
    return composeMessage({
      title: "Thank You",
      greeting: greetingText(input.customer),
      bodyParts: [
        "Thank you for choosing Jambh Electricals.",
        "",
        "We truly value your trust and look forward to serving you again.",
        "",
        "If you have any feedback or questions, simply reply to this message and our team will be happy to assist you.",
      ],
    });
  },
};
