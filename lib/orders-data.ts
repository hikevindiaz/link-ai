import { 
  RiFileListLine, 
  RiSettings3Line, 
  RiCheckboxCircleLine, 
  RiCloseCircleLine,
  RiFilterLine,
  RiShoppingBag3Line,
  RiTruckLine,
  RiStore3Line,
  RiVisaLine,
  RiMastercardLine,
  RiPaypalLine,
  RiMoneyDollarCircleLine,
  RiWalletLine
} from "@remixicon/react";
import { DeliveryMethod } from "@/components/orders/DeliverySettings";
import { PaymentMethod } from "@/components/orders/PaymentSettings";
import { NotificationSettings } from "@/components/orders/NotificationSettings";

// Define the Order type
export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface Agent {
  id: string;
  name: string;
  avatar?: string;
  platform: "whatsapp" | "instagram" | "facebook" | "web" | "other";
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: Date;
  shippingAddress: string;
  paymentMethod: string;
  deliveryMethod: string;
  agent: Agent;
}

// Mock agents
export const mockAgents: Agent[] = [
  {
    id: "agent-1",
    name: "Sarah Johnson",
    platform: "whatsapp"
  },
  {
    id: "agent-2",
    name: "Michael Chen",
    platform: "instagram"
  },
  {
    id: "agent-3",
    name: "Alex Rodriguez",
    platform: "facebook"
  },
  {
    id: "agent-4",
    name: "Jessica Williams",
    platform: "web"
  }
];

// Mock data for orders
export const mockOrders: Order[] = [
  {
    id: "ORD-001",
    customerName: "John Smith",
    customerEmail: "john.smith@example.com",
    customerPhone: "+1 (555) 123-4567",
    items: [
      { name: "Premium Wireless Headphones", price: 149.99, quantity: 1 },
      { name: "USB-C Charging Cable", price: 19.99, quantity: 2 }
    ],
    total: 189.97,
    status: "new",
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    shippingAddress: "123 Main St, New York, NY 10001",
    paymentMethod: "Credit Card",
    deliveryMethod: "In-Store Pickup",
    agent: mockAgents[0] // Sarah Johnson
  },
  {
    id: "ORD-002",
    customerName: "Sarah Johnson",
    customerEmail: "sarah.j@example.com",
    customerPhone: "+1 (555) 234-5678",
    items: [
      { name: "Smart Home Hub", price: 129.99, quantity: 1 },
      { name: "Smart Light Bulbs (4-pack)", price: 49.99, quantity: 1 }
    ],
    total: 179.98,
    status: "confirmed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    shippingAddress: "456 Park Ave, Boston, MA 02108",
    paymentMethod: "Cash on Pickup",
    deliveryMethod: "In-Store Pickup",
    agent: mockAgents[1] // Michael Chen
  },
  {
    id: "ORD-003",
    customerName: "Michael Brown",
    customerEmail: "mbrown@example.com",
    customerPhone: "+1 (555) 345-6789",
    items: [
      { name: "4K Monitor 27\"", price: 349.99, quantity: 1 },
      { name: "Wireless Keyboard and Mouse", price: 79.99, quantity: 1 }
    ],
    total: 429.98,
    status: "preparing",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    shippingAddress: "789 Oak St, Chicago, IL 60007",
    paymentMethod: "Credit Card",
    deliveryMethod: "In-Store Pickup",
    agent: mockAgents[2] // Alex Rodriguez
  },
  {
    id: "ORD-004",
    customerName: "Emily Davis",
    customerEmail: "emily.d@example.com",
    customerPhone: "+1 (555) 456-7890",
    items: [
      { name: "Smartphone Case", price: 24.99, quantity: 1 },
      { name: "Screen Protector", price: 14.99, quantity: 2 }
    ],
    total: 54.97,
    status: "ready",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    shippingAddress: "321 Pine St, Seattle, WA 98101",
    paymentMethod: "Cash on Pickup",
    deliveryMethod: "In-Store Pickup",
    agent: mockAgents[3] // Jessica Williams
  },
  {
    id: "ORD-005",
    customerName: "David Wilson",
    customerEmail: "dwilson@example.com",
    customerPhone: "+1 (555) 567-8901",
    items: [
      { name: "Wireless Earbuds", price: 89.99, quantity: 1 }
    ],
    total: 89.99,
    status: "cancelled",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36), // 1.5 days ago
    shippingAddress: "654 Maple Ave, Austin, TX 78701",
    paymentMethod: "Credit Card",
    deliveryMethod: "In-Store Pickup",
    agent: mockAgents[0] // Sarah Johnson
  },
  {
    id: "ORD-006",
    customerName: "Jennifer Taylor",
    customerEmail: "jtaylor@example.com",
    customerPhone: "+1 (555) 678-9012",
    items: [
      { name: "Laptop Backpack", price: 59.99, quantity: 1 },
      { name: "USB Hub", price: 29.99, quantity: 1 }
    ],
    total: 89.98,
    status: "new",
    createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
    shippingAddress: "987 Cedar St, San Francisco, CA 94101",
    paymentMethod: "Cash on Pickup",
    deliveryMethod: "In-Store Pickup",
    agent: mockAgents[1] // Michael Chen
  },
  {
    id: "ORD-007",
    customerName: "Robert Martinez",
    customerEmail: "rmartinez@example.com",
    customerPhone: "+1 (555) 789-0123",
    items: [
      { name: "External SSD 1TB", price: 149.99, quantity: 1 }
    ],
    total: 149.99,
    status: "completed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    shippingAddress: "753 Birch St, Denver, CO 80201",
    paymentMethod: "Credit Card",
    deliveryMethod: "In-Store Pickup",
    agent: mockAgents[3] // Jessica Williams
  }
];

