"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth";

const Profile = () => {
  const { me, logout } = useAuth();
  return (
    <div className="relative group/menu">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span className="h-10 w-10 hover:text-primary hover:bg-lightprimary rounded-full flex justify-center items-center cursor-pointer group-hover/menu:bg-lightprimary group-hover/menu:text-primary">
            <Image
              src="/images/profile/user-1.jpg"
              alt="Profile"
              height={35}
              width={35}
              className="rounded-full"
            />
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-56 rounded-sm shadow-md p-2"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-semibold">{me?.username || "Guest"}</p>
            <p className="text-xs text-link capitalize">
              {me?.role || "—"}
            </p>
          </div>

          <DropdownMenuItem asChild>
            <button
              type="button"
              className="px-3 py-2 flex items-center w-full gap-3 text-darkLink hover:bg-lightprimary hover:text-primary"
            >
              <Icon icon="solar:user-circle-outline" height={20} />
              My Profile
            </button>
          </DropdownMenuItem>

          <div className="p-3 pt-0">
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={logout}
            >
              <Icon icon="solar:logout-3-linear" height={18} className="mr-2" />
              Logout
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default Profile;
