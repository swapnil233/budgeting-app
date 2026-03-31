"use client";

import { useState } from "react";
import { changePassword } from "@/lib/auth-client";
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

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSave() {
    if (next !== confirm) {
      setStatus("error");
      setErrorMsg("New passwords do not match.");
      return;
    }
    setStatus("saving");
    const result = await changePassword({ currentPassword: current, newPassword: next });
    if (result.error) {
      setStatus("error");
      setErrorMsg(result.error.message ?? "Something went wrong.");
    } else {
      setStatus("saved");
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  }

  const canSave = current.length > 0 && next.length >= 8 && confirm.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Must be at least 8 characters.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            value={current}
            onChange={(e) => { setCurrent(e.target.value); setStatus("idle"); }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            value={next}
            onChange={(e) => { setNext(e.target.value); setStatus("idle"); }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setStatus("idle"); }}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={status === "saving" || !canSave}>
            {status === "saving" ? "Saving…" : "Save"}
          </Button>
          {status === "saved" && (
            <span className="text-sm text-green-600 dark:text-green-400">Password updated.</span>
          )}
          {status === "error" && (
            <span className="text-sm text-destructive">{errorMsg}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
