import type { Metadata } from "next";
import LandingLoginPage from "@landing/components/LandingLoginPage";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Jambh Electrics customer or admin account to manage bills, services, tool rental, and more.",
  robots: { index: false, follow: true },
  openGraph: {
    title: "Sign In | Jambh Electrics",
    description: "Sign in to your Jambh Electrics account.",
  },
  twitter: {
    title: "Sign In | Jambh Electrics",
    description: "Sign in to your Jambh Electrics account.",
  },
};

export default function LoginPage() {
  return <LandingLoginPage />;
}
