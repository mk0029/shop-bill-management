import Link from "next/link";

export default function FooterSection({
  support,
  isAuthenticated = false,
}: {
  support: { phone: string; whatsapp: string; email: string };
  isAuthenticated?: boolean;
}) {
  return (
    <footer className="container mx-auto px-4 py-10">
      <div className="grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="text-lg font-semibold">Jambh Electricals</div>
          <p className="mt-3 text-muted-foreground">
            Trusted electrical products and professional services with
            transparent pricing.
          </p>
        </div>
        <div>
          <div className="font-semibold">Quick Links</div>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li className="text-base font-normal">
              <Link href="/#home" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li className="text-base font-normal">
              <Link href="/#about" className="hover:text-foreground">
                About
              </Link>
            </li>
            {!isAuthenticated && (
              <li className="text-base font-normal">
                <Link href="/#request" className="hover:text-foreground">
                  Request Account
                </Link>
              </li>
            )}
            <li className="text-base font-normal">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
            </li>
            <li className="text-base font-normal">
              <Link href="/terms" className="hover:text-foreground">
                Terms & Conditions
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold">Services</div>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li className="text-base font-normal">Product Sales</li>
            <li className="text-base font-normal">Home Electrical</li>
            <li className="text-base font-normal">Appliance Repair</li>
            <li className="text-base font-normal">Fault Fixing</li>
            <li className="text-base font-normal">New Wiring</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold">Contact</div>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li className="text-base font-normal">
              Phone: <Link href={"tel:" + support.phone}>{support.phone}</Link>
            </li>
            <li className="text-base font-normal">
              WhatsApp:{" "}
              <Link
                href={
                  "https://wa.me/917012345678?text=Hello%20we%20want%20service"
                }>
                {support.whatsapp}
              </Link>
            </li>
            <li className="text-base font-normal">
              Email:{" "}
              <Link href={"mailto:" + support.email}>{support.email}</Link>{" "}
            </li>
          </ul>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()} Jambh Electricals. All rights reserved.
      </div>
    </footer>
  );
}
