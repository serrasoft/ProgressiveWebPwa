import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

export default function Profile() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>John Doe</CardTitle>
              <p className="text-sm text-muted-foreground">@johndoe</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <h3 className="font-medium">Email</h3>
              <p className="text-sm text-muted-foreground">john@example.com</p>
            </div>
            <div>
              <h3 className="font-medium">Location</h3>
              <p className="text-sm text-muted-foreground">San Francisco, CA</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
