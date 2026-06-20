"use client";

import Header from "@landing/components/home/Header";
import {
  FooterSection,
  SectionTitle,
} from "@landing/components/shared/landing-sections";
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
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="border-b border-slate-800 bg-slate-900/40">
          <div className="container mx-auto px-4 py-12">
            <SectionTitle title={resolvedTitle} copy={resolvedCopy} />
          </div>
        </section>
        {children}
        <FooterSection support={support} />
      </main>
    </>
  );
}

export function RequestAccountBlock() {
  const support = getSupportContact();
  return (
    <div className="mx-auto max-w-4xl">
      <RequestAccountForm
        support={{ email: support.email, whatsapp: support.whatsapp }}
      />
    </div>
  );
}
