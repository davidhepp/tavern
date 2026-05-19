"use client";

import { Gamepad2, Home, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { UserButton } from "@/components/auth/user/user-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/admin", label: "Accounts", icon: Users },
  { href: "/admin/games", label: "Game library", icon: Gamepad2 },
];

export function AdminNav() {
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
      <UserButton size="icon" align="end" />
    </nav>
  );
}
