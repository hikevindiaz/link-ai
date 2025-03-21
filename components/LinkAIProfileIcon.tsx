import React from "react";
import Image from "next/image";

// Define interface for component props
interface LinkAIProfileIconProps {
  size?: number;
}

// Update component to accept size prop with default value
const LinkAIProfileIcon: React.FC<LinkAIProfileIconProps> = ({ size = 32 }) => {
  return (
    <div 
      className="relative rounded-full overflow-hidden shadow-lg" 
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {/* Moving gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#392dd5] via-[#000001] to-[#fc422c] bg-[length:200%_150%] animate-profileGradient" />
      
      {/* Link AI Logo on top */}
      <Image
        src="/LINK AI ICON LIGHT.png"  // Updated to use an existing file
        alt="Link AI Logo"
        fill // Use fill instead of layout="fill"
        className="p-2 object-contain" // Use CSS for object fitting
      />
    </div>
  );
};

export default LinkAIProfileIcon;