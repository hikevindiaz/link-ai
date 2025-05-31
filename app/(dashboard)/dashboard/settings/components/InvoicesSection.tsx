'use client';

import { Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { InvoiceList } from "@/components/billing/invoice-list";

interface InvoicesSectionProps {
  isLoading?: boolean;
}

// Loading component with indigo theme
function InvoicesLoading() {
  return (
    <div>
      <h2 className="font-semibold text-gray-900 dark:text-gray-50">
        Invoices
      </h2>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
        View and download your billing history.
      </p>
      
      <div className="mt-6 rounded-lg border border-gray-200 bg-white text-gray-950 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 p-8">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 mb-4"></div>
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-50 mb-2">
            Loading invoices
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
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
          <h2 className="font-semibold text-gray-900 dark:text-gray-50">
            Invoices
          </h2>
          <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-500">
            View and download your billing history.
          </p>
        </div>
      </div>

      <Table className="mt-10">
        <TableHead>
          <TableRow className="border-b border-gray-200 dark:border-gray-800">
            <TableCell className="text-xs font-medium uppercase text-gray-500 dark:text-gray-500">
              Date
            </TableCell>
            <TableCell className="text-xs font-medium uppercase text-gray-500 dark:text-gray-500">
              Description
            </TableCell>
            <TableCell className="text-xs font-medium uppercase text-gray-500 dark:text-gray-500">
              Amount
            </TableCell>
            <TableCell className="text-xs font-medium uppercase text-gray-500 dark:text-gray-500">
              Status
            </TableCell>
            <TableCell className="text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-500">
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