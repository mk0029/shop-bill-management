import SpecificationsClient from "@/components/admin/specifications-client";
import { getAdminSpecificationsData } from "@/lib/server-data";
import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SpecificationsManagementPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "admin") redirect("/customer/bills");

  const { specificationOptions, categoryFieldMappings } =
    await getAdminSpecificationsData();

  return (
    <SpecificationsClient
      initialSpecificationOptions={specificationOptions as any[]}
      initialCategoryFieldMappings={categoryFieldMappings as any[]}
    />
  );
}
