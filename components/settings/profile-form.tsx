"use client";

import { useState } from "react";
import { updateUser } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [nameValue, setNameValue] = useState(name);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSave() {
    setStatus("saving");
    const result = await updateUser({ name: nameValue });
    if (result.error) {
      setStatus("error");
    } else {
      setStatus("saved");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your display name.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={nameValue}
            onChange={(e) => {
              setNameValue(e.target.value);
              setStatus("idle");
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={status === "saving" || !nameValue.trim()}>
            {status === "saving" ? "Saving…" : "Save"}
          </Button>
          {status === "saved" && (
            <span className="text-sm text-green-600 dark:text-green-400">Saved.</span>
          )}
          {status === "error" && (
            <span className="text-sm text-destructive">Something went wrong.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
