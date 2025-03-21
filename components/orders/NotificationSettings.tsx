import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/Button";
import { Divider } from "@/components/Divider";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  RiNotification3Line,
  RiPhoneLine,
  RiMessage2Line
} from "@remixicon/react";
import { statusConfig, availablePhoneNumbers } from "@/lib/orders-data";

export interface NotificationTemplate {
  status: string;
  enabled: boolean;
  message: string;
}

export interface NotificationSettings {
  smsEnabled: boolean;
  phoneNumberId?: string;
  phoneNumber: string;
  templates: NotificationTemplate[];
}

interface NotificationSettingsProps {
  settings: NotificationSettings;
  onSettingsChange: (settings: NotificationSettings) => void;
}

export function NotificationSettings({ 
  settings, 
  onSettingsChange 
}: NotificationSettingsProps) {
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  const handleToggleSMS = (enabled: boolean) => {
    onSettingsChange({
      ...settings,
      smsEnabled: enabled
    });
  };

  const handlePhoneNumberChange = (phoneNumberId: string) => {
    const selectedPhone = availablePhoneNumbers.find(p => p.id === phoneNumberId);
    if (selectedPhone) {
      onSettingsChange({
        ...settings,
        phoneNumberId,
        phoneNumber: selectedPhone.number
      });
    }
  };

  const handleToggleTemplate = (status: string) => {
    const updatedTemplates = settings.templates.map(template => 
      template.status === status ? { ...template, enabled: !template.enabled } : template
    );
    
    onSettingsChange({
      ...settings,
      templates: updatedTemplates
    });
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate({ ...template });
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    
    const updatedTemplates = settings.templates.map(template => 
      template.status === editingTemplate.status ? editingTemplate : template
    );
    
    onSettingsChange({
      ...settings,
      templates: updatedTemplates
    });
    
    setEditingTemplate(null);
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
  };

  const handleTemplateMessageChange = (message: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({ ...editingTemplate, message });
  };

  // Function to capitalize first letter
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/20">
            <RiPhoneLine className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50">SMS Notifications</h4>
              <Switch 
                checked={settings.smsEnabled} 
                onCheckedChange={handleToggleSMS} 
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Send SMS notifications to customers about their order status
            </p>
            
            {settings.smsEnabled && (
              <div className="mt-4">
                <Label htmlFor="phone-number" className="text-xs">Store Phone Number</Label>
                <div className="flex mt-1">
                  <Select 
                    value={settings.phoneNumberId || availablePhoneNumbers[0].id} 
                    onValueChange={handlePhoneNumberChange}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="Select a phone number" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePhoneNumbers.map((phone) => (
                        <SelectItem key={phone.id} value={phone.id}>
                          {phone.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This number will be used as the sender for SMS notifications
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
      
      {settings.smsEnabled && (
        <>
          <h3 className="text-sm font-medium mt-6">Notification Templates</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Customize the messages sent to customers for each order status
          </p>
          
          {settings.templates.map((template) => {
            const status = template.status;
            const statusInfo = statusConfig[status as keyof typeof statusConfig];
            const StatusIcon = statusInfo?.icon || RiNotification3Line;
            
            return (
              <Card key={status} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${template.enabled ? 'bg-indigo-100 dark:bg-indigo-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <StatusIcon className={`h-5 w-5 ${template.enabled ? statusInfo?.color || 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {statusInfo?.label || capitalize(status)} Notification
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {template.message.length > 100 
                          ? `${template.message.substring(0, 100)}...` 
                          : template.message}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      className="h-8 text-xs"
                      onClick={() => handleEditTemplate(template)}
                    >
                      Edit
                    </Button>
                    <Switch 
                      checked={template.enabled} 
                      onCheckedChange={() => handleToggleTemplate(status)} 
                    />
                  </div>
                </div>
              </Card>
            );
          })}
          
          {editingTemplate && (
            <>
              <Divider />
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-4">
                  Edit {statusConfig[editingTemplate.status as keyof typeof statusConfig]?.label || capitalize(editingTemplate.status)} Notification
                </h4>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="template-message">Message Template</Label>
                      <div className="text-xs text-gray-500">
                        Available variables: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{'{{orderNumber}}'}</code>, <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{'{{customerName}}'}</code>
                      </div>
                    </div>
                    <Textarea 
                      id="template-message" 
                      value={editingTemplate.message} 
                      onChange={(e) => handleTemplateMessageChange(e.target.value)} 
                      rows={4}
                    />
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                    <h5 className="text-xs font-medium mb-2">Preview</h5>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {editingTemplate.message
                        .replace(/{{orderNumber}}/g, 'ORD-123')
                        .replace(/{{customerName}}/g, 'John Smith')}
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="secondary" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveTemplate}>
                      Save Template
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
} 