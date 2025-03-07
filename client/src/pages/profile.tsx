import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

export default function Profile() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Profil</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="https://github.com/shadcn.png" alt="Profilbild" />
              <AvatarFallback>
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Johan Andersson</CardTitle>
              <p className="text-sm text-muted-foreground">@johanand</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Namn</h3>
              <p className="text-sm text-muted-foreground">Johan Andersson</p>
            </div>
            <div>
              <h3 className="font-medium">E-post</h3>
              <p className="text-sm text-muted-foreground">johan@example.com</p>
            </div>
            <div>
              <h3 className="font-medium">Port</h3>
              <p className="text-sm text-muted-foreground">42B</p>
            </div>
            <div>
              <h3 className="font-medium">Lägenhetsnummer</h3>
              <p className="text-sm text-muted-foreground">1102</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}