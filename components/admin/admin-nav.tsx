"use client";

import {
  ChartNoAxesColumn,
  Download,
  Gamepad2,
  Home,
  Ticket,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { UserButton } from "@/components/auth/user/user-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/admin", label: "Overview", icon: ChartNoAxesColumn },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/invitations", label: "Invitations", icon: Ticket },
  { href: "/admin/downloads", label: "Downloads", icon: Download },
  { href: "/admin/games", label: "Game library", icon: Gamepad2 },
];

export function AdminNav({ deployVersion }: { deployVersion: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-3 rounded-lg border bg-card p-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === item.href
              : item.href === "/admin"
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

          return (
            <Button
              key={item.href}
              variant={active ? "default" : "ghost"}
              size="sm"
              asChild
              className={cn("justify-start", active && "pointer-events-none")}
            >
              <Link href={item.href}>
                <Icon />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <span
          className="rounded-md border bg-muted px-2 py-1 text-xs text-muted-foreground"
          title="Current deployment version"
        >
          {deployVersion}
        </span>
        <UserButton size="icon" align="end" />
      </div>
    </nav>
  );
}
