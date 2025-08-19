import { create } from "zustand";
import { persist } from "zustand/middleware";

type Language = "en" | "hi" | "ur";

interface LocaleState {
  language: Language;
  currency: string;
  dateFormat: string;
  setLanguage: (language: Language) => void;
  setCurrency: (currency: string) => void;
  setDateFormat: (format: string) => void;
  t: (key: string) => string;
}

// Basic translations - can be expanded
const translations = {
  en: {
    "app.title": "Electrician Shop",
    "auth.login": "Login",
    "auth.logout": "Logout",
    "nav.dashboard": "Dashboard",
    "nav.customers": "Customers",
    "nav.billing": "Billing",
    "nav.reports": "Reports",
    "nav.settings": "Settings",
    "customer.name": "Customer Name",
    "customer.phone": "Phone Number",
    "customer.location": "Location",
    "bill.total": "Total Amount",
    "bill.items": "Items",
    "bill.service": "Service Type",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.loading": "Loading...",
  },
  hi: {
    "app.title": "इलेक्ट्रीशियन दुकान",
    "auth.login": "लॉगिन",
    "auth.logout": "लॉगआउट",
    "nav.dashboard": "डैशबोर्ड",
    "nav.customers": "ग्राहक",
    "nav.billing": "बिलिंग",
    "nav.reports": "रिपोर्ट",
    "nav.settings": "सेटिंग्स",
    "customer.name": "ग्राहक का नाम",
    "customer.phone": "फोन नंबर",
    "customer.location": "स्थान",
    "bill.total": "कुल राशि",
    "bill.items": "वस्तुएं",
    "bill.service": "सेवा प्रकार",
    "common.save": "सेव करें",
    "common.cancel": "रद्द करें",
    "common.delete": "हटाएं",
    "common.edit": "संपादित करें",
    "common.add": "जोड़ें",
    "common.loading": "लोड हो रहा है...",
  },
  ur: {
    "app.title": "بجلی کی دکان",
    "auth.login": "لاگ ان",
    "auth.logout": "لاگ آؤٹ",
    "nav.dashboard": "ڈیش بورڈ",
    "nav.customers": "گاہک",
    "nav.billing": "بلنگ",
    "nav.reports": "رپورٹس",
    "nav.settings": "ترتیبات",
    "customer.name": "گاہک کا نام",
    "customer.phone": "فون نمبر",
    "customer.location": "مقام",
    "bill.total": "کل رقم",
    "bill.items": "اشیاء",
    "bill.service": "سروس کی قسم",
    "common.save": "محفوظ کریں",
    "common.cancel": "منسوخ",
    "common.delete": "حذف کریں",
    "common.edit": "ترمیم",
    "common.add": "شامل کریں",
    "common.loading": "لوڈ ہو رہا ہے...",
  },
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      language: "en",
      currency: "₹",
      dateFormat: "DD/MM/YYYY",

      setLanguage: (language: Language) => {
        set({ language });
      },

      setCurrency: (currency: string) => {
        set({ currency });
      },

      setDateFormat: (format: string) => {
        set({ dateFormat: format });
      },

      t: (key: string) => {
        const { language } = get();
        return (
          translations[language][key as keyof (typeof translations)["en"]] ||
          key
        );
      },
    }),
    {
      name: "locale-storage",
    }
  )
);
