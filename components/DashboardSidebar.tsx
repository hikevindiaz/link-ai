"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/Divider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu";
import { RiAddLine, RiMoreFill } from "@remixicon/react";
import { Avatar } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";

export type PhoneNumber = {
  id: string;
  number: string;
  agent: string;
  // Other fields if needed
};

type DashboardSidebarProps = {
  phoneNumbers: PhoneNumber[];
  selectedPhoneNumber: PhoneNumber | null;
  setSelectedPhoneNumber: (phone: PhoneNumber | null) => void;
  onAdd: () => void;
};

export default function DashboardSidebar({
  phoneNumbers,
  selectedPhoneNumber,
  setSelectedPhoneNumber,
  onAdd,
}: DashboardSidebarProps) {
  return (
    <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Phone Numbers
          </h2>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onAdd}
          >
            <RiAddLine className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Divider className="mt-4" />
      <div className="px-4 pb-4 flex-1">
        <div className="grid grid-cols-1 gap-3 mt-1">
          {phoneNumbers.map((phone) => (
            <Card
              key={phone.id}
              asChild
              className="group transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-900 hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-700"
            >
              <div
                className={`relative px-3.5 py-2.5 ${
                  selectedPhoneNumber?.id === phone.id
                    ? "border-blue-500 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-500/5 ring-1 ring-blue-500/20 dark:ring-blue-500/20"
                    : ""
                }`}
                onClick={() => setSelectedPhoneNumber(phone)}
              >
                <div className="flex items-center space-x-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-500">
                    <Icons.phone className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="truncate min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">
                      {phone.number}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {phone.agent || "Not Assigned"}
                    </p>
                  </div>
                  <div className="absolute right-2.5 top-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <RiMoreFill className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => {}}>
                            <Icons.info className="mr-2 h-4 w-4" />
                            Info
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {}}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Icons.trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
} 