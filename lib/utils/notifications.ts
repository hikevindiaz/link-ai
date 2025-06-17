// Utility functions for triggering notification events

/**
 * Dispatch a new notification event to update notification counts
 * Call this after creating a new notification
 */
export function triggerNewNotification() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('newNotification'));
  }
}

/**
 * Dispatch a notification update event
 * Call this after updating notification status (read/unread)
 */
export function triggerNotificationUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('notificationUpdate'));
  }
}

/**
 * Helper to create a notification and trigger update
 * This is a client-side helper that calls the API
 */
export async function createNotificationFromClient(data: {
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const response = await fetch('/api/notifications/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      triggerNewNotification();
      return await response.json();
    }
    
    throw new Error('Failed to create notification');
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
} 