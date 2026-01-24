import { redirect } from "next/navigation";

// Disable static generation for this page
export const dynamic = "force-dynamic";

export default function CustomerProfileRedirect() {
  redirect("/customer/settings");
}
