import ShopCategoryForm from "../form";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShopCategoryForm categoryId={id} />;
}
