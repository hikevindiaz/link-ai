import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiTimeLine, RiUserLine } from "@remixicon/react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Order, statusConfig } from "@/lib/orders-data";

interface OrderListProps {
  orders: Order[];
  selectedOrder: Order | null;
  onSelectOrder: (order: Order) => void;
}

export function OrderList({ orders, selectedOrder, onSelectOrder }: OrderListProps) {
  // Function to capitalize first letter
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No orders found
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="space-y-2">
        {orders.map((order) => (
          <Card 
            key={order.id}
            className={cn(
              "cursor-pointer p-3 transition-all hover:bg-gray-50 dark:hover:bg-gray-900",
              selectedOrder?.id === order.id && "border-blue-500 ring-1 ring-blue-500 bg-blue-50/50 dark:bg-blue-500/5"
            )}
            onClick={() => onSelectOrder(order)}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    {order.id}
                  </h3>
                  <Badge 
                    variant={(statusConfig[order.status as keyof typeof statusConfig]?.variant || "default") as any}
                    className="ml-2 text-xs"
                  >
                    {capitalize(order.status)}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {order.customerName}
                </p>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                ${order.total.toFixed(2)}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <RiTimeLine className="mr-1 h-3.5 w-3.5" />
                {formatDistanceToNow(order.createdAt, { addSuffix: true })}
              </div>
              <div className="flex items-center text-xs text-blue-500">
                <RiUserLine className="mr-1 h-3.5 w-3.5" />
                {order.agent.name}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 