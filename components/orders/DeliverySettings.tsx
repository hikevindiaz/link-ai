import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/Button";
import { Divider } from "@/components/Divider";
import { RiTruckLine, RiStore3Line, RiInformationLine } from "@remixicon/react";

export interface DeliveryMethod {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ComponentType<any>;
  fee?: number;
  minOrderAmount?: number;
  estimatedTime?: string;
}

interface DeliverySettingsProps {
  deliveryMethods: DeliveryMethod[];
  onDeliveryMethodsChange: (methods: DeliveryMethod[]) => void;
}

export function DeliverySettings({ 
  deliveryMethods, 
  onDeliveryMethodsChange 
}: DeliverySettingsProps) {
  const [editingMethod, setEditingMethod] = useState<DeliveryMethod | null>(null);

  const handleToggleMethod = (id: string) => {
    // Only allow toggling the pickup method, not delivery
    if (id === "pickup") {
      const updatedMethods = deliveryMethods.map(method => 
        method.id === id ? { ...method, enabled: !method.enabled } : method
      );
      onDeliveryMethodsChange(updatedMethods);
    }
  };

  const handleEditMethod = (method: DeliveryMethod) => {
    // Only allow editing the pickup method
    if (method.id === "pickup") {
      setEditingMethod({ ...method });
    }
  };

  const handleSaveMethod = () => {
    if (!editingMethod) return;
    
    const updatedMethods = deliveryMethods.map(method => 
      method.id === editingMethod.id ? editingMethod : method
    );
    onDeliveryMethodsChange(updatedMethods);
    setEditingMethod(null);
  };

  const handleCancelEdit = () => {
    setEditingMethod(null);
  };

  const handleInputChange = (field: keyof DeliveryMethod, value: any) => {
    if (!editingMethod) return;
    setEditingMethod({ ...editingMethod, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Delivery Methods</h3>
      </div>
      
      <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-start space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
            <RiInformationLine className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">Delivery Currently Disabled</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Local delivery is currently disabled. Only in-store pickup is available at this time.
            </p>
          </div>
        </div>
      </Card>
      
      {deliveryMethods.map((method) => {
        const MethodIcon = method.icon;
        const isDelivery = method.id === "delivery";
        
        return (
          <Card key={method.id} className={`p-4 ${isDelivery ? 'opacity-70' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${method.enabled ? 'bg-indigo-100 dark:bg-indigo-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <MethodIcon className={`h-5 w-5 ${method.enabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50">{method.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{method.description}</p>
                  
                  {method.fee !== undefined && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Delivery Fee: ${method.fee.toFixed(2)}
                    </p>
                  )}
                  
                  {method.minOrderAmount !== undefined && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Minimum Order: ${method.minOrderAmount.toFixed(2)}
                    </p>
                  )}
                  
                  {method.estimatedTime && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Estimated Time: {method.estimatedTime}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {!isDelivery && (
                  <Button 
                    variant="ghost" 
                    className="h-8 text-xs"
                    onClick={() => handleEditMethod(method)}
                  >
                    Edit
                  </Button>
                )}
                <Switch 
                  checked={method.enabled} 
                  onCheckedChange={() => handleToggleMethod(method.id)} 
                  disabled={isDelivery}
                />
              </div>
            </div>
          </Card>
        );
      })}
      
      {editingMethod && (
        <>
          <Divider />
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-4">Edit {editingMethod.name}</h4>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="method-name">Method Name</Label>
                  <Input 
                    id="method-name" 
                    value={editingMethod.name} 
                    onChange={(e) => handleInputChange('name', e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="method-description">Description</Label>
                <Input 
                  id="method-description" 
                  value={editingMethod.description} 
                  onChange={(e) => handleInputChange('description', e.target.value)} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="method-time">Estimated Time</Label>
                <Input 
                  id="method-time" 
                  value={editingMethod.estimatedTime || ''} 
                  onChange={(e) => handleInputChange('estimatedTime', e.target.value)} 
                  placeholder="e.g. 15-30 minutes" 
                />
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="secondary" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveMethod}>
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
} 