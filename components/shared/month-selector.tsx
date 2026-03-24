"use client";

import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MonthSelector({ month, year }: { month: number; year: number }) {
  const router = useRouter();

  function navigate(deltaMonth: number) {
    let m = month + deltaMonth;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    const params = new URLSearchParams({ month: String(m), year: String(y) });
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
        <IconChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[120px] text-center font-medium">
        {MONTHS[month - 1]} {year}
      </span>
      <Button variant="outline" size="icon" onClick={() => navigate(1)}>
        <IconChevronRight className="size-4" />
      </Button>
    </div>
  );
}