// Define the StatusConfig type
export interface StatusConfig {
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  variant: string;
}

// Status configuration
export const statusConfig: Record<string, StatusConfig> = {
  all: {
    label: "All Orders",
    icon: RiFilterLine,
    color: "text-gray-500",
    variant: "secondary"
  },
  new: {
    label: "New Orders",
    icon: RiFileListLine,
    color: "text-blue-500",
    variant: "primary"
  },
  confirmed: {
    label: "Confirmed",
    icon: RiCheckboxCircleLine,
    color: "text-blue-500",
    variant: "primary"
  },
  preparing: {
    label: "Preparing",
    icon: RiSettings3Line,
    color: "text-yellow-500",
    variant: "warning"
  },
  ready: {
    label: "Ready for Pickup",
    icon: RiShoppingBag3Line,
    color: "text-green-500",
    variant: "success"
  },
  completed: {
    label: "Completed",
    icon: RiCheckboxCircleLine,
    color: "text-green-500",
    variant: "success"
  },
  cancelled: {
    label: "Cancelled",
    icon: RiCloseCircleLine,
    color: "text-red-500",
    variant: "danger"
  }
};

// Define the StoreHours type
export interface StoreHours {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
}

// Mock data for store hours
export const defaultStoreHours: StoreHours[] = [
  { day: "Monday", open: "09:00", close: "18:00", isOpen: true },
  { day: "Tuesday", open: "09:00", close: "18:00", isOpen: true },
  { day: "Wednesday", open: "09:00", close: "18:00", isOpen: true },
  { day: "Thursday", open: "09:00", close: "18:00", isOpen: true },
  { day: "Friday", open: "09:00", close: "18:00", isOpen: true },
  { day: "Saturday", open: "10:00", close: "16:00", isOpen: true },
  { day: "Sunday", open: "10:00", close: "16:00", isOpen: false }
];

// Default delivery methods
export const defaultDeliveryMethods: DeliveryMethod[] = [
  {
    id: "pickup",
    name: "In-Store Pickup",
    description: "Customers can pick up their orders at the store",
    enabled: true,
    icon: RiStore3Line,
    estimatedTime: "15-30 minutes after order is ready"
  },
  {
    id: "delivery",
    name: "Local Delivery",
    description: "Delivery to customer's address within delivery radius (Currently disabled)",
    enabled: false,
    icon: RiTruckLine,
    fee: 5.99,
    minOrderAmount: 25.00,
    estimatedTime: "30-45 minutes"
  }
];

// Default payment methods
export const defaultPaymentMethods: PaymentMethod[] = [
  {
    id: "cash",
    name: "Cash on Pickup",
    description: "Pay with cash when you pick up your order",
    enabled: true,
    icon: RiMoneyDollarCircleLine,
    instructions: "Please bring exact change if possible.",
    isDefault: true
  },
  {
    id: "credit-card",
    name: "Credit Card",
    description: "Pay with Visa, Mastercard, or American Express",
    enabled: true,
    icon: RiVisaLine,
    isDefault: false
  }
];

// Mock available phone numbers
export const availablePhoneNumbers = [
  { id: "1", number: "+1 (555) 123-4567", label: "Main Store" },
  { id: "2", number: "+1 (555) 987-6543", label: "Customer Service" },
  { id: "3", number: "+1 (555) 456-7890", label: "Manager" }
];

// Default notification settings
export const defaultNotificationSettings: NotificationSettings = {
  smsEnabled: true,
  phoneNumberId: "1",
  phoneNumber: "+1 (555) 123-4567",
  templates: [
    {
      status: "new",
      enabled: true,
      message: "Thank you for your order {{orderNumber}}, {{customerName}}! We've received your order and will begin processing it shortly."
    },
    {
      status: "confirmed",
      enabled: true,
      message: "Good news, {{customerName}}! Your order {{orderNumber}} has been confirmed and is now being prepared."
    },
    {
      status: "preparing",
      enabled: true,
      message: "We're now preparing your order {{orderNumber}}. We'll let you know when it's ready for pickup!"
    },
    {
      status: "ready",
      enabled: true,
      message: "Great news, {{customerName}}! Your order {{orderNumber}} is now ready for pickup. Please come to our store to collect it."
    },
    {
      status: "completed",
      enabled: true,
      message: "Thank you for shopping with us, {{customerName}}! Your order {{orderNumber}} is now complete. We hope to see you again soon!"
    },
    {
      status: "cancelled",
      enabled: true,
      message: "We're sorry, but your order {{orderNumber}} has been cancelled. Please contact us if you have any questions."
    }
  ]
}; 