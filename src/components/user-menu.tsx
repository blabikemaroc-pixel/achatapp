"use client";

import { LogOut } from "lucide-react";

import { logout } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

export function UserMenu({
  name,
  email,
  orgName,
}: {
  name?: string | null;
  email?: string | null;
  orgName?: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu du compte"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
            {initials(name, email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{name ?? "Utilisateur"}</p>
          {email && (
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          )}
          {orgName && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Organisation : <span className="font-medium">{orgName}</span>
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="size-4" />
            Se déconnecter
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
