import {
  BadgeCheck,
  Bolt,
  Cable,
  Clock3,
  HandCoins,
  PlugZap,
  ShieldCheck,
  Timer,
  Wrench,
  SearchCheck,
  Drill,
  Lightbulb,
  Gauge,
  MessageCircle,
  AlarmClock,
  CheckCircle2,
} from "lucide-react";

export const siteName = "Jambh Electricals";

export const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Shop Items", href: "/shop-items" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Products", href: "/products" },
  { label: "Pricing", href: "/pricing" },
  { label: "Rent Tools", href: "/rent-tools" },
  { label: "Contact", href: "/contact" },
  { label: "Request Account", href: "/request-account" },
];

export const trustBadges = [
  { icon: BadgeCheck, label: "Skilled Electricians" },
  { icon: ShieldCheck, label: "Safety First" },
  { icon: HandCoins, label: "Genuine Pricing" },
  { icon: Timer, label: "Fast Support" },
];

export const services = [
  {
    slug: "electrical-product-sales",
    icon: PlugZap,
    title: "Electrical Product Sales",
    shortDescription: "Trusted brands for switches, sockets, lights, MCBs, and accessories.",
    includes: [
      "Switches and sockets (modular and heavy-duty)",
      "Wires and cables for all load types",
      "MCB, RCCB, and distribution / DB boxes",
      "LED lights, panels, bulbs, and fixtures",
      "Fans and accessories (ceiling, exhaust, table)",
      "Holders, plugs, switchboards, extension boards",
      "Repair and replacement items (switches, sockets, fuses)",
      "Branded and local options available",
      "Material availability depends on current stock",
    ],
  },
  {
    slug: "home-electrical-services",
    icon: Wrench,
    title: "Home Electrical Services",
    shortDescription: "Professional install, repair, and electrical troubleshooting at home.",
    includes: [
      "Switch and socket fixes",
      "Fan and light installations",
      "Load and safety checks",
      "Minor rewiring",
      "Washing machine electrical repair support",
      "Cooler electrical repair support",
      "Refrigerator electrical repair checks",
    ],
  },
  {
    slug: "new-wiring-fitting",
    icon: Cable,
    title: "New Wiring & Fitting",
    shortDescription: "Complete new wiring and safe fitting for home and small commercial spaces.",
    includes: ["Site requirement discussion", "Material planning", "Wiring and fitting", "Final safety checks"],
  },
  {
    slug: "appliance-repair",
    icon: Drill,
    title: "Appliance Repair",
    shortDescription: "Repair support for common electrical appliances with practical diagnostics.",
    includes: ["Fan/motor issues", "Washing machine electrical checks", "Basic refrigerator electrical support", "On-site issue isolation"],
  },
  {
    slug: "fault-detection",
    icon: SearchCheck,
    title: "Fault Detection",
    shortDescription: "Fast fault finding for trip issues, short circuits, and unstable points.",
    includes: ["Short-circuit diagnosis", "Leakage checks", "Tripping reason analysis", "Corrective recommendation"],
  },
  {
    slug: "tool-rental",
    icon: Bolt,
    title: "Tool Rental",
    shortDescription: "Borrow electrical tools at transparent hourly or daily rates.",
    includes: ["Hourly and daily rental", "Advance payment before handover", "Condition-based return", "Damage/loss recoverable"],
  },
  {
    slug: "maintenance-support",
    icon: Gauge,
    title: "Maintenance Support",
    shortDescription: "Routine preventive electrical checks for safer long-term operation.",
    includes: ["Periodic inspections", "Loose-point correction", "Load condition review", "Safety improvement tips"],
  },
  {
    slug: "emergency-support",
    icon: AlarmClock,
    title: "Emergency Support",
    shortDescription: "Urgent response after normal hours based on technician availability and safety.",
    includes: ["Priority response", "Risk-focused inspection", "Temporary stabilization", "Service follow-up"],
  },
];

export const whyChooseUs = [
  { icon: BadgeCheck, title: "Experienced Electricians", copy: "Skilled field experience across home and local commercial electrical work." },
  { icon: CheckCircle2, title: "Quality Workmanship", copy: "Clean execution with practical reliability and durable outcomes." },
  { icon: Clock3, title: "On-Time Service", copy: "Planned visits and responsive support when time matters." },
  { icon: HandCoins, title: "Transparent Pricing", copy: "Clear, pre-work charge discussion with no hidden surprises." },
  { icon: ShieldCheck, title: "Safe Practices", copy: "Safety-first process and site suitability checks for every task." },
  { icon: Lightbulb, title: "Quality Materials", copy: "Material suggestions based on reliability, warranty, and budget." },
  { icon: MessageCircle, title: "Clear Communication", copy: "Simple updates on issue, estimate, and completion status." },
  { icon: PlugZap, title: "Local Trusted Support", copy: "Community-first service with dependable after-work guidance." },
];

export const processSteps = [
  "Request service",
  "We inspect requirement",
  "Estimate shared",
  "Work completed safely",
  "Payment and support",
];

export const pricingHighlights = [
  { title: "Inspection / Visit", price: " Rs.50~150 Visit", note: "Charged for technician time and travel." },
  { title: "Home Service", price: "Starts from ₹300", note: "Depends on repair type and duration." },
  { title: "Wiring / Fitting", price: "Estimate Based", note: "Final quote after site review." },
  { title: "Emergency / Late-Night", price: "2x-3x Charge", note: "After 8:00 PM based on risk and urgency." },
];

export const testimonials = [
  { name: "Rohit S.", place: "Siwani", feedback: "Quick visit and very clear pricing. Wiring issue fixed safely in one go." },
  { name: "Pooja D.", place: "Lilas", feedback: "Professional behavior and good explanation before starting work." },
  { name: "Manoj K.", place: "Local Market", feedback: "Bought quality electrical items and got fitting support the same day." },
  { name: "Sunita R.", place: "Nearby Village", feedback: "Emergency help at night was handled carefully and responsibly." },
];

export const faqs = [
  { q: "Do you provide home service?", a: "Yes, we provide home electrical services based on location and technician availability." },
  { q: "Do you repair appliances?", a: "Yes, we support common appliance electrical repairs and diagnostics." },
  { q: "Do you provide product warranty?", a: "Warranty depends on manufacturer or supplier policy for each product." },
  { q: "How is pricing calculated?", a: "Pricing depends on work type, location, urgency, material, and timing. Charges are discussed before work when possible." },
  { q: "Can I rent tools?", a: "Yes. Standard rental starts around ₹100/hour and ₹500/day with advance payment." },
  { q: "What are working hours?", a: "Standard hours are 8:00 AM to 8:00 PM." },
  { q: "What happens for emergency work after 8 PM?", a: "Late-night/emergency service may be 2x or 3x based on risk, distance, urgency, and availability." },
];
