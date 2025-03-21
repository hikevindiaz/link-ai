import React from "react";

interface GradientAgentSphereProps {
  size?: number;
  gradientColors?: string[];
  className?: string;
}

const GradientAgentSphere: React.FC<GradientAgentSphereProps> = ({ 
  size = 36, 
  gradientColors = ["#022597", "#000001", "#1a56db"],
  className = ""
}) => {
  // Calculate size in pixels
  const sizeInPx = `${size}px`;
  
  return (
    <div 
      className={`relative rounded-full overflow-hidden shadow-lg ${className}`}
      style={{ width: sizeInPx, height: sizeInPx }}
    >
      {/* Moving gradient background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br bg-[length:200%_200%] animate-profileGradient" 
        style={{ 
          backgroundImage: `linear-gradient(to bottom right, ${gradientColors.join(', ')})` 
        }}
      />
    </div>
  );
};

export default GradientAgentSphere;