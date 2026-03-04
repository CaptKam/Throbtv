import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-foreground mb-2">404</h1>
        <p className="text-muted-foreground mb-6">
          This page doesn't exist.
        </p>
        <Button variant="outline" className="rounded-full" onClick={() => window.location.href = "/"}>
          Go Home
        </Button>
      </div>
    </div>
  );
}
