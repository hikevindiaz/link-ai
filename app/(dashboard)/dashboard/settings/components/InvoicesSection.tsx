'use client';

import { Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { InvoiceList } from "@/components/billing/invoice-list";

interface InvoicesSectionProps {
  isLoading?: boolean;
}

// Loading component with neutral theme
function InvoicesLoading() {
  return (
    <div>
      <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">
        Invoices
      </h2>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
        View and download your billing history.
      </p>
      
      <div className="mt-6 rounded-lg border border-neutral-200 bg-white text-neutral-950 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 p-8">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600 mb-4"></div>
          <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-50 mb-2">
            Loading invoices
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
            Please wait while we retrieve your billing history.
          </p>
        </div>
      </div>
    </div>
  );
}

export function InvoicesSection({ isLoading = false }: InvoicesSectionProps) {
  // Show loading state
  if (isLoading) {
    return <InvoicesLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">
            Invoices
          </h2>
          <p className="mt-2 text-sm/6 text-neutral-500 dark:text-neutral-500">
            View and download your billing history.
          </p>
        </div>
      </div>

      <Table className="mt-10">
        <TableHead>
          <TableRow className="border-b border-neutral-200 dark:border-neutral-800">
            <TableCell className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-500">
              Date
            </TableCell>
            <TableCell className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-500">
              Description
            </TableCell>
            <TableCell className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-500">
              Amount
            </TableCell>
            <TableCell className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-500">
              Status
            </TableCell>
            <TableCell className="text-right text-xs font-medium uppercase text-neutral-500 dark:text-neutral-500">
              Download
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <InvoiceList />
        </TableBody>
      </Table>
    </div>
  );
} 