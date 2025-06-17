import { useState } from "react";
import { Button } from "@/components/Button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Order, OrderItem, statusConfig } from "@/lib/orders-data";
import { 
  RiTimeLine,
  RiUserLine,
  RiMapPinLine,
  RiCalendarLine,
  RiPriceTag3Line,
  RiFileListLine,
  RiSettings3Line,
  RiCheckboxCircleLine,
  RiPhoneLine,
  RiTruckLine,
  RiWalletLine,
  RiUserStarLine
} from "@remixicon/react";

interface OrderDetailsProps {
  order: Order;
  onUpdateStatus?: (orderId: string, newStatus: string) => void;
}

export function OrderDetails({ order, onUpdateStatus }: OrderDetailsProps) {
  const [currentStatus, setCurrentStatus] = useState(order.status);
  
  const StatusIcon = statusConfig[currentStatus as keyof typeof statusConfig]?.icon || RiFileListLine;
  const statusColor = statusConfig[currentStatus as keyof typeof statusConfig]?.color || "text-gray-500";
  
  // Function to capitalize first letter
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  
  const handleStatusChange = (newStatus: string) => {
    setCurrentStatus(newStatus);
    if (onUpdateStatus) {
      onUpdateStatus(order.id, newStatus);
    }
  };
  
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                Order {order.id}
              </h1>
              <Badge 
                variant={(statusConfig[currentStatus as keyof typeof statusConfig]?.variant || "default") as any}
                className="ml-2"
              >
                {capitalize(currentStatus)}
              </Badge>
              <div className="flex items-center ml-3 text-sm text-blue-500">
                <RiUserStarLine className="h-4 w-4 mr-1" />
                {order.agent.name}
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(order.createdAt, { addSuffix: true })}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                • {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Select value={currentStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig)
                  .filter(([key]) => key !== 'all')
                  .map(([status, config]) => {
                    const StatusIcon = config.icon;
                    return (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={cn("size-4", config.color)} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Information */}
          <Card className="p-4">
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-3">
              Customer Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <RiUserLine className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    {order.customerName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {order.customerEmail}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <RiPhoneLine className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    Phone Number
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {order.customerPhone}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <RiTruckLine className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    Delivery Method
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {order.deliveryMethod}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <RiUserStarLine className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    Agent
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {order.agent.name}
                  </p>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Payment Information */}
          <Card className="p-4">
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-3">
              Payment Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <RiWalletLine className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    Payment Method
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {order.paymentMethod}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <RiCalendarLine className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    Order Date
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {order.createdAt.toLocaleDateString()} at {order.createdAt.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <StatusIcon className={cn("h-5 w-5 mr-2 mt-0.5", statusColor)} />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    Order Status
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {statusConfig[currentStatus as keyof typeof statusConfig]?.label || capitalize(currentStatus)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <RiMapPinLine className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    Shipping Address
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {order.shippingAddress}
                  </p>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Order Items */}
          <Card className="p-4 md:col-span-2">
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-3">
              Order Items
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-800">
                  {order.items.map((item: OrderItem, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-50">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-50 text-right">
                        ${(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th scope="row" colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-50">
                      Total
                    </th>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-50 text-right">
                      ${order.total.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
          
          {/* Order Timeline */}
          <Card className="p-4 md:col-span-2">
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-3">
              Order Timeline
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", 
                    currentStatus === 'new' || currentStatus === 'confirmed' || currentStatus === 'preparing' || currentStatus === 'ready' || currentStatus === 'completed'
                      ? "bg-green-100 dark:bg-green-900/20" 
                      : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <RiFileListLine className={cn("h-4 w-4", 
                      currentStatus === 'new' || currentStatus === 'confirmed' || currentStatus === 'preparing' || currentStatus === 'ready' || currentStatus === 'completed'
                        ? "text-green-600 dark:text-green-400" 
                        : "text-gray-400"
                    )} />
                  </div>
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    Order Placed
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {order.createdAt.toLocaleDateString()} at {order.createdAt.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", 
                    currentStatus === 'confirmed' || currentStatus === 'preparing' || currentStatus === 'ready' || currentStatus === 'completed'
                      ? "bg-green-100 dark:bg-green-900/20" 
                      : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <RiCheckboxCircleLine className={cn("h-4 w-4", 
                      currentStatus === 'confirmed' || currentStatus === 'preparing' || currentStatus === 'ready' || currentStatus === 'completed'
                        ? "text-green-600 dark:text-green-400" 
                        : "text-gray-400"
                    )} />
                  </div>
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    Order Confirmed
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentStatus === 'new' || currentStatus === 'cancelled' ? 'Pending' : 'Confirmed'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", 
                    currentStatus === 'preparing' || currentStatus === 'ready' || currentStatus === 'completed'
                      ? "bg-green-100 dark:bg-green-900/20" 
                      : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <RiSettings3Line className={cn("h-4 w-4", 
                      currentStatus === 'preparing' || currentStatus === 'ready' || currentStatus === 'completed'
                        ? "text-green-600 dark:text-green-400" 
                        : "text-gray-400"
                    )} />
                  </div>
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    Preparing
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentStatus === 'new' || currentStatus === 'confirmed' || currentStatus === 'cancelled' ? 'Pending' : 
                     currentStatus === 'preparing' ? 'In progress' : 'Completed'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", 
                    currentStatus === 'ready' || currentStatus === 'completed'
                      ? "bg-green-100 dark:bg-green-900/20" 
                      : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <RiTruckLine className={cn("h-4 w-4", 
                      currentStatus === 'ready' || currentStatus === 'completed'
                        ? "text-green-600 dark:text-green-400" 
                        : "text-gray-400"
                    )} />
                  </div>
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    Ready for {order.deliveryMethod === "In-Store Pickup" ? "Pickup" : "Delivery"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentStatus === 'ready' ? 'Ready now' : 
                     currentStatus === 'completed' ? 'Completed' : 'Pending'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", 
                    currentStatus === 'completed' 
                      ? "bg-green-100 dark:bg-green-900/20" 
                      : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <RiCheckboxCircleLine className={cn("h-4 w-4", 
                      currentStatus === 'completed' 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-gray-400"
                    )} />
                  </div>
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    Completed
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentStatus === 'completed' ? 'Order fulfilled' : 'Pending'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 