import { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingShell } from "@landing/components/layout/landing-shell";
import { ServiceDetailContent } from "@landing/components/layout/public-page-content";
import { services } from "@landing/lib/site-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await params;
  const service = services.find((s) => s.slug === p.slug);
  if (!service) return { title: "Service" };
  const title = `${service.title} | Electrical Services`;
  const description = service.shortDescription;
  return {
    title: service.title,
    description,
    openGraph: {
      title,
      description,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await params;
  const service = services.find((s) => s.slug === p.slug);
  if (!service) notFound();

  return (
    <LandingShell
      titleKey={`services.items.${service.slug}.title`}
      copyKey={`services.items.${service.slug}.shortDescription`}
    >
      <ServiceDetailContent
        serviceSlug={service.slug}
        includesCount={service.includes.length}
      />
    </LandingShell>
  );
}
