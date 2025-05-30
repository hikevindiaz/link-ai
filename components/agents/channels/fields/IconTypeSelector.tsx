import { FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { RadioCardGroup, RadioCardItem } from "@/components/ui/radio-group";

interface IconTypeSelectorProps {
  iconType: 'orb' | 'logo';
  handleIconTypeChange: (type: 'orb' | 'logo') => void;
}

export const IconTypeSelector = ({ 
  iconType, 
  handleIconTypeChange 
}: IconTypeSelectorProps) => (
  <div className="space-y-2">
    <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-50">
      Button Icon Type
    </FormLabel>
    <RadioCardGroup 
      value={iconType} 
      onValueChange={(value) => handleIconTypeChange(value as 'orb' | 'logo')}
      className="grid grid-cols-2 gap-4"
    >
      <FormItem className="flex-1">
        <RadioCardItem value="orb" id="orbType">
          <FormLabel htmlFor="orbType" className="font-medium cursor-pointer">Use Voice Orb</FormLabel>
          <FormDescription className="text-xs">Animated orb for voice interaction.</FormDescription>
        </RadioCardItem>
      </FormItem>
      <FormItem className="flex-1">
        <RadioCardItem value="logo" id="logoType">
          <FormLabel htmlFor="logoType" className="font-medium cursor-pointer">Use Logo Image</FormLabel>
          <FormDescription className="text-xs">Upload your custom logo.</FormDescription>
        </RadioCardItem>
      </FormItem>
    </RadioCardGroup>
  </div>
); 