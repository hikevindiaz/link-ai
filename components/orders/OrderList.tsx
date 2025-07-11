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
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          No orders found
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="space-y-2">
        {orders.map((order) => (
          <div 
            key={order.id}
            onClick={() => onSelectOrder(order)}
            className={cn(
              "group transition-all duration-200 cursor-pointer p-3 rounded-xl border relative",
              "hover:bg-neutral-50 dark:hover:bg-neutral-900",
              "hover:shadow-sm",
              "bg-white dark:bg-black border-neutral-200 dark:border-neutral-800",
              "hover:border-neutral-300 dark:hover:border-neutral-700",
              selectedOrder?.id === order.id && [
                "border-neutral-400 dark:border-white",
                "bg-neutral-50 dark:bg-neutral-900"
              ]
            )}
          >
            <div className="flex items-center">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium">
                #
              </span>
              <div className="ml-3 w-full overflow-hidden">
                <div className="flex justify-between items-center">
                  <div className="flex items-center max-w-[70%]">
                    <div className="truncate text-sm font-semibold text-black dark:text-white">
                      {order.id}
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <Badge 
                        variant={(statusConfig[order.status as keyof typeof statusConfig]?.variant || "default") as any}
                        className="text-xs"
                      >
                        {capitalize(order.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-black dark:text-white">
                    ${order.total.toFixed(2)}
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">
                    {order.customerName}
                  </p>
                  <div className="flex items-center text-xs text-neutral-500 ml-2">
                    <RiTimeLine className="mr-1 h-3.5 w-3.5" />
                    {formatDistanceToNow(order.createdAt, { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 