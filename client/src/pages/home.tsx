import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

const quickLinks = [
  { title: "Nyheter", href: "https://www.hsb.se/sodertorn/brf/docenten/nyheter/" },
  { title: "Boka samlingslokalen", href: "https://mail.docenten.se/bokning/samlingslokalen/" },
  { title: "Boka lägenheten", href: "https://mail.docenten.se/bokning/docenten/lagenheten/" },
  { title: "Boka snickarboa", href: "https://mail.docenten.se/bokning/docenten/snickarboa/" },
  { title: "Inofficiell Facebookgrupp", href: "https://www.facebook.com/groups/1233199001206234/" },
  { title: "Nyheter från styrelsen (login)", href: "https://mitthsb.hsb.se/mitthsb/oversikt/meddelanden-fran-styrelsen/" },
  { title: "Docenten.se", href: "https://www.hsb.se/sodertorn/brf/docenten/" },
];

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Välkommen tillbaka!</h1>

      <Card>
        <CardHeader>
          <CardTitle>Snabblänkar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {quickLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
              >
                <span>{link.title}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}