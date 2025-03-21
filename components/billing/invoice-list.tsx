"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { FileText, Download, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import axios from "axios";

type Invoice = {
  id: string;
  amount: number;
  status: string;
  description: string;
  type: string;
  createdAt: string;
  phoneNumber?: string | null;
  pdfUrl: string | null;
  isStripeInvoice: boolean;
};

export function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get("/api/billing/invoices");
      
      if (response.data.success) {
        setInvoices(response.data.invoices || []);
      } else {
        setError(response.data.message || "Failed to load invoices");
      }
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      setError(
        error.response?.data?.message || "An error occurred while loading your invoices"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "succeeded":
      case "active":
        return (
          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/20">
            <CheckCircle className="mr-1 h-3 w-3" />
            Paid
          </span>
        );
      case "open":
      case "pending":
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-400 dark:ring-yellow-500/20">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-600/20 dark:bg-gray-900/30 dark:text-gray-400 dark:ring-gray-500/20">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={5}>
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <div className="flex justify-center">
              <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-muted-foreground">Loading invoices...</p>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={5}>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-semibold">Failed to load invoices</p>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Button onClick={fetchInvoices} className="mt-4">
              Try Again
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (invoices.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={5}>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">No invoices found</p>
            <p className="mt-2 text-muted-foreground">
              You don't have any invoices yet. They will appear here after you make purchases.
            </p>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {invoices.map((invoice) => (
        <TableRow key={invoice.id}>
          <TableCell>{formatDate(new Date(invoice.createdAt))}</TableCell>
          <TableCell>
            <div className="font-medium">{invoice.description}</div>
            {invoice.phoneNumber && (
              <div className="text-xs text-muted-foreground">
                Phone number: {invoice.phoneNumber}
              </div>
            )}
          </TableCell>
          <TableCell>{formatPrice(invoice.amount)}</TableCell>
          <TableCell>{renderStatusBadge(invoice.status)}</TableCell>
          <TableCell className="text-right">
            {invoice.pdfUrl ? (
              <a 
                href={invoice.pdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <Download className="mr-1 h-4 w-4" />
                PDF
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">
                No PDF available
              </span>
            )}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
} 