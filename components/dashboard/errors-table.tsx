import { Card } from '@/components/ui/homepage/card';
import { RiArrowRightUpLine } from '@remixicon/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from '@/components/Table';

interface ErrorData {
  agent: string;
  chatbotId: string;
  threadId: string;
  error: string;
  date: string;
}

interface ErrorsTableProps {
  errors: ErrorData[];
}

export function ErrorsTable({ errors }: ErrorsTableProps) {
  return (
    <Card className="mt-8 p-6">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-50">
          Recent Agent Errors
        </h3>
        <p className="mt-1 text-sm/6 text-gray-500 dark:text-gray-50">
          Overview of all the agents errors within your organization.
        </p>
      </div>
      {errors.length ? (
        <TableRoot className="mt-8">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Agent</TableHeaderCell>
                <TableHeaderCell>Thread ID</TableHeaderCell>
                <TableHeaderCell>Error</TableHeaderCell>
                <TableHeaderCell className="text-right">Date</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {errors.map((item) => (
                <TableRow
                  key={item.threadId}
                  className="group cursor-pointer even:bg-gray-50 hover:bg-gray-100 dark:even:bg-gray-900 dark:hover:bg-gray-800"
                  onClick={() => window.location.href = `/dashboard/chatbots/${item.chatbotId}/errors`}
                >
                  <TableCell className="font-medium text-gray-900 dark:text-gray-50">
                    {item.agent}
                  </TableCell>
                  <TableCell>{item.threadId}</TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate whitespace-normal line-clamp-2 text-sm">
                      {item.error}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.date}
                    <RiArrowRightUpLine 
                      className="ml-2 inline-block size-4 text-gray-400 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-500" 
                      aria-hidden={true}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableRoot>
      ) : (
        <div className="mt-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No errors found. Your chatbots are running smoothly.
          </p>
        </div>
      )}
    </Card>
  );
} 