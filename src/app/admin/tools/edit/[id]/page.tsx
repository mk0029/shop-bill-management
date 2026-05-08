import AdminToolsEditClient from "@/components/admin/tools-edit-client";

export default async function EditToolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminToolsEditClient toolId={id} />;
}
