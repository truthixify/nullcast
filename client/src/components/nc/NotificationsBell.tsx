"use client";

/**
 * Bell icon in topbar — currently a placeholder.
 * Real notifications will come from on-chain events in a future iteration.
 */
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

export const NotificationsBell = () => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative h-8 w-8 inline-flex items-center justify-center rounded border border-subtle hover:border-strong text-fg-3 hover:text-fg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[300px] p-0 bg-background border-subtle"
      >
        <div className="px-4 py-3 border-b border-subtle">
          <span className="font-display text-sm text-fg">Notifications</span>
        </div>
        <div className="py-12 text-center font-display italic text-sm text-fg-3">
          All quiet at the table.
        </div>
      </PopoverContent>
    </Popover>
  );
};
