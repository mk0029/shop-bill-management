export const LANDING_LANGUAGE_KEY = "shop_landing_language";

export const landingLanguages = ["en", "hi"] as const;

export type LandingLanguage = (typeof landingLanguages)[number];

export const defaultLandingLanguage: LandingLanguage = "en";

type TranslationTree = {
  [key: string]: string | TranslationTree;
};

export const landingTranslations: Record<LandingLanguage, TranslationTree> = {
  en: {
    common: {
      brand: "Jambh Electrics",
      language: "Language",
      english: "English",
      hindi: "Hindi",
      menu: "Menu",
      login: "Login",
      closeMenu: "Close menu",
      closeMenuOverlay: "Close menu overlay",
      callNow: "Call Now",
      whatsapp: "WhatsApp",
      requestAccount: "Request Account",
      viewDetails: "View Details",
      step: "Step",
    },
    nav: {
      home: "Home",
      about: "About",
      services: "Services",
      products: "Products",
      pricing: "Pricing",
      rentTools: "Rent Tools",
      contact: "Contact",
      requestAccount: "Request Account",
    },
    hero: {
      eyebrow: "Jambh Electrics",
      title: "Trusted Electrical Products and Expert Home Services",
      copy: "Fair pricing, skilled technicians, and fast support for homes and local businesses. From repairs to complete wiring, we keep safety first.",
      getService: "Get Service",
      callNow: "Call Now",
      whatsapp: "WhatsApp",
      serviceMessage: "Hello! I need electrical service.",
      cardNote1: "Reliable service planning and transparent estimate discussion.",
      cardNote2: "Emergency and late-night support based on safety and technician availability.",
      badges: {
        skilledElectricians: "Skilled Electricians",
        safetyFirst: "Safety First",
        genuinePricing: "Genuine Pricing",
        fastSupport: "Fast Support",
      },
    },
    services: {
      eyebrow: "Services",
      title: "Complete Electrical Services",
      copy: "Clear service options for products, repair, wiring, and rental.",
      items: {
        "electrical-product-sales": {
          title: "Electrical Product Sales",
          shortDescription: "Trusted brands for switches, sockets, lights, MCBs, and accessories.",
        },
        "home-electrical-services": {
          title: "Home Electrical Services",
          shortDescription: "Professional install, repair, and electrical troubleshooting at home.",
        },
        "new-wiring-fitting": {
          title: "New Wiring & Fitting",
          shortDescription: "Complete new wiring and safe fitting for home and small commercial spaces.",
        },
        "appliance-repair": {
          title: "Appliance Repair",
          shortDescription: "Repair support for common electrical appliances with practical diagnostics.",
        },
        "fault-detection": {
          title: "Fault Detection",
          shortDescription: "Fast fault finding for trip issues, short circuits, and unstable points.",
        },
        "tool-rental": {
          title: "Tool Rental",
          shortDescription: "Borrow electrical tools at transparent hourly or daily rates.",
        },
        "maintenance-support": {
          title: "Maintenance Support",
          shortDescription: "Routine preventive electrical checks for safer long-term operation.",
        },
        "emergency-support": {
          title: "Emergency Support",
          shortDescription: "Urgent response after normal hours based on technician availability and safety.",
        },
      },
    },
    why: {
      eyebrow: "Why Choose Us",
      title: "Local Team You Can Trust",
      copy: "Professional process, clear communication, and safety-first work.",
      items: {
        experiencedElectricians: {
          title: "Experienced Electricians",
          copy: "Skilled field experience across home and local commercial electrical work.",
        },
        qualityWorkmanship: {
          title: "Quality Workmanship",
          copy: "Clean execution with practical reliability and durable outcomes.",
        },
        onTimeService: {
          title: "On-Time Service",
          copy: "Planned visits and responsive support when time matters.",
        },
        transparentPricing: {
          title: "Transparent Pricing",
          copy: "Clear, pre-work charge discussion with no hidden surprises.",
        },
        safePractices: {
          title: "Safe Practices",
          copy: "Safety-first process and site suitability checks for every task.",
        },
        qualityMaterials: {
          title: "Quality Materials",
          copy: "Material suggestions based on reliability, warranty, and budget.",
        },
        clearCommunication: {
          title: "Clear Communication",
          copy: "Simple updates on issue, estimate, and completion status.",
        },
        localTrustedSupport: {
          title: "Local Trusted Support",
          copy: "Community-first service with dependable after-work guidance.",
        },
      },
    },
    process: {
      eyebrow: "How We Work",
      title: "Simple 5-Step Process",
      steps: {
        requestService: "Request service",
        inspectRequirement: "We inspect requirement",
        estimateShared: "Estimate shared",
        workCompleted: "Work completed safely",
        paymentSupport: "Payment and support",
      },
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Transparent Rate Highlights",
      copy: "Final price depends on work, location, material, and timing.",
      items: {
        inspection: {
          title: "Inspection / Visit",
          price: "Rs.50~150 Visit",
          note: "Charged for technician time and travel.",
        },
        homeService: {
          title: "Home Service",
          price: "Starts from Rs.50",
          note: "Depends on repair type and duration.",
        },
        wiring: {
          title: "Wiring / Fitting",
          price: "Estimate Based",
          note: "Final quote after site review.",
        },
        emergency: {
          title: "Emergency / Late-Night",
          price: "2x-3x Charge",
          note: "After 8:00 PM based on risk and urgency.",
        },
      },
    },
    rentTools: {
      title: "Need Electrical Tools on Rent?",
      copy: "Hourly and daily rental with advance payment. Return tools in proper condition to avoid damage/loss charges.",
      hourly: "Rs. 100/hour",
      daily: "Rs. 500/day",
      cta: "Request Tool on Rent",
    },
    pages: {
      about: {
        title: "About Jambh Electrics",
        copy: "Serving homes and local businesses with trusted electrical support.",
        heading: "Who We Are",
        bullets: {
          mission: "Our mission is to provide safe, reliable, and fairly priced electrical products and services.",
          trust: "Customers trust us for clear communication, practical solutions, and dependable local support.",
          safety: "We follow safety-first work methods and use quality materials whenever possible.",
          local: "Our local service model focuses on fast response, honest estimates, and long-term relationships.",
        },
      },
      services: {
        title: "Electrical Services",
        copy: "Explore complete services for home, repair, wiring, maintenance, and emergency support.",
      },
      products: {
        title: "Electrical Product Categories",
        copy: "Browse common categories with clear guidance on quality, warranty, and fitment support.",
        categories: {
          switches: {
            title: "Switches",
            details: "Modular and heavy-duty switches for home and shop installations.",
          },
          sockets: {
            title: "Sockets",
            details: "Multi-amp and appliance sockets with safe fitting support.",
          },
          wires: {
            title: "Wires",
            details: "House wiring cables for lighting, power, and load-specific setups.",
          },
          lights: {
            title: "Lights",
            details: "LED bulbs, panels, and fixtures with energy-efficient options.",
          },
          mcb: {
            title: "MCB",
            details: "Protection devices for overload and short-circuit safety.",
          },
          boards: {
            title: "Boards",
            details: "Distribution and switch boards for structured electrical points.",
          },
          accessories: {
            title: "Accessories",
            details: "Clips, holders, connectors, tapes, and fitting accessories.",
          },
        },
        guidance: {
          qualityTitle: "Quality Clarification",
          qualityCopy: "We help you choose suitable quality based on load, usage frequency, and budget.",
          warrantyTitle: "Warranty Clarification",
          warrantyCopy: "Warranty depends on manufacturer/supplier policy and product condition.",
          fitmentTitle: "Visit & Fitment Charges",
          fitmentCopy: "Standard visit charge applies for service visits. Fitting/labor charges are shared before work.",
        },
      },
      pricing: {
        title: "Transparent Pricing",
        copy: "Exact price is confirmed before work whenever possible.",
        finalNote: "Final price depends on work type, location, material, timing, and additional issues found during inspection.",
      },
      requestAccount: {
        title: "Request Customer Account",
        copy: "Share your details and preferred contact channel.",
      },
      rentTools: {
        title: "Need Electrical Tools on Rent?",
        copy: "You need to login to get tools on rent. If you already have an account, login first. If you do not have an account, send a request to create one.",
        loginTitle: "Login is required to rent tools",
        accountPoint: "Already have an account? Login and request the required tool from your customer account.",
        requestPoint: "No account yet? Fill the account request form and our team will help create your account.",
        pricingTitle: "Rental Pricing",
        hourly: "Hourly: Rs. 100 - Rs. 200",
        daily: "Daily: Rs. 500 - Rs. 700",
        rateCopy: "Rates are dynamic based on tool type, condition, and usage. Final rent can be lower or higher depending on the selected tool.",
        policyCopy: "Tool handover happens after advance payment. Borrower is responsible for delay, damage, or loss.",
        requestTitle: "Login Required for Tool Rent",
        namePlaceholder: "Your name",
        phonePlaceholder: "Phone",
        toolPlaceholder: "Have an account? Login. No account? Send an account request.",
        notesPlaceholder: "Duration, date, and notes",
        button: "Send Account Request",
      },
      contact: {
        title: "Contact Jambh Electrics",
        copy: "Reach us for service, product, account, or payment support.",
        phone: "Phone",
        whatsapp: "WhatsApp",
        email: "Email",
        address: "Address",
        addressValue: "VPO Lilas, Siwani, Haryana",
        workingHours: "Working Hours",
        workingHoursValue: "8:00 AM - 8:00 PM",
        formTitle: "Contact Form",
        namePlaceholder: "Name",
        phonePlaceholder: "Phone",
        messagePlaceholder: "How can we help?",
        submit: "Submit",
      },
      helpPayment: {
        title: "Help & Payment Policy",
        copy: "Clear payment expectations and support commitments.",
        points: {
          item1: "Payment is due after work completion or as pre-agreed.",
          item2: "Advance payment may be required for products, tool rental, inspection, urgent work, or material-heavy tasks.",
          item3: "Charges are discussed before starting work whenever possible.",
          item4: "Pending dues may lead to service hold or future-service restrictions.",
          item5: "For any service, product, payment, or account issue, contact support immediately.",
          item6: "Support is available via phone, WhatsApp, email, or website form.",
        },
      },
      serviceDetail: {
        includedTitle: "What Is Included",
        clarificationTitle: "Service Clarification",
        needTitle: "Need This Service?",
        requestService: "Request Service",
        chargeTitle: "Charge Clarification",
        visitingChargeTitle: "Visiting Charge",
        visitingChargeCopy: "Standard visit charge:  Rs.50~150 per visit (within standard service area).",
        emergencyTitle: "Emergency Timing",
        emergencyCopy: "After 8:00 PM, emergency/late-night service can be 2x-3x based on risk and availability.",
        finalAmountTitle: "Final Amount",
        finalAmountCopy: "Final total depends on work scope, location, materials, and any additional faults found during inspection.",
        policyNote: "This pricing policy is also defined in our Terms & Conditions.",
        includes: {
          "electrical-product-sales": {
            item1: "Switches and sockets",
            item2: "Wires and cables",
            item3: "MCB and distribution boards",
            item4: "Lighting and accessories",
          },
          "home-electrical-services": {
            item1: "Switch and socket fixes",
            item2: "Fan and light installations",
            item3: "Load and safety checks",
            item4: "Minor rewiring",
            item5: "Washing machine electrical repair support",
            item6: "Cooler electrical repair support",
            item7: "Refrigerator electrical repair checks",
          },
          "new-wiring-fitting": {
            item1: "Site requirement discussion",
            item2: "Material planning",
            item3: "Wiring and fitting",
            item4: "Final safety checks",
          },
          "appliance-repair": {
            item1: "Fan/motor issues",
            item2: "Washing machine electrical checks",
            item3: "Basic refrigerator electrical support",
            item4: "On-site issue isolation",
          },
          "fault-detection": {
            item1: "Short-circuit diagnosis",
            item2: "Leakage checks",
            item3: "Tripping reason analysis",
            item4: "Corrective recommendation",
          },
          "tool-rental": {
            item1: "Hourly and daily rental",
            item2: "Advance payment before handover",
            item3: "Condition-based return",
            item4: "Damage/loss recoverable",
          },
          "maintenance-support": {
            item1: "Periodic inspections",
            item2: "Loose-point correction",
            item3: "Load condition review",
            item4: "Safety improvement tips",
          },
          "emergency-support": {
            item1: "Priority response",
            item2: "Risk-focused inspection",
            item3: "Temporary stabilization",
            item4: "Service follow-up",
          },
        },
        extra: {
          "home-electrical-services": {
            summary: "Reliable home visits for electrical repair, fitting, and appliance-related checks.",
            point1: "We support common home appliances like washing machine, cooler, and refrigerator electrical faults.",
            point2: "All work is done after basic safety inspection and issue discussion.",
            point3: "Service scope and expected charges are explained before starting work whenever possible.",
          },
          "appliance-repair": {
            summary: "Practical electrical diagnostics for household appliances and connected points.",
            point1: "Diagnosis includes supply line, load behavior, and component-level symptom checks.",
            point2: "Repair recommendation is shared before part replacement or extra work.",
          },
          "new-wiring-fitting": {
            summary: "Planning-to-execution wiring support with safety-first implementation.",
            point1: "Material and load discussion is done before estimate finalization.",
            point2: "Extra concealed issues, if found, are discussed before continuing.",
          },
        },
      },
      terms: {
        title: "Terms & Conditions",
        copy: "By using our services, website, account request form, tool rental, product purchase, or support service, you agree to these terms.",
        sections: {
          section1: {
            title: "1. General Service Terms",
            points: {
              item1: "All electrical work is handled according to the customer request, site condition, safety requirements, and material availability.",
              item2: "Final charges may vary based on work type, location, urgency, material used, and extra work found during inspection.",
              item3: "We explain charges before starting work whenever possible.",
              item4: "Customers must provide correct contact details, address, and service requirements.",
              item5: "Jambh Electrics is not responsible for issues caused by old wiring, damaged fittings, low-quality existing materials, voltage problems, or third-party work.",
            },
          },
          section2: {
            title: "2. Standard Working Hours",
            points: {
              item1: "Standard working hours are 8:00 AM to 8:00 PM.",
              item2: "Requests after 8:00 PM may be treated as late-night or emergency service.",
              item3: "After 8:00 PM, charges may be 2x or 3x based on work type, risk, distance, urgency, and availability.",
              item4: "Emergency work is accepted only when technician availability and safety conditions allow it.",
              item5: "Night work may be refused if the work area is unsafe.",
            },
          },
          section3: {
            title: "3. Payment Policy",
            points: {
              item1: "Payment must be made after service completion or as agreed in advance.",
              item2: "Some services may require advance payment.",
              item3: "Product, material, tool rental, urgent work, or inspection may require advance payment.",
              item4: "Payment delays may result in service hold, account restriction, or refusal of future service.",
              item5: "Pending bills must be cleared before new work unless approved.",
            },
          },
          section4: {
            title: "4. Refund Policy",
            points: {
              item1: "Inspection, visit, or completed work payments are non-refundable.",
              item2: "Advance-paid but not-started service may be reviewed for refund eligibility.",
              item3: "No refund is available once work starts or materials are used.",
              item4: "Product-related refunds depend on manufacturer or supplier policy.",
              item5: "Approved refunds are processed through the original payment method where possible.",
            },
          },
          section5: {
            title: "5. Product & Material Policy",
            points: {
              item1: "Product warranty depends on manufacturer or supplier policy.",
              item2: "Used, fitted, damaged, or opened products may not be returnable.",
              item3: "Material once installed or used is not refundable.",
              item4: "Customers should confirm model, brand, and quantity before billing.",
            },
          },
          section6: {
            title: "6. Work Quality & Safety Policy",
            points: {
              item1: "Safety is the first priority during electrical work.",
              item2: "Work may be stopped or refused if the site is unsafe.",
              item3: "Keep children and unnecessary people away from the work area.",
              item4: "Hidden faults, old wiring, water leakage, or unsafe previous installations can affect results.",
              item5: "Extra work found during service is discussed before continuation.",
            },
          },
          section7: {
            title: "7. Equipment Borrowing / Tool Rental Policy",
            points: {
              item1: "Tool rental is chargeable and may be updated by Jambh Electrics.",
              item2: "Standard rental starts around Rs. 100 per hour and Rs. 500 per day.",
              item3: "Time starts from handover and the full charge is deposited in advance.",
              item4: "Delay in return may add hourly or daily charges.",
              item5: "Damage, loss, or theft during borrowing is recoverable from the borrower.",
              item6: "Borrower agrees to all rental terms by taking equipment.",
            },
          },
          section8: {
            title: "8. Inspection & Visit Charges",
            points: {
              item1: "A standard visit charge of Rs.50~150 applies to standard service visits within the regular service area.",
              item2: "Visit charge applies even if the customer decides not to continue the work.",
              item3: "Visit charge covers technician time, travel, and inspection effort.",
              item4: "Visit and inspection charges are non-refundable.",
            },
          },
          section9: {
            title: "9. Cancellation Policy",
            points: {
              item1: "Cancel or reschedule as early as possible.",
              item2: "If the technician has started travel or reached the location, visit charge may apply.",
              item3: "Repeated cancellations may affect future availability.",
            },
          },
          section10: {
            title: "10. Customer Account Policy",
            points: {
              item1: "Accounts are used for service history, billing, communication, and support.",
              item2: "Provide correct name, phone, location, and service details.",
              item3: "Access or service may be restricted for pending payment or misuse.",
            },
          },
          section11: {
            title: "11. Support Policy",
            points: {
              item1: "For service, product, payment, or account issues, contact us immediately.",
              item2: "We review concerns and provide the best possible solution.",
              item3: "Support channels include phone, WhatsApp, email, and website form.",
              item4: "We prioritize honest communication and quick support.",
            },
          },
          section12: {
            title: "12. Changes to Terms",
            points: {
              item1: "Jambh Electrics may update these terms at any time.",
              item2: "Updated terms apply once published on the website.",
            },
          },
        },
      },
      privacy: {
        title: "Privacy Policy",
        copy: "How we collect, use, and protect your information.",
        points: {
          item1: "We collect contact and service details such as name, phone, location, and requirement.",
          item2: "We use contact information only for service communication, account support, billing, and records.",
          item3: "Service records may be stored to improve support continuity and issue tracking.",
          item4: "Payment and communication logs are retained for support, dispute handling, and compliance.",
          item5: "We do not misuse personal data and do not sell customer information.",
          item6: "For deletion or correction requests, contact us through phone, WhatsApp, or email.",
        },
      },
      refund: {
        title: "Refund Policy",
        copy: "Please review refund applicability before confirming payment.",
        points: {
          item1: "Inspection, service visit, and completed work payments are non-refundable.",
          item2: "Advance-paid but not-started service may be reviewed for refund eligibility.",
          item3: "No refund is available after work starts or material has been used.",
          item4: "Product refunds depend on manufacturer or supplier policy.",
          item5: "Approved refunds are processed through the original payment method where possible.",
          item6: "Support-first resolution is attempted before refund decisions.",
        },
      },
    },
    account: {
      eyebrow: "Customer Account",
      title: "Request Account in Minutes",
      copy: "Share basic details and we will connect for confirmation.",
    },
    faq: {
      eyebrow: "FAQ",
      title: "Common Questions",
      items: {
        homeService: {
          q: "Do you provide home service?",
          a: "Yes, we provide home electrical services based on location and technician availability.",
        },
        applianceRepair: {
          q: "Do you repair appliances?",
          a: "Yes, we support common appliance electrical repairs and diagnostics.",
        },
        warranty: {
          q: "Do you provide product warranty?",
          a: "Warranty depends on manufacturer or supplier policy for each product.",
        },
        pricing: {
          q: "How is pricing calculated?",
          a: "Pricing depends on work type, location, urgency, material, and timing. Charges are discussed before work when possible.",
        },
        tools: {
          q: "Can I rent tools?",
          a: "Yes. Standard rental starts around Rs. 100/hour and Rs. 500/day with advance payment.",
        },
        hours: {
          q: "What are working hours?",
          a: "Standard hours are 8:00 AM to 8:00 PM.",
        },
        emergency: {
          q: "What happens for emergency work after 8 PM?",
          a: "Late-night/emergency service may be 2x or 3x based on risk, distance, urgency, and availability.",
        },
      },
    },
    contact: {
      title: "Need electrical help today?",
    },
    footer: {
      copy: "Trusted electrical products and expert home services with transparent pricing.",
      quickLinks: "Quick Links",
      services: "Services",
      contactPolicies: "Contact & Policies",
      whatsappLabel: "WhatsApp",
      workingHours: "Working Hours: 8:00 AM - 8:00 PM",
      terms: "Terms",
      privacy: "Privacy",
      refund: "Refund",
      copyright: "All rights reserved.",
      professionalSystem: "Professional Jambh Electrics system",
      serviceLinks: {
        homeElectricalService: "Home Electrical Service",
        productSales: "Product Sales",
        newWiring: "New Wiring",
        faultDetection: "Fault Detection",
        applianceRepair: "Appliance Repair",
        toolRental: "Tool Rental",
      },
    },
    form: {
      aria: "Request account form",
      fullName: "Full Name",
      fullNamePlaceholder: "Your full name",
      phoneNumber: "Phone Number",
      phonePlaceholder: "e.g. 9876543210",
      location: "Location",
      locationPlaceholder: "Select location",
      contactPreference: "Contact Preference",
      whatsapp: "WhatsApp",
      email: "Email",
      serviceRequirement: "Service Requirement",
      serviceRequirementPlaceholder: "Tell us what you need",
      validationRequired: "Please fill name, phone, and location.",
      requestSubject: "Customer Account Request",
      summaryTitle: "Customer Account Request",
      summaryName: "Name",
      summaryPhone: "Phone",
      summaryLocation: "Location",
      summaryContactPreference: "Contact Preference",
      summaryRequirement: "Requirement",
      success: "Request prepared successfully. Our team will connect with you soon.",
      channelError: "Could not open selected channel. Please try again.",
      submitting: "Submitting...",
      sendWhatsapp: "Send on WhatsApp",
      sendEmail: "Send via Email",
    },
  },
  hi: {
    common: {
      brand: "जंभ इलेक्ट्रिकल्स",
      language: "भाषा",
      english: "English",
      hindi: "हिंदी",
      menu: "मेन्यू",
      login: "लॉगिन",
      closeMenu: "मेन्यू बंद करें",
      closeMenuOverlay: "मेन्यू ओवरले बंद करें",
      callNow: "कॉल करें",
      whatsapp: "व्हाट्सऐप",
      requestAccount: "अकाउंट के लिए अनुरोध करें",
      viewDetails: "विवरण देखें",
      step: "चरण",
    },
    nav: {
      home: "होम",
      about: "हमारे बारे में",
      services: "सेवाएँ",
      products: "उत्पाद",
      pricing: "कीमतें",
      rentTools: "किराये के टूल",
      contact: "संपर्क",
      requestAccount: "अकाउंट अनुरोध",
    },
    hero: {
      eyebrow: "जंभ इलेक्ट्रिकल्स",
      title: "आपके घर और व्यवसाय के लिए संपूर्ण इलेक्ट्रिकल समाधान",
      copy: "घरों, दुकानों और व्यवसायों के लिए विश्वसनीय इलेक्ट्रिकल सेवाएँ। अनुभवी तकनीशियन, उचित कीमत और सुरक्षित कार्य की गारंटी। रिपेयर, वायरिंग, इंस्टॉलेशन और किराये की सुविधाएँ उपलब्ध।",
      getService: "सेवा बुक करें",
      callNow: "कॉल करें",
      whatsapp: "व्हाट्सऐप",
      serviceMessage: "नमस्ते! मुझे इलेक्ट्रिकल सेवा के लिए सहायता चाहिए।",
      cardNote1: "काम शुरू करने से पहले जरूरत, समय और अनुमानित खर्च पर साफ चर्चा।",
      cardNote2: "आपातकालीन सहायता तकनीशियन की उपलब्धता और सुरक्षा स्थिति के अनुसार।",
      badges: {
        skilledElectricians: "कुशल इलेक्ट्रिशियन",
        safetyFirst: "सुरक्षित काम",
        genuinePricing: "उचित कीमत",
        fastSupport: "तेज सहायता",
      },
    },
    services: {
      eyebrow: "सेवाएँ",
      title: "एक ही जगह पूरी इलेक्ट्रिकल सेवाएँ",
      copy: "उत्पाद, रिपेयर, वायरिंग, फिटिंग और किराये के टूल के लिए साफ और भरोसेमंद विकल्प।",
      items: {
        "electrical-product-sales": {
          title: "इलेक्ट्रिकल उत्पाद",
          shortDescription: "स्विच, सॉकेट, वायर, लाइट, MCB और जरूरी सामान के भरोसेमंद विकल्प।",
        },
        "home-electrical-services": {
          title: "घर की इलेक्ट्रिकल सेवा",
          shortDescription: "घर पर इंस्टॉलेशन, रिपेयर, प्वाइंट चेक और छोटी-बड़ी समस्या का समाधान।",
        },
        "new-wiring-fitting": {
          title: "नई वायरिंग और फिटिंग",
          shortDescription: "घर, दुकान और छोटे व्यवसायों के लिए सुरक्षित वायरिंग और साफ फिटिंग।",
        },
        "appliance-repair": {
          title: "उपकरण रिपेयर",
          shortDescription: "फैन, मोटर, कूलर, वॉशिंग मशीन और अन्य सामान्य उपकरणों की जांच और सहायता।",
        },
        "fault-detection": {
          title: "फॉल्ट जांच",
          shortDescription: "ट्रिपिंग, शॉर्ट सर्किट, ढीले कनेक्शन और खराब प्वाइंट की सुरक्षित जांच।",
        },
        "tool-rental": {
          title: "किराये पर टूल",
          shortDescription: "काम के लिए जरूरी इलेक्ट्रिकल टूल घंटे या दिन के हिसाब से किराये पर उपलब्ध।",
        },
        "maintenance-support": {
          title: "मेंटेनेंस सहायता",
          shortDescription: "लंबे समय तक सुरक्षित उपयोग के लिए नियमित इलेक्ट्रिकल जांच और सुधार।",
        },
        "emergency-support": {
          title: "आपातकालीन सहायता",
          shortDescription: "सुरक्षा और तकनीशियन की उपलब्धता के अनुसार तुरंत सहायता।",
        },
      },
    },
    why: {
      eyebrow: "हमें क्यों चुनें",
      title: "स्थानीय, जिम्मेदार और भरोसेमंद टीम",
      copy: "साफ बातचीत, सही अनुमान, सुरक्षित तरीका और काम पूरा होने तक जिम्मेदार सहायता।",
      items: {
        experiencedElectricians: {
          title: "अनुभवी इलेक्ट्रिशियन",
          copy: "घर और दुकानों के इलेक्ट्रिकल काम का व्यावहारिक अनुभव रखने वाली टीम।",
        },
        qualityWorkmanship: {
          title: "साफ और टिकाऊ काम",
          copy: "फिटिंग, वायरिंग और रिपेयर में neat finish और लंबे समय तक भरोसेमंद परिणाम।",
        },
        onTimeService: {
          title: "समय पर सेवा",
          copy: "पहले से तय समय के अनुसार विजिट और जरूरत पड़ने पर तेज जवाब।",
        },
        transparentPricing: {
          title: "साफ कीमत",
          copy: "काम शुरू करने से पहले खर्च पर स्पष्ट चर्चा, बिना छिपे हुए शुल्क।",
        },
        safePractices: {
          title: "सुरक्षा पहले",
          copy: "हर काम में आइसोलेशन, अर्थिंग और लोड स्थिति जैसी जरूरी सुरक्षा बातों का ध्यान।",
        },
        qualityMaterials: {
          title: "अच्छी सामग्री",
          copy: "काम, बजट और वारंटी के हिसाब से सही वायर, स्विच और फिटिंग की सलाह।",
        },
        clearCommunication: {
          title: "स्पष्ट जानकारी",
          copy: "समस्या, अनुमान, समय और काम की स्थिति पर सरल भाषा में अपडेट।",
        },
        localTrustedSupport: {
          title: "स्थानीय सहायता",
          copy: "काम के बाद भी मार्गदर्शन और जरूरत पड़ने पर आगे की सहायता।",
        },
      },
    },
    process: {
      eyebrow: "काम का तरीका",
      title: "सेवा लेने की आसान प्रक्रिया",
      steps: {
        requestService: "आप सेवा के लिए संपर्क करें",
        inspectRequirement: "हम जरूरत समझते हैं या साइट देखते हैं",
        estimateShared: "काम और खर्च का साफ अनुमान बताया जाता है",
        workCompleted: "सुरक्षा के साथ काम पूरा किया जाता है",
        paymentSupport: "भुगतान और बाद की सहायता",
      },
    },
    pricing: {
      eyebrow: "कीमतें",
      title: "साफ और समझने योग्य कीमतें",
      copy: "अंतिम कीमत काम के प्रकार, स्थान, सामग्री, समय और जरूरत के अनुसार तय होती है।",
      items: {
        inspection: {
          title: "जांच / विजिट",
          price: "Rs.50~150 विजिट",
          note: "टेक्नीशियन के समय और travel के लिए।",
        },
        homeService: {
          title: "होम सर्विस",
          price: "Rs.50 से शुरू",
          note: "काम के प्रकार और लगने वाले समय के अनुसार।",
        },
        wiring: {
          title: "वायरिंग / फिटिंग",
          price: "साइट के अनुसार अनुमान",
          note: "जगह देखने और जरूरत समझने के बाद अंतिम अनुमान।",
        },
        emergency: {
          title: "आपातकालीन / रात की सेवा",
          price: "2x-3x शुल्क",
          note: "8:00 PM के बाद दूरी, जोखिम और उपलब्धता के अनुसार।",
        },
      },
    },
    rentTools: {
      title: "इलेक्ट्रिकल टूल किराये पर चाहिए?",
      copy: "घंटे या दिन के हिसाब से टूल उपलब्ध। टूल लेते समय अग्रिम भुगतान और वापसी पर सही स्थिति जरूरी है।",
      hourly: "Rs. 100/hour",
      daily: "Rs. 500/day",
      cta: "टूल किराये पर लें",
    },
    pages: {
      about: {
        title: "जंभ इलेक्ट्रिकल्स के बारे में",
        copy: "घरों और स्थानीय व्यवसायों को भरोसेमंद इलेक्ट्रिकल सहायता देने में हम प्रतिबद्ध हैं।",
        heading: "हम कौन हैं",
        bullets: {
          mission: "हमारा उद्देश्य सुरक्षित, भरोसेमंद और उचित कीमत पर इलेक्ट्रिकल उत्पाद और सेवाएँ उपलब्ध कराना है।",
          trust: "ग्राहक हमें साफ बातचीत, व्यावहारिक समाधान और भरोसेमंद स्थानीय सहायता के लिए चुनते हैं।",
          safety: "हम हर काम में सुरक्षा को प्राथमिकता देते हैं और जहाँ संभव हो अच्छी सामग्री का उपयोग करते हैं।",
          local: "हमारा स्थानीय सेवा मॉडल तेज प्रतिक्रिया, सही अनुमान और लंबे संबंधों पर आधारित है।",
        },
      },
      services: {
        title: "इलेक्ट्रिकल सेवाएँ",
        copy: "घर, रिपेयर, वायरिंग, मेंटेनेंस और आपातकालीन समर्थन के लिए व्यापक सेवाएँ देखें।",
      },
      products: {
        title: "इलेक्ट्रिकल उत्पाद श्रेणियां",
        copy: "गुणवत्ता, वारंटी और फिटमेंट सहायता के साथ जरूरी इलेक्ट्रिकल उत्पाद देखें।",
        categories: {
          switches: {
            title: "स्विच",
            details: "घर और दुकान की फिटिंग के लिए मॉड्यूलर और मजबूत स्विच।",
          },
          sockets: {
            title: "सॉकेट",
            details: "उपकरणों और अधिक amp उपयोग के लिए सुरक्षित फिटिंग सहायता वाले सॉकेट।",
          },
          wires: {
            title: "वायर",
            details: "लाइट, पावर और जरूरत के अनुसार सेटअप के लिए घरेलू वायरिंग केबल।",
          },
          lights: {
            title: "लाइट्स",
            details: "LED bulbs, panels और energy-efficient fixtures के विकल्प।",
          },
          mcb: {
            title: "MCB",
            details: "ओवरलोड और शॉर्ट-सर्किट सुरक्षा के लिए सुरक्षा उपकरण।",
          },
          boards: {
            title: "बोर्ड",
            details: "Structured electrical points के लिए distribution और switch boards।",
          },
          accessories: {
            title: "सहायक सामान",
            details: "क्लिप, होल्डर, कनेक्टर, टेप और फिटिंग से जुड़ा जरूरी सामान।",
          },
        },
        guidance: {
          qualityTitle: "गुणवत्ता की सलाह",
          qualityCopy: "लोड, उपयोग की मात्रा और बजट के हिसाब से सही गुणवत्ता चुनने में मदद।",
          warrantyTitle: "वारंटी की जानकारी",
          warrantyCopy: "वारंटी निर्माता या सप्लायर की नीति और उत्पाद की स्थिति के अनुसार होती है।",
          fitmentTitle: "विजिट और फिटमेंट शुल्क",
          fitmentCopy: "हर सेवा विजिट पर तय विजिट शुल्क लागू होता है। फिटिंग और मजदूरी का शुल्क काम से पहले बताया जाता है।",
        },
      },
      pricing: {
        title: "पारदर्शी कीमतें",
        copy: "अंतिम कीमत काम शुरू करने से पहले ही साफ बताई जाती है।",
        finalNote: "अंतिम कीमत काम के प्रकार, स्थान, सामग्री, समय और निरीक्षण के दौरान मिले अतिरिक्त मुद्दों पर निर्भर करती है।",
      },
      requestAccount: {
        title: "कस्टमर अकाउंट का अनुरोध करें",
        copy: "अपनी जानकारी भेजें और हमारी टीम जल्दी संपर्क करेगी।",
      },
      rentTools: {
        title: "इलेक्ट्रिकल टूल किराये पर चाहिए?",
        copy: "किराये पर टूल लेने के लिए लॉगिन जरूरी है। अगर आपका अकाउंट है तो पहले लॉगिन करें। अगर अकाउंट नहीं है तो अकाउंट बनाने के लिए अनुरोध भेजें।",
        loginTitle: "टूल किराये पर लेने के लिए लॉगिन जरूरी है",
        accountPoint: "अगर आपका अकाउंट है तो लॉगिन करके अपने कस्टमर अकाउंट से जरूरी टूल का अनुरोध करें।",
        requestPoint: "अगर अकाउंट नहीं है तो अकाउंट अनुरोध फॉर्म भरें। हमारी टीम आपका अकाउंट बनाने में मदद करेगी।",
        pricingTitle: "किराये की कीमत",
        hourly: "घंटे के हिसाब से: Rs. 100 - Rs. 200",
        daily: "दिन के हिसाब से: Rs. 500 - Rs. 700",
        rateCopy: "किराया टूल के प्रकार, स्थिति और उपयोग के हिसाब से बदल सकता है। चुने गए टूल के अनुसार अंतिम किराया कम या ज्यादा हो सकता है।",
        policyCopy: "टूल अग्रिम भुगतान के बाद दिए जाते हैं। देरी, नुकसान या खोने की जिम्मेदारी लेने वाले व्यक्ति की होगी।",
        requestTitle: "टूल किराये के लिए लॉगिन जरूरी है",
        namePlaceholder: "आपका नाम",
        phonePlaceholder: "फोन नंबर",
        toolPlaceholder: "अकाउंट है? लॉगिन करें। अकाउंट नहीं है? अकाउंट अनुरोध भेजें।",
        notesPlaceholder: "समय, तारीख और जरूरी जानकारी",
        button: "अकाउंट अनुरोध भेजें",
      },
      contact: {
        title: "जंभ इलेक्ट्रिकल्स से संपर्क करें",
        copy: "सेवा, उत्पाद, अकाउंट या भुगतान समर्थन के लिए हमसे संपर्क करें।",
        phone: "फोन",
        whatsapp: "व्हाट्सऐप",
        email: "ईमेल",
        address: "पता",
        addressValue: "VPO Lilas, Siwani, Haryana",
        workingHours: "काम का समय",
        workingHoursValue: "8:00 AM - 8:00 PM",
        formTitle: "संपर्क फॉर्म",
        namePlaceholder: "नाम",
        phonePlaceholder: "फोन नंबर",
        messagePlaceholder: "हम आपकी कैसे सहायता कर सकते हैं?",
        submit: "भेजें",
      },
      helpPayment: {
        title: "सहायता और भुगतान नीति",
        copy: "भुगतान की स्पष्ट अपेक्षाएँ और समर्थन प्रतिबद्धताएँ।",
        points: {
          item1: "भुगतान काम पूरा होने के बाद या पहले से तय शर्त के अनुसार किया जाएगा।",
          item2: "उत्पाद, किराये के टूल, जांच, जरूरी काम या अधिक सामग्री वाले काम में अग्रिम भुगतान लिया जा सकता है।",
          item3: "जहाँ संभव हो, काम शुरू करने से पहले शुल्क साफ बता दिया जाता है।",
          item4: "बकाया भुगतान होने पर सेवा रोकना या आगे की सेवा सीमित करना पड़ सकता है।",
          item5: "सेवा, उत्पाद, भुगतान या अकाउंट से जुड़ी किसी भी समस्या के लिए तुरंत संपर्क करें।",
          item6: "सहायता फोन, व्हाट्सऐप, ईमेल और वेबसाइट फॉर्म के माध्यम से उपलब्ध है।",
        },
      },
      serviceDetail: {
        includedTitle: "इस सेवा में क्या शामिल है",
        clarificationTitle: "सेवा की स्पष्ट जानकारी",
        needTitle: "यह सेवा चाहिए?",
        requestService: "सेवा का अनुरोध करें",
        chargeTitle: "शुल्क की जानकारी",
        visitingChargeTitle: "विजिट शुल्क",
        visitingChargeCopy: "सामान्य विजिट शुल्क:  Rs.50~150 प्रति विजिट (सामान्य सेवा क्षेत्र के अंदर)।",
        emergencyTitle: "आपातकालीन समय",
        emergencyCopy: "8:00 PM के बाद रात या आपातकालीन सेवा जोखिम और उपलब्धता के आधार पर 2x-3x हो सकती है।",
        finalAmountTitle: "अंतिम राशि",
        finalAmountCopy: "अंतिम राशि काम की सीमा, स्थान, सामग्री और जांच में मिले अतिरिक्त faults पर निर्भर करती है।",
        policyNote: "यह कीमत नीति हमारी नियम और शर्तों में भी बताई गई है।",
        includes: {
          "electrical-product-sales": {
            item1: "स्विच और सॉकेट",
            item2: "वायर और केबल",
            item3: "MCB और distribution boards",
            item4: "लाइटिंग और सहायक सामान",
          },
          "home-electrical-services": {
            item1: "स्विच और सॉकेट की मरम्मत",
            item2: "फैन और लाइट इंस्टॉलेशन",
            item3: "लोड और सुरक्षा जांच",
            item4: "छोटी rewiring",
            item5: "वॉशिंग मशीन की इलेक्ट्रिकल रिपेयर सहायता",
            item6: "कूलर की इलेक्ट्रिकल रिपेयर सहायता",
            item7: "रेफ्रिजरेटर की इलेक्ट्रिकल जांच",
          },
          "new-wiring-fitting": {
            item1: "साइट की जरूरत समझना",
            item2: "सामग्री की योजना",
            item3: "वायरिंग और फिटिंग",
            item4: "अंतिम सुरक्षा जांच",
          },
          "appliance-repair": {
            item1: "फैन/मोटर की समस्या",
            item2: "वॉशिंग मशीन की इलेक्ट्रिकल जांच",
            item3: "रेफ्रिजरेटर की इलेक्ट्रिकल सहायता",
            item4: "साइट पर समस्या अलग करके जांचना",
          },
          "fault-detection": {
            item1: "शॉर्ट-सर्किट की जांच",
            item2: "लीकेज जांच",
            item3: "ट्रिपिंग का कारण समझना",
            item4: "सुधार की सलाह",
          },
          "tool-rental": {
            item1: "घंटे और दिन के हिसाब से किराया",
            item2: "टूल देने से पहले अग्रिम भुगतान",
            item3: "स्थिति के आधार पर वापसी",
            item4: "नुकसान या खोने पर वसूली",
          },
          "maintenance-support": {
            item1: "नियमित जांच",
            item2: "ढीले प्वाइंट सुधारना",
            item3: "लोड स्थिति की समीक्षा",
            item4: "सुरक्षा सुधार की सलाह",
          },
          "emergency-support": {
            item1: "प्राथमिकता से जवाब",
            item2: "जोखिम पर केंद्रित जांच",
            item3: "अस्थायी स्थिर समाधान",
            item4: "सेवा के बाद follow-up",
          },
        },
        extra: {
          "home-electrical-services": {
            summary: "इलेक्ट्रिकल रिपेयर, फिटिंग और उपकरणों से जुड़ी जांच के लिए भरोसेमंद home visit।",
            point1: "वॉशिंग मशीन, कूलर और रेफ्रिजरेटर जैसे सामान्य उपकरणों के electrical faults में सहायता।",
            point2: "काम basic safety inspection और issue discussion के बाद किया जाता है।",
            point3: "जहाँ संभव हो, सेवा की सीमा और अनुमानित शुल्क काम शुरू करने से पहले बताए जाते हैं।",
          },
          "appliance-repair": {
            summary: "घरेलू उपकरणों और connected points के लिए व्यावहारिक इलेक्ट्रिकल जांच।",
            point1: "जांच में सप्लाई लाइन, लोड व्यवहार और लक्षणों की जांच शामिल होती है।",
            point2: "पार्ट बदलने या अतिरिक्त काम से पहले रिपेयर की सलाह बताई जाती है।",
          },
          "new-wiring-fitting": {
            summary: "योजना से काम पूरा होने तक सुरक्षा-first wiring सहायता।",
            point1: "अंतिम अनुमान से पहले सामग्री और लोड पर चर्चा की जाती है।",
            point2: "छिपी हुई अतिरिक्त समस्याएँ मिलने पर आगे बढ़ने से पहले बताया जाता है।",
          },
        },
      },
      terms: {
        title: "नियम और शर्तें",
        copy: "हमारी सेवाओं, वेबसाइट, अकाउंट अनुरोध, टूल किराये या उत्पाद खरीद के उपयोग से आप इन शर्तों के अधीन हैं।",
        sections: {
          section1: {
            title: "1. सामान्य सेवा शर्तें",
            points: {
              item1: "सभी इलेक्ट्रिकल काम ग्राहक की जरूरत, साइट की स्थिति, सुरक्षा आवश्यकताओं और सामग्री की उपलब्धता के अनुसार किए जाते हैं।",
              item2: "अंतिम शुल्क काम के प्रकार, स्थान, तत्काल जरूरत, इस्तेमाल सामग्री और जांच में मिले अतिरिक्त काम के अनुसार बदल सकता है।",
              item3: "जहाँ संभव हो, काम शुरू करने से पहले शुल्क स्पष्ट बताया जाता है।",
              item4: "ग्राहक को सही संपर्क जानकारी, पता और सेवा की जरूरत बतानी होगी।",
              item5: "पुरानी वायरिंग, खराब फिटिंग, कम गुणवत्ता वाली मौजूदा सामग्री, वोल्टेज समस्या या किसी तीसरे व्यक्ति के काम से हुई समस्या के लिए जंभ इलेक्ट्रिकल्स जिम्मेदार नहीं होगा।",
            },
          },
          section2: {
            title: "2. काम का समय",
            points: {
              item1: "सामान्य काम का समय सुबह 8:00 बजे से रात 8:00 बजे तक है।",
              item2: "रात 8:00 बजे के बाद आने वाले अनुरोध को लेट-नाइट या आपातकालीन सेवा माना जा सकता है।",
              item3: "रात 8:00 बजे के बाद काम के प्रकार, जोखिम, दूरी, जरूरत और उपलब्धता के आधार पर 2x या 3x शुल्क लग सकता है।",
              item4: "आपातकालीन काम तभी लिया जाएगा जब तकनीशियन उपलब्ध हो और सुरक्षा की स्थिति ठीक हो।",
              item5: "काम की जगह असुरक्षित होने पर रात का काम मना किया जा सकता है।",
            },
          },
          section3: {
            title: "3. भुगतान नीति",
            points: {
              item1: "भुगतान सेवा पूरी होने के बाद या पहले से तय सहमति के अनुसार करना होगा।",
              item2: "कुछ सेवाओं में अग्रिम भुगतान जरूरी हो सकता है।",
              item3: "उत्पाद, सामग्री, टूल किराया, तत्काल काम या जांच के लिए अग्रिम भुगतान लिया जा सकता है।",
              item4: "भुगतान में देरी होने पर सेवा रोकना, अकाउंट सीमित करना या भविष्य की सेवा मना करना पड़ सकता है।",
              item5: "नया काम शुरू करने से पहले बकाया बिल साफ करना होगा, जब तक अलग से अनुमति न हो।",
            },
          },
          section4: {
            title: "4. रिफंड नीति",
            points: {
              item1: "जांच, विजिट या पूरा हो चुके काम का भुगतान वापस नहीं होगा।",
              item2: "अग्रिम भुगतान वाली लेकिन शुरू न हुई सेवा का रिफंड समीक्षा के बाद देखा जा सकता है।",
              item3: "काम शुरू होने या सामग्री इस्तेमाल होने के बाद रिफंड उपलब्ध नहीं होगा।",
              item4: "उत्पाद से जुड़ा रिफंड निर्माता या सप्लायर की नीति पर निर्भर करेगा।",
              item5: "स्वीकृत रिफंड जहाँ संभव हो, मूल भुगतान माध्यम से किया जाएगा।",
            },
          },
          section5: {
            title: "5. उत्पाद और सामग्री नीति",
            points: {
              item1: "उत्पाद की वारंटी निर्माता या सप्लायर की नीति के अनुसार होगी।",
              item2: "इस्तेमाल, फिट, खराब या खुले हुए उत्पाद वापस नहीं लिए जा सकते।",
              item3: "एक बार लगाई या इस्तेमाल की गई सामग्री का रिफंड नहीं होगा।",
              item4: "बिलिंग से पहले मॉडल, ब्रांड और मात्रा ग्राहक द्वारा पुष्टि कर लेनी चाहिए।",
            },
          },
          section6: {
            title: "6. काम की गुणवत्ता और सुरक्षा",
            points: {
              item1: "इलेक्ट्रिकल काम में सुरक्षा हमारी पहली प्राथमिकता है।",
              item2: "साइट असुरक्षित होने पर काम रोका या मना किया जा सकता है।",
              item3: "काम की जगह से बच्चों और गैर-जरूरी लोगों को दूर रखें।",
              item4: "छिपे हुए फॉल्ट, पुरानी वायरिंग, पानी की लीकेज या पहले की असुरक्षित फिटिंग परिणाम को प्रभावित कर सकती है।",
              item5: "सेवा के दौरान अतिरिक्त काम मिलने पर आगे बढ़ने से पहले चर्चा की जाती है।",
            },
          },
          section7: {
            title: "7. उपकरण उधार / टूल किराया नीति",
            points: {
              item1: "टूल किराया शुल्क योग्य है और जंभ इलेक्ट्रिकल्स इसे समय-समय पर अपडेट कर सकता है।",
              item2: "सामान्य किराया लगभग Rs. 100 प्रति घंटा और Rs. 500 प्रति दिन से शुरू होता है।",
              item3: "समय टूल देने से शुरू माना जाएगा और पूरा शुल्क अग्रिम जमा होगा।",
              item4: "वापसी में देरी पर घंटे या दिन के हिसाब से अतिरिक्त शुल्क लग सकता है।",
              item5: "उधार अवधि में नुकसान, खोना या चोरी होने पर भरपाई लेने वाले से वसूली जाएगी।",
              item6: "उपकरण लेने के साथ ग्राहक सभी किराया शर्तों से सहमत माना जाएगा।",
            },
          },
          section8: {
            title: "8. जांच और विजिट शुल्क",
            points: {
              item1: "नियमित सेवा क्षेत्र में सामान्य विजिट के लिए  Rs.50~150 का विजिट शुल्क लागू है।",
              item2: "ग्राहक काम आगे न करवाए, तब भी विजिट शुल्क लागू होगा।",
              item3: "विजिट शुल्क में तकनीशियन का समय, यात्रा और जांच का प्रयास शामिल है।",
              item4: "विजिट और जांच शुल्क वापस नहीं होगा।",
            },
          },
          section9: {
            title: "9. रद्द या री-शेड्यूल नीति",
            points: {
              item1: "रद्द या री-शेड्यूल जितना जल्दी हो सके बताएं।",
              item2: "तकनीशियन यात्रा शुरू कर चुका हो या स्थान पर पहुंच गया हो, तो विजिट शुल्क लग सकता है।",
              item3: "बार-बार रद्द करने पर भविष्य की उपलब्धता प्रभावित हो सकती है।",
            },
          },
          section10: {
            title: "10. ग्राहक अकाउंट नीति",
            points: {
              item1: "अकाउंट का उपयोग सेवा इतिहास, बिलिंग, संचार और सहायता के लिए किया जाता है।",
              item2: "सही नाम, फोन, स्थान और सेवा विवरण देना जरूरी है।",
              item3: "बकाया भुगतान या गलत उपयोग की स्थिति में पहुंच या सेवा सीमित की जा सकती है।",
            },
          },
          section11: {
            title: "11. सहायता नीति",
            points: {
              item1: "सेवा, उत्पाद, भुगतान या अकाउंट समस्या के लिए तुरंत संपर्क करें।",
              item2: "हम समस्या की समीक्षा करके संभव सबसे अच्छा समाधान देने की कोशिश करते हैं।",
              item3: "सहायता फोन, व्हाट्सऐप, ईमेल और वेबसाइट फॉर्म पर उपलब्ध है।",
              item4: "हम साफ बातचीत और तेज सहायता को प्राथमिकता देते हैं।",
            },
          },
          section12: {
            title: "12. शर्तों में बदलाव",
            points: {
              item1: "जंभ इलेक्ट्रिकल्स इन शर्तों को कभी भी अपडेट कर सकता है।",
              item2: "अपडेट की गई शर्तें वेबसाइट पर प्रकाशित होने के बाद लागू होंगी।",
            },
          },
        },
      },
      privacy: {
        title: "गोपनीयता नीति",
        copy: "हम आपकी जानकारी कैसे जमा, उपयोग और सुरक्षित करते हैं।",
        points: {
          item1: "हम नाम, फोन, स्थान और सेवा की जरूरत जैसी संपर्क और सेवा जानकारी लेते हैं।",
          item2: "संपर्क जानकारी का उपयोग केवल सेवा संवाद, अकाउंट सहायता, बिलिंग और रिकॉर्ड के लिए किया जाता है।",
          item3: "सेवा रिकॉर्ड बेहतर सहायता और समस्या ट्रैकिंग के लिए सुरक्षित रखे जा सकते हैं।",
          item4: "भुगतान और बातचीत के रिकॉर्ड सहायता, विवाद समाधान और अनुपालन के लिए रखे जाते हैं।",
          item5: "हम निजी जानकारी का गलत उपयोग नहीं करते और ग्राहक जानकारी बेचते नहीं हैं।",
          item6: "जानकारी हटाने या सुधारने के अनुरोध के लिए फोन, व्हाट्सऐप या ईमेल से संपर्क करें।",
        },
      },
      refund: {
        title: "रिफंड नीति",
        copy: "कृपया पुष्टि करने से पहले रिफंड की शर्तों को समझ लें।",
        points: {
          item1: "जांच, सेवा विजिट और पूरा हो चुके काम का भुगतान वापस नहीं होगा।",
          item2: "अग्रिम भुगतान वाली लेकिन शुरू न हुई सेवा का रिफंड समीक्षा के बाद देखा जा सकता है।",
          item3: "काम शुरू होने या सामग्री इस्तेमाल होने के बाद रिफंड उपलब्ध नहीं होगा।",
          item4: "उत्पाद रिफंड निर्माता या सप्लायर की नीति पर निर्भर करेगा।",
          item5: "स्वीकृत रिफंड जहाँ संभव हो, मूल भुगतान माध्यम से किया जाएगा।",
          item6: "रिफंड निर्णय से पहले सहायता-आधारित समाधान की कोशिश की जाती है।",
        },
      },
    },
    account: {
      eyebrow: "ग्राहक अकाउंट",
      title: "अकाउंट के लिए अनुरोध भेजें",
      copy: "अपनी basic जानकारी भेजें। हमारी टीम पुष्टि के लिए आपसे संपर्क करेगी।",
    },
    faq: {
      eyebrow: "सवाल-जवाब",
      title: "अक्सर पूछे जाने वाले सवाल",
      items: {
        homeService: {
          q: "क्या घर पर इलेक्ट्रिकल सेवा मिलती है?",
          a: "हाँ, आपके स्थान और टेक्नीशियन की उपलब्धता के आधार पर घर पर सेवा दी जाती है।",
        },
        applianceRepair: {
          q: "क्या उपकरणों की रिपेयर भी होती है?",
          a: "हाँ, सामान्य इलेक्ट्रिकल उपकरणों की जांच और रिपेयर सहायता उपलब्ध है।",
        },
        warranty: {
          q: "क्या उत्पादों पर वारंटी मिलती है?",
          a: "वारंटी हर उत्पाद की निर्माता या सप्लायर नीति के अनुसार होती है।",
        },
        pricing: {
          q: "कीमत कैसे तय होती है?",
          a: "कीमत काम के प्रकार, स्थान, सामग्री, जरूरत और समय के आधार पर तय होती है। संभव हो तो शुल्क पहले ही बता दिए जाते हैं।",
        },
        tools: {
          q: "क्या टूल किराये पर मिलते हैं?",
          a: "हाँ, सामान्य किराया Rs. 100/hour और Rs. 500/day से शुरू होता है। टूल अग्रिम भुगतान के साथ दिए जाते हैं।",
        },
        hours: {
          q: "काम का समय क्या है?",
          a: "सामान्य समय 8:00 AM से 8:00 PM तक है।",
        },
        emergency: {
          q: "8 PM के बाद आपातकालीन सेवा का शुल्क क्या होगा?",
          a: "रात या आपातकालीन सेवा में दूरी, जोखिम, जरूरत और उपलब्धता के आधार पर 2x या 3x शुल्क लग सकता है।",
        },
      },
    },
    contact: {
      title: "आज ही इलेक्ट्रिकल सहायता चाहिए?",
    },
    footer: {
      copy: "विश्वसनीय इलेक्ट्रिकल उत्पाद, सुरक्षित काम और उचित कीमत के साथ स्थानीय सेवा।",
      quickLinks: "त्वरित लिंक",
      services: "सेवाएँ",
      contactPolicies: "संपर्क और नीतियाँ",
      whatsappLabel: "व्हाट्सऐप",
      workingHours: "काम का समय: 8:00 AM - 8:00 PM",
      terms: "नियम",
      privacy: "गोपनीयता",
      refund: "रिफंड",
      copyright: "All rights reserved.",
      professionalSystem: "जंभ इलेक्ट्रिकल्स सेवा प्रणाली",
      serviceLinks: {
        homeElectricalService: "घर की इलेक्ट्रिकल सेवा",
        productSales: "इलेक्ट्रिकल उत्पाद",
        newWiring: "नई वायरिंग",
        faultDetection: "फॉल्ट जांच",
        applianceRepair: "उपकरण रिपेयर",
        toolRental: "किराये पर टूल",
      },
    },
    form: {
      aria: "अकाउंट अनुरोध फॉर्म",
      fullName: "पूरा नाम",
      fullNamePlaceholder: "अपना पूरा नाम",
      phoneNumber: "फोन नंबर",
      phonePlaceholder: "जैसे 9876543210",
      location: "स्थान",
      locationPlaceholder: "अपना स्थान चुनें",
      contactPreference: "संपर्क का तरीका",
      whatsapp: "व्हाट्सऐप",
      email: "ईमेल",
      serviceRequirement: "सेवा की जरूरत",
      serviceRequirementPlaceholder: "आपको कौन सा काम करवाना है?",
      validationRequired: "कृपया नाम, फोन नंबर और स्थान भरें।",
      requestSubject: "ग्राहक अकाउंट अनुरोध",
      summaryTitle: "ग्राहक अकाउंट अनुरोध",
      summaryName: "नाम",
      summaryPhone: "फोन",
      summaryLocation: "स्थान",
      summaryContactPreference: "संपर्क का तरीका",
      summaryRequirement: "जरूरत",
      success: "आपका अनुरोध तैयार है। हमारी टीम जल्द आपसे संपर्क करेगी।",
      channelError: "चुना हुआ संपर्क माध्यम खुल नहीं पाया। कृपया फिर प्रयास करें।",
      submitting: "भेजा जा रहा है...",
      sendWhatsapp: "व्हाट्सऐप पर भेजें",
      sendEmail: "ईमेल से भेजें",
    },
  },
};

export function isLandingLanguage(value: string | null): value is LandingLanguage {
  return landingLanguages.includes(value as LandingLanguage);
}

export function getTranslation(language: LandingLanguage, key: string) {
  const read = (tree: TranslationTree | string | undefined) =>
    key.split(".").reduce<TranslationTree | string | undefined>((node, part) => {
      if (!node || typeof node === "string") return undefined;
      return node[part];
    }, tree);

  const translated = read(landingTranslations[language]);
  if (typeof translated === "string") return translated;

  const fallback = read(landingTranslations.en);
  return typeof fallback === "string" ? fallback : key;
}
