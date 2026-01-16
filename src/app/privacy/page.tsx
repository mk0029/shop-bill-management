export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Jambh Electrics",
};

export default function PrivacyPage() {
  const Header = require("@/components/home/Header").default;
  const FooterSection =
    require("@/components/home/sections/FooterSection").default;
  const { getSupportContact } = require("@/lib/auth-service");
  const support = getSupportContact();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background text-foreground">
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold">Privacy Policy</h1>
            <p className="mt-2 text-muted-foreground">
              We respect your privacy and take it seriously.
            </p>
            <div className="mt-8 prose prose-slate dark:prose-invert">
              <h2 className="font-medium text-2xl sm:text-lg mb-1 sm:mb-2">
                Information We Collect
              </h2>
              <p className="text-base font-normal leading-normal mb-1 text-white/90">
                When you contact us or request a service, we may collect basic
                details like:
              </p>
              <ul className="list-disc mb-2 sm:mb-3 list-inside space-y-1">
                <li>Name</li>
                <li>Mobile number</li>
                <li>Location / village</li>
                <li>Service details</li>
              </ul>
              <h2 className="font-medium text-2xl sm:text-lg mb-1 sm:mb-2">
                How We Use Your Information
              </h2>
              <p className="text-base font-normal leading-normal mb-1 text-white/90">
                We use this information only to:
              </p>
              <ul className="list-disc mb-2 sm:mb-3 list-inside space-y-1">
                <li>Contact you</li>
                <li>Provide electrical services</li>
                <li>Create and manage your customer account</li>
                <li>Maintain billing and service records</li>
              </ul>
              <h2 className="font-medium text-2xl sm:text-lg mb-1 sm:mb-2">
                Data Sharing
              </h2>
              <p className="text-base font-normal leading-normal mb-1 text-white/90">
                We do not sell, rent, or share your personal information with
                anyone else.
              </p>
              <h2 className="font-medium text-2xl sm:text-lg mb-1 sm:mb-2">
                Data Security
              </h2>
              <p className="text-base font-normal leading-normal mb-1 text-white/90">
                Your details are kept safe and are used only for business and
                service purposes.
              </p>
              <h2 className="font-medium text-2xl sm:text-lg mb-1 sm:mb-2">
                Consent
              </h2>
              <p className="text-base font-normal leading-normal mb-1 text-white/90">
                By using our services or website, you agree to this privacy
                policy.
              </p>
            </div>
          </div>
        </section>
        <FooterSection support={support} />
      </main>
    </>
  );
}
