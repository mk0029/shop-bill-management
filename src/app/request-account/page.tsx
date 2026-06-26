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
  title: "Request Account",
  description: "Request a customer account with Jambh Electrics.",
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
