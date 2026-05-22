import { Gamepad2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type GameLibraryEmptyStateProps = {
  isAdmin: boolean;
  search: string;
};

export function GameLibraryEmptyState({
  isAdmin,
  search,
}: GameLibraryEmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-10 items-center justify-center rounded-md bg-muted">
          <Gamepad2 className="size-5" />
        </div>
        <div>
          <p className="font-medium">
            {search ? "No matching games" : "No games yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Add the first game collection from the admin library."
              : "An admin has not published any game collections yet."}
          </p>
        </div>
        {isAdmin ? (
          <Button asChild>
            <Link href="/admin/games">Manage library</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
