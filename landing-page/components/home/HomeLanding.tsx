import { getSupportContact } from "@/lib/auth-service";
import { LandingLanguageProvider } from "@landing/hooks/useLandingLanguage";
import LandingHomeContent from "@landing/components/home/LandingHomeContent";

export default function HomeLanding() {
  const support = getSupportContact();

  return (
    <LandingLanguageProvider>
      <LandingHomeContent
        support={{
          email: support.email,
          phone: support.phone,
          whatsapp: support.whatsapp,
        }}
      />
    </LandingLanguageProvider>
  );
}
