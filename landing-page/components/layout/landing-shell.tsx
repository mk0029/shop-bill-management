"use client";

import Header from "@landing/components/home/Header";
import {
  FooterSection,
  SectionTitle,
} from "@landing/components/shared/landing-sections";
import ElectricalBackground from "@landing/components/shared/ElectricalBackground";
import { getSupportContact } from "@/lib/auth-service";
import { RequestAccountForm } from "@landing/components/forms/request-account-form";
import {
  LandingLanguageProvider,
  useLandingLanguage,
} from "@landing/hooks/useLandingLanguage";
export { ServicesGrid } from "@landing/components/layout/public-page-content";

type LandingShellProps = {
  title?: string;
  copy?: string;
  titleKey?: string;
  copyKey?: string;
  children: React.ReactNode;
};

export function LandingShell({
  title,
  copy,
  titleKey,
  copyKey,
  children,
}: LandingShellProps) {
  const support = getSupportContact();
  return (
    <LandingLanguageProvider>
      <LandingShellContent
        title={title}
        copy={copy}
        titleKey={titleKey}
        copyKey={copyKey}
        support={support}
      >
        {children}
      </LandingShellContent>
    </LandingLanguageProvider>
  );
}

function LandingShellContent({
  title,
  copy,
  titleKey,
  copyKey,
  children,
  support,
}: LandingShellProps & { support: ReturnType<typeof getSupportContact> }) {
  const { t } = useLandingLanguage();
  const resolvedTitle = titleKey ? t(titleKey) : title || "";
  const resolvedCopy = copyKey ? t(copyKey) : copy;

  return (
    <ElectricalBackground>
      <div className="flex h-[var(--app-vh,100dvh)] flex-col text-[#E5E7EB]">
        <Header />
        <main className="flex-1">
          <section className="container mx-auto px-4 pt-24 pb-6 md:pb-8">
            <SectionTitle title={resolvedTitle} copy={resolvedCopy} />
          </section>
          {children}
          <FooterSection support={support} />
        </main>
      </div>
    </ElectricalBackground>
  );
}

export function RequestAccountBlock() {
  const support = getSupportContact();
  return (
    <div className="mx-auto max-w-4xl">
      <div className="glass-card p-8">
        <RequestAccountForm
          support={{ email: support.email, whatsapp: support.whatsapp }}
        />
      </div>
    </div>
  );
}
