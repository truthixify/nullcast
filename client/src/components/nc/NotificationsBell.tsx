"use client";

/**
 * Bell icon in topbar + dropdown sheet showing notifications.
 */
import Link from "next/link";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, relTime, type NotifKind } from "@/lib/notifications";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

const KIND_GLYPH: Record<NotifKind, string> = {
  resolution: "✦", payout: "↓", lp_fee: "+", vault: "▲", system: "•",
};

export const NotificationsBell = () => {
  const n = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative h-8 w-8 inline-flex items-center justify-center rounded border border-subtle hover:border-strong text-fg-3 hover:text-fg transition-colors"
          aria-label={`Notifications · ${n.unread} unread`}
        >
          <Bell className="h-3.5 w-3.5" />
          {n.unread > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground font-mono text-[9px] flex items-center justify-center">
              {n.unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] p-0 bg-background border-subtle"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
          <span className="font-display text-sm text-fg">Notifications</span>
          <div className="flex items-center gap-1">
            <button
              onClick={n.markAllRead}
              disabled={n.unread === 0}
              className="h-7 w-7 inline-flex items-center justify-center text-fg-3 hover:text-fg disabled:opacity-30 transition-colors"
              aria-label="Mark all read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={n.clear}
              disabled={n.items.length === 0}
              className="h-7 w-7 inline-flex items-center justify-center text-fg-3 hover:text-no disabled:opacity-30 transition-colors"
              aria-label="Clear all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {n.items.length === 0 ? (
          <div className="py-12 text-center font-display italic text-sm text-fg-3">All quiet at the table.</div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <div>
              {n.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href ?? "#"}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-subtle/60 transition-colors hover:bg-surface-2/40 ${
                    !item.read ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 h-7 w-7 rounded border border-subtle flex items-center justify-center font-mono text-xs shrink-0 ${
                      !item.read ? "text-primary border-primary/30" : "text-fg-3"
                    }`}
                  >
                    {KIND_GLYPH[item.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm text-fg truncate">{item.title}</span>
                      {!item.read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                    </div>
                    <div className="font-display text-xs text-fg-3 mt-0.5 line-clamp-2">{item.body}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-fg-4 mt-1">{relTime(item.ts)} ago</div>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
};
