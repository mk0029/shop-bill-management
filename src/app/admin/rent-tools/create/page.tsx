import { redirect } from "next/navigation";

export default function AdminRentToolsCreatePage() {
  redirect("/admin/rent-tools?create=true");
}