import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, MessageCircle, Mail, Home as HomeIcon } from "lucide-react";

function ContactCard({
  icon: Icon,
  title,
  value,
  href,
}: {
  icon: any;
  title: string;
  value: string;
  href: string;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="block">
      <Card className="h-full hover:shadow-sm transition">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="!pt-0">
          <div className="text-muted-foreground break-all">{value}</div>
        </CardContent>
      </Card>
    </a>
  );
}

export default function ContactSection({
  support,
}: {
  support: { phone: string; whatsapp: string; email: string };
}) {
  return (
    <section className="bg-muted/30 border-y border-border">
      <div className="container mx-auto px-4 py-14 md:py-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <ContactCard
          icon={Phone}
          title="Phone"
          value={support.phone}
          href={`tel:${support.phone}`}
        />
        <ContactCard
          icon={MessageCircle}
          title="WhatsApp"
          value={support.whatsapp}
          href={`whatsapp://send?phone=${support.whatsapp.replace(/[^0-9]/g, "")}`}
        />
        <ContactCard
          icon={Mail}
          title="Email"
          value={support.email}
          href={`mailto:${support.email}`}
        />
        <ContactCard
          icon={HomeIcon}
          title="Address"
          value="Vpo Lilas, Siwani, Haryana"
          href="#"
        />
      </div>
    </section>
  );
}
