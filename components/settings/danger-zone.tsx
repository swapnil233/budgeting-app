"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DangerZone() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDelete() {
    setStatus("deleting");
    const result = await deleteUser({ password });
    if (result.error) {
      setStatus("error");
      setErrorMsg(result.error.message ?? "Something went wrong.");
    } else {
      router.push("/sign-in");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPassword("");
      setStatus("idle");
      setErrorMsg("");
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button variant="destructive">Delete Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete account?</DialogTitle>
              <DialogDescription>
                This will permanently delete your account, all transactions, budgets, categories,
                and bank accounts. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="delete-password">Enter your password to confirm</Label>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setStatus("idle"); }}
                placeholder="Password"
              />
              {status === "error" && (
                <p className="text-sm text-destructive">{errorMsg}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={status === "deleting" || !password}
              >
                {status === "deleting" ? "Deleting…" : "Delete Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
