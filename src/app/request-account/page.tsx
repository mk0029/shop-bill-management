import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/server-auth";
import { getAuthenticatedHomeRoute } from "@/lib/auth-routes";

export const dynamic = "force-dynamic";
import {
  LandingShell,
  RequestAccountBlock,
} from "@landing/components/layout/landing-shell";

export const metadata: Metadata = {
  title: "Request Customer Account",
  description: "Request a customer account with Jambh Electrics to access billing, service history, tool rental, and more. Register online for quick electrical service access.",
  openGraph: {
    title: "Request Customer Account | Jambh Electrics",
    description: "Register for a Jambh Electrics customer account to manage bills, track services, rent tools, and get electrical support.",
  },
  twitter: {
    title: "Request Customer Account | Jambh Electrics",
    description: "Register for a Jambh Electrics customer account to manage bills, track services, rent tools, and get electrical support.",
  },
};

export default async function RequestAccountPage() {
  const auth = await getServerAuth();
  if (auth.isAuthenticated) {
    redirect(getAuthenticatedHomeRoute(auth.role));
  }

  return (
    <LandingShell
      titleKey="pages.requestAccount.title"
      copyKey="pages.requestAccount.copy"
    >
      <section className="container mx-auto px-4 py-12">
        <RequestAccountBlock />
      </section>
    </LandingShell>
  );
}
