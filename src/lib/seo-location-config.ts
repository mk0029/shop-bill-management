export const BRAND = "Jambh Electricals";
export const PHONE = "+918607871431";

export interface ServiceConfig {
  slug: string;
  title: string;
  shortDescription: string;
  keywords: string[];
}

export interface LocationConfig {
  slug: string;
  name: string;
  priority: "primary" | "secondary" | "extended";
  nearbyLandmarks?: string;
}

export const services: ServiceConfig[] = [
  {
    slug: "electrician",
    title: "Electrician",
    shortDescription: "Professional electrician services for homes, shops, offices and factories",
    keywords: ["electrician", "electrician near me", "best electrician", "local electrician", "licensed electrician", "professional electrician", "electrical contractor", "bijli wala", "bijli mistri", "इलेक्ट्रिशियन", "बिजली मिस्त्री"],
  },
  {
    slug: "electrical-shop",
    title: "Electrical Shop",
    shortDescription: "Complete electrical store with wires, switches, MCB RCCB, LED lights, fans, inverters and accessories",
    keywords: ["electrical shop", "electrical store", "electric store", "electrical wholesaler", "electrical dealer", "wire shop", "switch shop", "MCB shop", "LED shop", "electrical items", "electrical products", "electrical material", "electric shop", "इलेक्ट्रिकल दुकान", "बिजली सामान"],
  },
  {
    slug: "home-wiring",
    title: "Home Wiring",
    shortDescription: "Complete house wiring, rewiring, concealed wiring, surface wiring for homes, offices and shops",
    keywords: ["house wiring", "home wiring", "electrical wiring", "new wiring", "rewiring", "concealed wiring", "surface wiring", "wire installation", "complete house wiring", "villa wiring", "flat wiring", "office wiring", "shop wiring", "घर की वायरिंग", "नई वायरिंग"],
  },
  {
    slug: "mcb-repair",
    title: "MCB & RCCB Repair",
    shortDescription: "MCB repair, MCB replacement, RCCB installation, distribution board, DB box, circuit breaker services",
    keywords: ["MCB", "MCB repair", "MCB replacement", "MCB installation", "RCCB", "RCCB installation", "RCCB repair", "ELCB", "Isolator", "Changeover", "Distribution Board", "DB Box", "Electrical Panel", "Circuit Breaker", "Electrical Safety", "एमसीबी", "आरसीसीबी"],
  },
  {
    slug: "fault-repair",
    title: "Electrical Fault Repair",
    shortDescription: "Expert electrical fault finding and repair — short circuits, power trips, MCB tripping, current leakage",
    keywords: ["fault repair", "electrical fault", "fault finding", "short circuit repair", "power trip repair", "power failure repair", "earth leakage repair", "current leakage", "MCB tripping", "RCCB tripping", "electrical breakdown", "phase problem", "neutral fault", "शॉर्ट सर्किट", "करंट लीकेज"],
  },
  {
    slug: "fan-repair",
    title: "Fan Repair & Installation",
    shortDescription: "Ceiling fan repair, fan installation, fan wiring, fan regulator, exhaust fan, wall fan services",
    keywords: ["fan repair", "ceiling fan repair", "fan installation", "fan fitting", "fan wiring", "fan regulator repair", "fan capacitor replacement", "fan service", "exhaust fan repair", "wall fan repair", "पंखा रिपेयर", "फैन रिपेयर"],
  },
  {
    slug: "led-installation",
    title: "LED Light Installation",
    shortDescription: "LED light installation, tube light fitting, panel light, ceiling light, wall light, decorative lighting",
    keywords: ["LED light", "LED bulb", "tube light", "panel light", "ceiling light", "wall light", "light repair", "light fitting", "LED installation", "LED repair", "decorative lighting", "indoor lighting", "outdoor lighting", "लाइट रिपेयर"],
  },
  {
    slug: "switch-repair",
    title: "Switch & Socket Repair",
    shortDescription: "Switch repair, switch board repair, modular switch installation, socket repair, plug point repair",
    keywords: ["switch repair", "switch board", "modular switch", "socket repair", "socket installation", "plug repair", "plug point", "power socket", "switch board repair", "स्विच बोर्ड", "सॉकेट रिपेयर"],
  },
  {
    slug: "inverter-repair",
    title: "Inverter & UPS Repair",
    shortDescription: "Inverter repair, inverter installation, battery replacement, UPS repair, power backup services",
    keywords: ["inverter repair", "inverter installation", "inverter battery", "battery replacement", "UPS repair", "power backup", "home inverter", "inverter service", "इन्वर्टर रिपेयर"],
  },
  {
    slug: "motor-repair",
    title: "Motor & Pump Repair",
    shortDescription: "Motor repair, water motor repair, pump repair, submersible repair, motor rewinding services",
    keywords: ["motor repair", "water motor repair", "pump repair", "submersible repair", "submersible pump", "water pump", "pump installation", "motor rewinding", "motor wiring", "pump wiring", "मोटर रिपेयर", "पानी की मोटर"],
  },
];

export const locations: LocationConfig[] = [
  { slug: "lilas", name: "Lilas", priority: "primary", nearbyLandmarks: "Lilas village, Haryana" },
  { slug: "sainiwas", name: "Sainiwas", priority: "primary", nearbyLandmarks: "Sainiwas village, near Lilas" },
  { slug: "siwani", name: "Siwani", priority: "primary", nearbyLandmarks: "Siwani town, Haryana" },
  { slug: "hisar", name: "Hisar", priority: "secondary", nearbyLandmarks: "Hisar city, Haryana" },
  { slug: "tosham", name: "Tosham", priority: "extended" },
  { slug: "bhiwani", name: "Bhiwani", priority: "extended" },
  { slug: "hansi", name: "Hansi", priority: "extended" },
  { slug: "barwala", name: "Barwala", priority: "extended" },
  { slug: "agroha", name: "Agroha", priority: "extended" },
  { slug: "adampur", name: "Adampur", priority: "extended" },
];

export function getServiceBySlug(slug: string): ServiceConfig | undefined {
  return services.find((s) => s.slug === slug);
}

export function getLocationBySlug(slug: string): LocationConfig | undefined {
  return locations.find((l) => l.slug === slug);
}

export function generateLocationTitle(service: ServiceConfig, location: LocationConfig): string {
  return `${service.title} in ${location.name} | Jambh Electricals - Trusted Electrician`;
}

export function generateLocationDescription(service: ServiceConfig, location: LocationConfig): string {
  return `Jambh Electricals provides professional ${service.title.toLowerCase()} services in ${location.name}, Haryana. ${service.shortDescription}. Serving ${location.name} and nearby areas. Call ${PHONE} for emergency electrician services.`;
}

export function generateLocationKeywords(service: ServiceConfig, location: LocationConfig): string[] {
  return [
    `${service.title.toLowerCase()} ${location.name}`,
    `Jambh Electricals ${location.name}`,
    `electrical shop ${location.name}`,
    `electrician ${location.name}`,
    ...service.keywords,
    "electrical services Haryana",
    "Jambh Electricals",
  ];
}
