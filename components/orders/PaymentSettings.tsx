import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/Button";
import { Divider } from "@/components/Divider";
import { 
  RiWalletLine, 
  RiVisaLine, 
  RiMastercardLine, 
  RiPaypalLine,
  RiMoneyDollarCircleLine,
  RiAddLine
} from "@remixicon/react";

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ComponentType<any>;
  instructions?: string;
  isDefault?: boolean;
  order?: number;
}

interface PaymentSettingsProps {
  paymentMethods: PaymentMethod[];
  onPaymentMethodsChange: (methods: PaymentMethod[]) => void;
}

export function PaymentSettings({ 
  paymentMethods, 
  onPaymentMethodsChange 
}: PaymentSettingsProps) {
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const sortedPaymentMethods = [...paymentMethods].sort((a, b) => {
    if (a.id === "cash") return -1;
    if (b.id === "cash") return 1;
    
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    
    return 0;
  });

  const handleToggleMethod = (id: string) => {
    const updatedMethods = paymentMethods.map(method => 
      method.id === id ? { ...method, enabled: !method.enabled } : method
    );
    onPaymentMethodsChange(updatedMethods);
  };

  const handleSetDefault = (id: string) => {
    const updatedMethods = paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === id
    }));
    onPaymentMethodsChange(updatedMethods);
  };

  const handleEditMethod = (method: PaymentMethod) => {
    setEditingMethod({ ...method });
    setIsAddingNew(false);
  };

  const handleAddNewMethod = () => {
    const newMethod: PaymentMethod = {
      id: `payment-${Date.now()}`,
      name: "New Payment Method",
      description: "Description of the payment method",
      enabled: true,
      icon: RiWalletLine,
      instructions: "",
      isDefault: false
    };
    setEditingMethod(newMethod);
    setIsAddingNew(true);
  };

  const handleSaveMethod = () => {
    if (!editingMethod) return;
    
    let updatedMethods;
    if (isAddingNew) {
      updatedMethods = [...paymentMethods, editingMethod];
    } else {
      updatedMethods = paymentMethods.map(method => 
        method.id === editingMethod.id ? editingMethod : method
      );
    }
    
    onPaymentMethodsChange(updatedMethods);
    setEditingMethod(null);
    setIsAddingNew(false);
  };

  const handleDeleteMethod = (id: string) => {
    const updatedMethods = paymentMethods.filter(method => method.id !== id);
    onPaymentMethodsChange(updatedMethods);
    
    if (editingMethod?.id === id) {
      setEditingMethod(null);
      setIsAddingNew(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMethod(null);
    setIsAddingNew(false);
  };

  const handleInputChange = (field: keyof PaymentMethod, value: any) => {
    if (!editingMethod) return;
    setEditingMethod({ ...editingMethod, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Payment Methods</h3>
        <Button 
          variant="secondary" 
          className="h-8 text-xs"
          onClick={handleAddNewMethod}
        >
          <RiAddLine className="mr-1 h-3.5 w-3.5" />
          Add Method
        </Button>
      </div>
      
      {sortedPaymentMethods.map((method) => {
        const MethodIcon = method.icon;
        return (
          <Card key={method.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${method.enabled ? 'bg-neutral-100 dark:bg-neutral-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <MethodIcon className={`h-5 w-5 ${method.enabled ? 'text-neutral-600 dark:text-neutral-400' : 'text-gray-500 dark:text-gray-400'}`} />
                </div>
                <div>
                  <div className="flex items-center">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50">{method.name}</h4>
                    {method.isDefault && (
                      <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{method.description}</p>
                  
                  {method.instructions && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Instructions: {method.instructions.length > 50 
                        ? `${method.instructions.substring(0, 50)}...` 
                        : method.instructions}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {!method.isDefault && method.enabled && (
                  <Button 
                    variant="ghost" 
                    className="h-8 text-xs"
                    onClick={() => handleSetDefault(method.id)}
                  >
                    Set Default
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  className="h-8 text-xs"
                  onClick={() => handleEditMethod(method)}
                >
                  Edit
                </Button>
                {!method.isDefault && (
                  <Button 
                    variant="ghost" 
                    className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => handleDeleteMethod(method.id)}
                  >
                    Delete
                  </Button>
                )}
                <Switch 
                  checked={method.enabled} 
                  onCheckedChange={() => handleToggleMethod(method.id)} 
                  disabled={method.isDefault}
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
            <h4 className="text-sm font-medium mb-4">
              {isAddingNew ? "Add New Payment Method" : `Edit ${editingMethod.name}`}
            </h4>
            
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
                <Label htmlFor="method-instructions">Payment Instructions</Label>
                <Textarea 
                  id="method-instructions" 
                  value={editingMethod.instructions || ''} 
                  onChange={(e) => handleInputChange('instructions', e.target.value)} 
                  placeholder="Provide instructions for customers on how to use this payment method"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="method-default"
                  checked={editingMethod.isDefault || false} 
                  onCheckedChange={(checked) => handleInputChange('isDefault', checked)} 
                />
                <Label htmlFor="method-default">Set as default payment method</Label>
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="secondary" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveMethod}>
                  {isAddingNew ? "Add Method" : "Save Changes"}
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
} 