import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ServiceItem {
  icon: any;
  title: string;
  desc: string;
}

export default function ServicesSection({
  services,
}: {
  services: ServiceItem[];
}) {
  return (
    <section className="bg-muted/30 border-y border-border">
      <div className="container mx-auto px-4 py-11 md:py-20">
        <h2 className="text-2xl md:text-3xl font-semibold text-center">
          What We Offer
        </h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {services.map((s, idx) => (
            <Card key={idx} className="h-full">
              <CardHeader className="sm:pb-0!">
                <div className="flex items-center gap-3">
                  <s.icon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                  <CardTitle className="text-lg">{s.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="!pt-0">
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
