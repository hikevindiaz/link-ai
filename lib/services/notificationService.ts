import { NotificationType } from '@/components/ui/navigation/NotificationsDrawer';
import prisma from '@/lib/prisma';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

// Create notification in database
async function createNotificationInDB(params: CreateNotificationParams) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl,
      metadata: params.metadata,
      read: false
    }
  });
  
  console.log('Created notification:', notification.id);
  return notification;
}

export class NotificationService {
  
  // Create notification for new appointment
  static async createAppointmentNotification(userId: string, appointmentData: any) {
    await createNotificationInDB({
      userId,
      type: 'appointment',
      title: 'New Appointment Booked',
      message: `${appointmentData.customerName} has booked an appointment for ${appointmentData.date} at ${appointmentData.time}`,
      actionUrl: '/dashboard/calendar',
      metadata: {
        appointmentId: appointmentData.id,
        customerName: appointmentData.customerName,
        appointmentTime: appointmentData.time,
        appointmentDate: appointmentData.date
      }
    });
  }

  // Create notification for new order
  static async createOrderNotification(userId: string, orderData: any) {
    await createNotificationInDB({
      userId,
      type: 'order',
      title: 'New Order Received',
      message: `Order #${orderData.orderNumber} has been placed for ${orderData.total}`,
      actionUrl: '/dashboard/orders',
      metadata: {
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        amount: orderData.total,
        customerName: orderData.customerName
      }
    });
  }

  // Create notification for new user registration
  static async createUserNotification(userId: string, userData: any) {
    await createNotificationInDB({
      userId,
      type: 'user',
      title: 'New User Registration',
      message: `${userData.name} has created a new account`,
      actionUrl: '/dashboard/users',
      metadata: {
        newUserId: userData.id,
        userName: userData.name,
        userEmail: userData.email
      }
    });
  }

  // Create notification for new form submission
  static async createFormNotification(userId: string, formData: any) {
    await createNotificationInDB({
      userId,
      type: 'reminder',
      title: 'New Form Submission',
      message: `New submission received for "${formData.formName}"`,
      actionUrl: '/dashboard/forms',
      metadata: {
        formId: formData.formId,
        formName: formData.formName,
        submissionId: formData.submissionId
      }
    });
  }

  // Create notification for new ticket
  static async createTicketNotification(userId: string, ticketData: any) {
    await createNotificationInDB({
      userId,
      type: 'system',
      title: 'New Support Ticket',
      message: `Ticket #${ticketData.ticketNumber} has been created: "${ticketData.subject}"`,
      actionUrl: '/dashboard/tickets',
      metadata: {
        ticketId: ticketData.id,
        ticketNumber: ticketData.ticketNumber,
        subject: ticketData.subject,
        priority: ticketData.priority
      }
    });
  }

  // Create system notification
  static async createSystemNotification(userId: string, title: string, message: string, actionUrl?: string) {
    await createNotificationInDB({
      userId,
      type: 'system',
      title,
      message,
      actionUrl
    });
  }

  // Bulk create notifications for multiple users (e.g., system-wide announcements)
  static async createBulkNotifications(userIds: string[], notificationData: Omit<CreateNotificationParams, 'userId'>) {
    const promises = userIds.map(userId => 
      createNotificationInDB({
        ...notificationData,
        userId
      })
    );
    
    await Promise.all(promises);
  }
}

// Database trigger functions - these would be called when new records are inserted
export class NotificationTriggers {
  
  // Call this when a new appointment is created
  static async onAppointmentCreated(appointmentData: any) {
    // Get the business owner's user ID (you'd determine this based on your app logic)
    const businessOwnerId = appointmentData.businessOwnerId || 'default-user-id';
    
    await NotificationService.createAppointmentNotification(businessOwnerId, appointmentData);
  }

  // Call this when a new order is created
  static async onOrderCreated(orderData: any) {
    const businessOwnerId = orderData.businessOwnerId || 'default-user-id';
    
    await NotificationService.createOrderNotification(businessOwnerId, orderData);
  }

  // Call this when a new user registers
  static async onUserRegistered(userData: any) {
    // Notify admin users about new registrations
    const adminUserIds = await getAdminUserIds(); // You'd implement this
    
    for (const adminId of adminUserIds) {
      await NotificationService.createUserNotification(adminId, userData);
    }
  }

  // Call this when a new form is submitted
  static async onFormSubmitted(formData: any) {
    const businessOwnerId = formData.businessOwnerId || 'default-user-id';
    
    await NotificationService.createFormNotification(businessOwnerId, formData);
  }

  // Call this when a new ticket is created
  static async onTicketCreated(ticketData: any) {
    const businessOwnerId = ticketData.businessOwnerId || 'default-user-id';
    
    await NotificationService.createTicketNotification(businessOwnerId, ticketData);
  }
}

// Helper function to get admin user IDs
async function getAdminUserIds(): Promise<string[]> {
  // For now, return empty array since your User model doesn't have a role field
  // You can modify this based on your admin identification logic
  return [];
} 