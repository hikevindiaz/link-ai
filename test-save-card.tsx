"use client";

import { useState } from 'react';
import { SettingsTabWrapper } from '@/components/agents/settings-tab-wrapper';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function TestSaveCard() {
  const [value, setValue] = useState('');
  const [originalValue] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setIsDirty(e.target.value !== originalValue);
  };
  
  const handleSave = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Settings saved successfully');
    
    // Mark as not dirty after save
    setIsDirty(false);
    return Promise.resolve();
  };
  
  const handleCancel = () => {
    setValue(originalValue);
    setIsDirty(false);
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Test Floating Save Card</h1>
      
      <SettingsTabWrapper
        tabName="Test"
        isDirty={isDirty}
        onSave={handleSave}
        onCancel={handleCancel}
      >
        <Card className="p-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-input">Test Input</Label>
              <p className="text-sm text-neutral-500 mb-2">
                Change this value to see the save card appear
              </p>
              <Input 
                id="test-input"
                value={value}
                onChange={handleChange}
                placeholder="Type something..."
              />
            </div>
            
            <div className="pt-4">
              <Button
                onClick={() => setIsDirty(!isDirty)}
                variant="secondary"
                size="sm"
              >
                Toggle isDirty (for testing)
              </Button>
            </div>
          </div>
        </Card>
      </SettingsTabWrapper>
    </div>
  );
} 