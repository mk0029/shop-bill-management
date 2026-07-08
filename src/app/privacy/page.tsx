import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Jambh Electrics.",
  robots: { index: false, follow: true },
  alternates: { canonical: "https://jambh-ell.vercel.app/privacy-policy" },
};

export default function PrivacyPage() {
  redirect("/privacy-policy");
}
