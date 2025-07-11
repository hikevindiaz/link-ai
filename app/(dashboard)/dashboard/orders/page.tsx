'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Button } from "@/components/Button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/Divider";
import { ArrowLeft } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add mobile responsiveness state
  const [isMobileView, setIsMobileView] = useState(false);
  const [showOrderDetailsOnMobile, setShowOrderDetailsOnMobile] = useState(false);
  
  // Simulate fetching orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setOrders(mockOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrders();
  }, []);
  
  // Check for mobile view on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobileView();
    
    // Set up listener for window resize
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);
  
  // Update mobile view state when order is selected
  useEffect(() => {
    if (isMobileView && selectedOrder) {
      setShowOrderDetailsOnMobile(true);
    }
  }, [selectedOrder, isMobileView]);
  
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

  // Handle selecting an order
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    
    // On mobile, show the order details panel
    if (isMobileView) {
      setShowOrderDetailsOnMobile(true);
    }
  };
  
  // Handle going back to the order list on mobile
  const handleBackToList = () => {
    setShowOrderDetailsOnMobile(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
          <div className="flex flex-col items-center max-w-md">
            <Skeleton className="h-10 w-10 rounded-xl mb-4" />
            <Skeleton className="h-4 w-48 mb-1" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Order List */}
      {(!isMobileView || (isMobileView && !showOrderDetailsOnMobile)) && (
        <div className={`${isMobileView ? 'w-full' : 'w-80'} border-r border-neutral-200 dark:border-neutral-800 flex flex-col`}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-black dark:text-white">
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
                    <TabsList className="grid grid-cols-2 sm:grid-cols-4 mb-4">
                      <TabsTrigger value="hours" className="flex items-center gap-2">
                        <RiStore3Line className="h-4 w-4" />
                        <span className="hidden sm:inline">Store Hours</span>
                        <span className="sm:hidden">Hours</span>
                      </TabsTrigger>
                      <TabsTrigger value="delivery" className="flex items-center gap-2">
                        <RiTruckLine className="h-4 w-4" />
                        <span className="hidden sm:inline">Delivery</span>
                        <span className="sm:hidden">Delivery</span>
                      </TabsTrigger>
                      <TabsTrigger value="payment" className="flex items-center gap-2">
                        <RiWalletLine className="h-4 w-4" />
                        <span className="hidden sm:inline">Payment</span>
                        <span className="sm:hidden">Payment</span>
                      </TabsTrigger>
                      <TabsTrigger value="notifications" className="flex items-center gap-2">
                        <RiNotification3Line className="h-4 w-4" />
                        <span className="hidden sm:inline">Notifications</span>
                        <span className="sm:hidden">Alerts</span>
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
                  
                  <DialogFooter className="mt-6 sticky bottom-0 bg-white dark:bg-neutral-950 pt-4 pb-2">
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
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
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
                      <RiFilterLine className="size-4 text-neutral-500" />
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
              onSelectOrder={handleSelectOrder} 
            />
          </div>
        </div>
      )}

      {/* Main Content - Order Details */}
      {(!isMobileView || (isMobileView && showOrderDetailsOnMobile)) && (
        <div className="flex-1 overflow-auto">
          {isMobileView && showOrderDetailsOnMobile && (
            <div className="border-b border-neutral-200 dark:border-neutral-800 p-2">
              <Button
                variant="ghost"
                onClick={handleBackToList}
                className="flex items-center text-neutral-600 dark:text-neutral-300"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to orders
              </Button>
            </div>
          )}
          
          {selectedOrder ? (
            <OrderDetails 
              order={selectedOrder} 
              onUpdateStatus={handleUpdateOrderStatus}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <Card className="p-6 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                <div className="flex flex-col items-center max-w-md">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <RiShoppingBag3Line className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                </div>
                
                  <h3 className="text-sm font-semibold text-black dark:text-white mb-1">
                  Select an order to view details
                  </h3>
                
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                  Choose an order from the sidebar to view its details and manage it.
                </p>
              </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}