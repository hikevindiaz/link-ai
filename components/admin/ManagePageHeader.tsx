'use client';

import React from 'react';
import { Button } from "@/components/Button";
import { RiAddLine } from "@remixicon/react";

interface ManagePageHeaderProps {
  onInviteUserClick: () => void;
}

export function ManagePageHeader({ onInviteUserClick }: ManagePageHeaderProps) {
  return (
    <div className="px-4 md:px-8 py-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0">
        <h1 className="text-xl font-regular text-neutral-700 dark:text-neutral-200">
          Manage
        </h1>
        <div className="flex items-center space-x-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={onInviteUserClick}
          >
            <RiAddLine className="size-4 mr-2" />
            Invite User
          </Button>
          <Button variant="primary" size="sm">
            <RiAddLine className="size-4 mr-2" />
            Create Agent
          </Button>
        </div>
      </div>
    </div>
  );
} 