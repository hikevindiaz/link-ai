import React from 'react';
import { Card } from "@/components/ui/homepage/card";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="sm:mx-auto sm:max-w-lg">
        <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-800">
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-500/20 text-neutral-800 dark:text-neutral-500">
                {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" })}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
            {action && <div className="mt-4">{action}</div>}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EmptyState; 