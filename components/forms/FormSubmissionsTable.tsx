import { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { Form, FormSubmission } from "@/hooks/useForms";
import { cn } from "@/lib/utils";
import { FormRadioGroup, FormRadioItem } from "@/components/FormRadioCards";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from "@/components/Table";

interface FormSubmissionsTableProps {
  form: Form;
  submissions: FormSubmission[];
  onViewSubmission: (submission: FormSubmission) => void;
}

// Define the column meta type
type ColumnMeta = {
  align?: string;
};

export function FormSubmissionsTable({
  form,
  submissions,
  onViewSubmission,
}: FormSubmissionsTableProps) {
  // Create columns for the table
  const columns = useMemo<ColumnDef<FormSubmission, any>[]>(() => {
    // Get the first few fields from the form to display as columns
    const fieldColumns = form.fields.slice(0, 3).map((field) => ({
      header: field.name,
      accessorFn: (row: FormSubmission) => row.data[field.name] || "-",
      id: field.id,
      meta: {
        align: "text-left",
      } as ColumnMeta,
    }));

    return [
      {
        header: "Chatbot",
        accessorKey: "chatbotName",
        meta: {
          align: "text-left",
        } as ColumnMeta,
      },
      ...fieldColumns,
      {
        header: "Submitted",
        accessorFn: (row: FormSubmission) => {
          const date = new Date(row.createdAt);
          return formatDistanceToNow(date, { addSuffix: true });
        },
        id: "createdAt",
        meta: {
          align: "text-right",
        } as ColumnMeta,
      },
      {
        header: "Actions",
        id: "actions",
        cell: ({ row }: any) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewSubmission(row.original);
            }}
            className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-300"
          >
            View
          </button>
        ),
        meta: {
          align: "text-right",
        } as ColumnMeta,
      },
    ];
  }, [form.fields, onViewSubmission]);

  // Create filter tabs based on chatbots
  const tabs = useMemo(() => {
    const chatbotCounts = submissions.reduce(
      (acc, submission) => {
        const chatbotName = submission.chatbotName;
        if (!acc[chatbotName]) {
          acc[chatbotName] = 0;
        }
        acc[chatbotName]++;
        acc["All"]++;
        return acc;
      },
      { All: 0 } as Record<string, number>
    );

    return Object.entries(chatbotCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [submissions]);

  // Table state
  const [chatbotFilter, setChatbotFilter] = useState<string>("All");

  // Create table instance
  const table = useReactTable({
    data: submissions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      columnFilters: chatbotFilter !== "All" ? [{ id: "chatbotName", value: chatbotFilter }] : [],
    },
    onColumnFiltersChange: () => {},
    initialState: {
      sorting: [
        {
          id: "createdAt",
          desc: true,
        },
      ],
    },
  });

  if (submissions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="flex max-w-md flex-col items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No submissions yet for this form.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FormRadioGroup
        name="Chatbot"
        value={chatbotFilter}
        onValueChange={setChatbotFilter}
        className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      >
        {tabs.map((tab) => (
          <FormRadioItem key={tab.name} value={tab.name}>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {tab.name}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {tab.value}
            </p>
          </FormRadioItem>
        ))}
      </FormRadioGroup>

      <TableRoot className="h-[calc(100vh-300px)] overflow-y-auto">
        <Table className="border-separate border-spacing-0 border-transparent">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHeaderCell
                    key={header.id}
                    className={cn(
                      (header.column.columnDef.meta as ColumnMeta)?.align,
                      "sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHeaderCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow 
                key={row.id}
                onClick={() => onViewSubmission(row.original)}
                className="cursor-pointer"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      (cell.column.columnDef.meta as ColumnMeta)?.align,
                      "border-b border-gray-200 dark:border-gray-800"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableRoot>
    </div>
  );
} 