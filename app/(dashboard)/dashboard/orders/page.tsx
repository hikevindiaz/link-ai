'use client';

import { useState } from 'react';
import { useSession } from "next-auth/react";
import { Button } from "@/components/Button";
import { Badge } from "@/components/ui/badge";
import { Divider } from "@/components/Divider";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RiFilterLine, 
  RiFileListLine, 
  RiSettings3Line, 
  RiCheckboxCircleLine, 
  RiCloseCircleLine,
  RiSettings4Line,
  RiStore3Line,
  RiTruckLine,
  RiWalletLine,
  RiNotification3Line,
  RiShoppingBag3Line
} from "@remixicon/react";
import { cn } from "@/lib/utils";

// Import components
import { OrderList } from "@/components/orders/OrderList";
import { OrderDetails } from "@/components/orders/OrderDetails";
import { StoreHoursSettings } from "@/components/orders/StoreHoursSettings";
import { DeliverySettings, DeliveryMethod } from "@/components/orders/DeliverySettings";
import { PaymentSettings, PaymentMethod } from "@/components/orders/PaymentSettings";
import { NotificationSettings } from "@/components/orders/NotificationSettings";
import { 
  Order, 
  StatusConfig, 
  StoreHours, 
  mockOrders, 
  statusConfig, 
  defaultStoreHours,
  defaultDeliveryMethods,
  defaultPaymentMethods,
  defaultNotificationSettings
} from "@/lib/orders-data";

export default function OrdersPage() {
  const { data: session } = useSession();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [storeHours, setStoreHours] = useState<StoreHours[]>(defaultStoreHours);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>(defaultDeliveryMethods);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(defaultPaymentMethods);
  const [notificationSettings, setNotificationSettings] = useState(defaultNotificationSettings);
  const [settingsTab, setSettingsTab] = useState("hours");
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  
  // Function to capitalize first letter
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  
  // Filter orders based on status filter
  const filteredOrders = statusFilter === "all" 
    ? orders 
    : orders.filter((order: Order) => order.status === statusFilter);

  // Count orders by status
  const orderCounts = {
    all: orders.length,
    new: orders.filter((order: Order) => order.status === "new").length,
    confirmed: orders.filter((order: Order) => order.status === "confirmed").length,
    preparing: orders.filter((order: Order) => order.status === "preparing").length,
    ready: orders.filter((order: Order) => order.status === "ready").length,
    completed: orders.filter((order: Order) => order.status === "completed").length,
    cancelled: orders.filter((order: Order) => order.status === "cancelled").length,
  };

  // Handle store hours change
  const handleStoreHoursChange = (index: number, field: string, value: string | boolean) => {
    const updatedHours = [...storeHours];
    updatedHours[index] = { ...updatedHours[index], [field]: value };
    setStoreHours(updatedHours);
  };

  // Handle save settings
  const handleSaveSettings = () => {
    // Here you would typically save the settings to your backend
    console.log('Saving settings:', {
      storeHours,
      deliveryMethods,
      paymentMethods,
      notificationSettings
    });
    
    setSettingsDialogOpen(false);
  };
  
  // Handle order status update
  const handleUpdateOrderStatus = (orderId: string, newStatus: string) => {
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    setOrders(updatedOrders);
    
    // Update selected order if it's the one being modified
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Order List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Orders
            </h2>
            
            {/* Settings Dialog */}
            <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="secondary"
                  className="h-8 w-8 p-1 flex items-center justify-center"
                >
                  <RiSettings4Line className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Store Settings</DialogTitle>
                  <DialogDescription>
                    Configure your store settings and order workflow.
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs value={settingsTab} onValueChange={setSettingsTab} className="mt-4">
                  <TabsList className="grid grid-cols-4 mb-4">
                    <TabsTrigger value="hours" className="flex items-center gap-2">
                      <RiStore3Line className="h-4 w-4" />
                      <span>Store Hours</span>
                    </TabsTrigger>
                    <TabsTrigger value="delivery" className="flex items-center gap-2">
                      <RiTruckLine className="h-4 w-4" />
                      <span>Delivery</span>
                    </TabsTrigger>
                    <TabsTrigger value="payment" className="flex items-center gap-2">
                      <RiWalletLine className="h-4 w-4" />
                      <span>Payment</span>
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex items-center gap-2">
                      <RiNotification3Line className="h-4 w-4" />
                      <span>Notifications</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="hours" className="space-y-4">
                    <StoreHoursSettings 
                      storeHours={storeHours} 
                      onStoreHoursChange={handleStoreHoursChange} 
                    />
                  </TabsContent>
                  
                  <TabsContent value="delivery">
                    <DeliverySettings 
                      deliveryMethods={deliveryMethods}
                      onDeliveryMethodsChange={setDeliveryMethods}
                    />
                  </TabsContent>
                  
                  <TabsContent value="payment">
                    <PaymentSettings 
                      paymentMethods={paymentMethods}
                      onPaymentMethodsChange={setPaymentMethods}
                    />
                  </TabsContent>
                  
                  <TabsContent value="notifications">
                    <NotificationSettings 
                      settings={notificationSettings}
                      onSettingsChange={setNotificationSettings}
                    />
                  </TabsContent>
                </Tabs>
                
                <DialogFooter className="mt-6 sticky bottom-0 bg-white dark:bg-gray-950 pt-4 pb-2">
                  <Button 
                    variant="secondary" 
                    className="mr-2"
                    onClick={() => setSettingsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSettings}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View and manage your orders
          </p>
          
          {/* Status Filter Select */}
          <div className="mt-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="flex items-center">
                  <div className="flex items-center gap-2">
                    <RiFilterLine className="size-4 text-gray-500" />
                    <span>All Orders</span>
                    <Badge 
                      variant="secondary"
                      className="ml-auto text-xs"
                    >
                      {orderCounts.all}
                    </Badge>
                  </div>
                </SelectItem>
                {Object.entries(statusConfig).filter(([key]) => key !== 'all').map(([status, config]) => {
                  const StatusIcon = config.icon;
                  return (
                    <SelectItem key={status} value={status} className="flex items-center">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn("size-4", config.color)} />
                        <span>{capitalize(config.label)}</span>
                        <Badge 
                          variant={(statusConfig[status as keyof typeof statusConfig]?.variant || "default") as any}
                          className="ml-auto text-xs"
                        >
                          {orderCounts[status as keyof typeof orderCounts] || 0}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Divider />
        
        <div className="flex-1 overflow-auto">
          <OrderList 
            orders={filteredOrders} 
            selectedOrder={selectedOrder} 
            onSelectOrder={setSelectedOrder} 
          />
        </div>
      </div>

      {/* Main Content - Order Details */}
      <div className="flex-1 overflow-auto">
        {selectedOrder ? (
          <OrderDetails 
            order={selectedOrder} 
            onUpdateStatus={handleUpdateOrderStatus}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="flex max-w-md flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <RiShoppingBag3Line className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              
              <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
                Select an order to view details
              </h2>
              
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Choose an order from the sidebar to view its details and manage it.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}