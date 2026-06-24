"use client";

import { RequestAccountForm } from "@landing/components/forms/request-account-form";
import { ShareLoginUrl } from "@landing/components/forms/ShareLoginUrl";
import { useLandingLanguage } from "@landing/hooks/useLandingLanguage";
import { getSupportContact } from "@/lib/auth-service";

export default function RequestAccountSection() {
  const { t } = useLandingLanguage();
  const support = getSupportContact();

  return (
    <section className="container mx-auto px-4 py-11 md:py-20" id="request">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-semibold text-white">
          {t("pages.requestAccount.title")}
        </h2>
        <p className="mt-3 text-sm text-[#B8C0CC] mx-auto max-w-[768px]">
          {t("pages.requestAccount.copy")}
        </p>
      </div>
      <div className="max-w-[880px] w-full mx-auto space-y-6">
        <div className="glass-card p-6">
          <RequestAccountForm support={support} />
        </div>
        <ShareLoginUrl support={support} />
      </div>
    </section>
  );
}
