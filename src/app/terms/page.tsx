export const metadata = {
  title: "Terms & Conditions",
  description: "Terms and Policies for Jambh Electrics",
};

export default function TermsPage() {
  const support = require("@/lib/auth-service").getSupportContact();
  const Header = require("@/components/home/Header").default;
  const FooterSection =
    require("@/components/home/sections/FooterSection").default;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background text-foreground">
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold">
              Terms & Conditions
            </h1>
            <p className="mt-2 text-muted-foreground">
              By using our services or website, you agree to the following
              policies and terms.
            </p>
            <div className="mt-8 prose prose-slate dark:prose-invert">
              <h2 className="font-medium text-2xl sm:text-lg mb-1 sm:mb-2">
                Refund Policy
              </h2>
              <p className="text-base font-normal leading-normal mb-1 text-white/90">
                Our goal is fair service and customer satisfaction.
              </p>
              <ul className="list-disc mb-2 sm:mb-3 list-inside space-y-1">
                <li>
                  Payments made for inspection, service visit, or completed work
                  are non-refundable.
                </li>
                <li>
                  If a service is paid in advance but not started, a refund may
                  be considered after review.
                </li>
                <li>
                  Refunds are not applicable once work has started or materials
                  are used.
                </li>
                <li>
                  Product-related refunds depend on manufacturer or supplier
                  policy.
                </li>
                <li>
                  Any approved refund will be processed through the original
                  payment method.
                </li>
                <li>
                  We always try to resolve issues through proper support before
                  considering refunds.
                </li>
              </ul>

              <h2 className="font-medium text-2xl sm:text-lg mb-1 sm:mb-2">
                Help & Payment Policy
              </h2>
              <h3>Payments</h3>
              <ul className="list-disc mb-2 sm:mb-3 list-inside space-y-1">
                <li>
                  Payment must be made after service completion or as agreed in
                  advance.
                </li>
                <li>Some services may require advance payment.</li>
                <li>All charges are explained before starting work.</li>
              </ul>
              <h3>Help & Support</h3>
              <ul className="list-disc mb-2 sm:mb-3 list-inside space-y-1">
                <li>
                  If you face any issue with service or payment, contact us
                  immediately.
                </li>
                <li>
                  We will review your concern and provide the best possible
                  solution.
                </li>
                <li>
                  Delays in payment may result in service hold or account
                  restriction.
                </li>
                <li>
                  We believe in honest communication and quick support for all
                  customers.
                </li>
              </ul>

              <h2 className="font-medium text-2xl sm:text-lg mb-1 sm:mb-2">
                Equipment Borrowing Policy – Jambh Electrics
              </h2>
              <p className="text-base font-normal leading-normal mb-1 text-white/90">
                To avoid misuse, loss, or damage, borrowing of tools and
                equipment is strictly chargeable.
              </p>
              <ul className="list-disc mb-2 sm:mb-3 list-inside space-y-1">
                <li>
                  All equipment is provided entirely at the borrower’s own risk.
                </li>
                <li>Charges are fixed and non-negotiable.</li>
              </ul>
              <ul className="list-disc mb-2 sm:mb-3 list-inside space-y-1">
                <li>₹100 per hour</li>
                <li>₹500 per day</li>
              </ul>
              <ul className="list-disc mb-2 sm:mb-3 list-inside space-y-1">
                <li>Time starts from the moment equipment is handed over.</li>
                <li>Full charge amount must be deposited in advance.</li>
                <li>
                  Any damage, loss, or malfunction during the borrowing period
                  will be fully recoverable from the borrower.
                </li>
                <li>
                  Equipment will not be handed over without advance payment.
                </li>
              </ul>
              <p className="text-base font-normal leading-normal mb-1 text-white/90">
                By borrowing any equipment from Jambh Electrics, the borrower
                automatically agrees to all the above terms.
              </p>
            </div>
          </div>
        </section>
        <FooterSection support={support} />
      </main>
    </>
  );
}
