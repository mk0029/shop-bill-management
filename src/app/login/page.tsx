import type { Metadata } from "next";
import LandingLoginPage from "@landing/components/LandingLoginPage";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your Jambh Electricals customer or admin account to manage bills, services, tool rental, and more.",
  robots: { index: false, follow: true },
  openGraph: {
    title: "Sign In | Jambh Electricals",
    description: "Sign in to your Jambh Electricals account.",
  },
  twitter: {
    title: "Sign In | Jambh Electricals",
    description: "Sign in to your Jambh Electricals account.",
  },
};

export default function LoginPage() {
  return <LandingLoginPage />;
}
