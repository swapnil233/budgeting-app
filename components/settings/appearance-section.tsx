"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconMoon, IconSun } from "@tabler/icons-react";

export function AppearanceSection() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose your preferred color theme.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          variant={resolvedTheme === "light" ? "default" : "outline"}
          onClick={() => setTheme("light")}
        >
          <IconSun />
          Light
        </Button>
        <Button
          variant={resolvedTheme === "dark" ? "default" : "outline"}
          onClick={() => setTheme("dark")}
        >
          <IconMoon />
          Dark
        </Button>
      </CardContent>
    </Card>
  );
}
