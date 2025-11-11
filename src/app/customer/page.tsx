import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CustomerPage() {
  // Server-side redirect to the main customer functionality
  redirect("/customer/bills");
}
