'use client';

import { Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { InvoiceList } from "@/components/billing/invoice-list";

export function InvoicesSection() {
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