'use client';

import React, { useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetOverlay, SheetPortal } from '@/components/chat-interface/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  IconBell, 
  IconCalendar, 
  IconShoppingCart, 
  IconUser, 
  IconCheck, 
  IconX
} from '@tabler/icons-react';

// Types for notifications
export type NotificationType = 'appointment' | 'order' | 'user' | 'system' | 'reminder';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date | string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}



interface NotificationsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'appointment':
      return <IconCalendar className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />;
    case 'order':
      return <IconShoppingCart className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />;
    case 'user':
      return <IconUser className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />;
    case 'system':
      return <IconBell className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />;
    case 'reminder':
      return <IconCheck className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />;
    default:
      return <IconBell className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />;
  }
};

const formatTimeAgo = (date: Date | string): string => {
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return dateObj.toLocaleDateString();
};

export function NotificationsDrawer({ open, onOpenChange }: NotificationsDrawerProps) {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  // Fetch notifications when drawer opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay className="z-[9998]" />
        <SheetContent 
          side="right" 
          className="w-full sm:w-80 p-0 bg-white dark:bg-neutral-900 [&>button]:hidden z-[9999] fixed inset-y-0 right-0"
        >
          <SheetHeader className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                Notifications
              </SheetTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="h-7 px-2 text-xs text-neutral-600 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                  >
                    Mark all read
                  </Button>
                )}
                <div
                  onClick={() => onOpenChange(false)}
                  className="h-6 w-6 flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 cursor-pointer"
                >
                  <IconX className="h-4 w-4" />
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                <IconBell className="h-8 w-8 text-neutral-400 dark:text-neutral-600 mb-3" />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  No new notifications
                </p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "relative p-3 rounded-xl transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer group",
                      !notification.read && "bg-neutral-50 dark:bg-neutral-800/50"
                    )}
                    onClick={() => {
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className={cn(
                              "text-sm font-medium",
                              notification.read 
                                ? "text-neutral-700 dark:text-neutral-300" 
                                : "text-neutral-900 dark:text-neutral-100"
                            )}>
                              {notification.title}
                            </h4>
                            <p className={cn(
                              "text-xs mt-0.5 line-clamp-2",
                              "text-neutral-600 dark:text-neutral-400"
                            )}>
                              {notification.message}
                            </p>
                            <span className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 block">
                              {formatTimeAgo(notification.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-start gap-1 ml-2">
                            {!notification.read && (
                              <div className="h-2 w-2 bg-neutral-600 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="h-6 w-6 flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <IconX className="h-3 w-3" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
} 