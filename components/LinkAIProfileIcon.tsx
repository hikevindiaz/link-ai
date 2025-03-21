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
      
      {/* Link AI Logo on top - using regular img tag for better mobile compatibility */}
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src="/LINK AI ICON LIGHT.png"
          alt="Link AI Logo"
          className="p-1 w-3/4 h-3/4 object-contain z-10"
        />
      </div>
    </div>
  );
};

export default LinkAIProfileIcon;