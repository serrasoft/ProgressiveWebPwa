import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InAppBrowserProps {
  url: string;
}

export default function InAppBrowser({ url }: InAppBrowserProps) {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center p-2 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm truncate">{url}</p>
      </div>
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            Loading...
          </div>
        )}
        <iframe
          src={url}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}
