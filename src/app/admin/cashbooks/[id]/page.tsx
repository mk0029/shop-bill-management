import { notFound } from "next/navigation";
import { sanityClient } from "@/lib/sanity";
import CashbookComposer from "@/components/cash-book/cashbook-composer";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>; // params is now a Promise
}

export default async function CashbookDetailPage({ params }: PageProps) {
  const { id } = await params; // Await the params Promise

  const rawId = typeof id === "string" ? id : "";
  if (!rawId) return notFound();

  const baseId = rawId.startsWith("drafts.") ? rawId.slice(7) : rawId;

  // SSR: fetch minimal book to ensure existence and show initial shell
  const book = await sanityClient.fetch(
    `*[_type == "customerCashbook" && (_id == $id || _id == $draftId)][0]{
      _id, name, status, notes, customer->{_id, name, phone}
    }`,
    { id: baseId, draftId: `drafts.${baseId}` },
  );

  if (!book?._id) return notFound();

  return (
    <CashbookComposer
      cashbookId={book._id}
      customerId={book.customer?._id}
      initialName={book.name}
      initialNotes={book.notes}
    />
  );
}
