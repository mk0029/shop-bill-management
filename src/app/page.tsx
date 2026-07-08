import type { Metadata } from "next";
import HomeLanding from "@landing/components/home/HomeLanding";
import { getServerAuth } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jambh Electrics - Trusted Electrical Shop & Home Services",
  description: "Jambh Electrics offers professional electrical products, home wiring, appliance repair, tool rental, and emergency services in Siwani, Haryana. Quality electrical solutions since years.",
  openGraph: {
    title: "Jambh Electrics - Trusted Electrical Shop & Home Services",
    description: "Professional electrical products, home wiring, appliance repair, tool rental, and more in Siwani, Haryana.",
  },
  twitter: {
    title: "Jambh Electrics - Trusted Electrical Shop & Home Services",
    description: "Professional electrical products, home wiring, appliance repair, tool rental, and more in Siwani, Haryana.",
  },
};

export default async function Home() {
  await getServerAuth();

  return <HomeLanding />;
}
