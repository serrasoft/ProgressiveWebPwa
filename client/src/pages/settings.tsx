import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Inställningar</h1>

      <Card>
        <CardHeader>
          <CardTitle>App-inställningar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Mörkt läge</Label>
              <p className="text-sm text-muted-foreground">
                Aktivera mörkt läge för appen
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Offline-läge</Label>
              <p className="text-sm text-muted-foreground">
                Aktivera offline-funktionalitet
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}