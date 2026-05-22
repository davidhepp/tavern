import { UserButton } from "@/components/auth/user/user-button";

export function DashboardHeader() {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Tavern</p>
        <h1 className="text-2xl font-semibold tracking-normal">
          Game Library
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <UserButton size="icon" align="end" />
      </div>
    </header>
  );
}
