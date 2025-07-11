'use client';

import { Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { InvoiceList } from "@/components/billing/invoice-list";

interface InvoicesSectionProps {
  isLoading?: boolean;
}

// Loading component with skeleton design
function InvoicesLoading() {
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">
            Invoices
          </h2>
          <Skeleton className="mt-2 h-4 w-80" />
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
          {[1, 2, 3].map((item) => (
            <TableRow key={item}>
              <TableCell className="py-2.5">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="py-2.5">
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell className="py-2.5">
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell className="py-2.5">
                <Skeleton className="h-6 w-16 rounded-full" />
              </TableCell>
              <TableCell className="text-right py-2.5">
                <Skeleton className="h-8 w-8 rounded-xl" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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