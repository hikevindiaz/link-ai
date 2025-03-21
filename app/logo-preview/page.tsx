'use client'

import { useState } from 'react'
import PulsingLogo from '@/components/PulsingLogo'
import AnimatedSphere from '@/components/AnimatedSphere'

export default function LogoPreviewPage() {
  const [selectedColorScheme, setSelectedColorScheme] = useState<string>('default')
  
  const colorSchemes = {
    default: ["#2563EB", "#7E22CE", "#F97316"], // Blue, Purple, Orange
    ocean: ["#0EA5E9", "#0891B2", "#0C4A6E"], // Blues
    sunset: ["#F97316", "#DC2626", "#7E22CE"], // Orange, Red, Purple
    forest: ["#16A34A", "#65A30D", "#0D9488"], // Greens, Teal
    monochrome: ["#94A3B8", "#64748B", "#334155"], // Grays
  }
  
  const sizes = [24, 36, 48, 64, 96]
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Animated Logo Preview</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Color Schemes</h2>
          <div className="flex flex-wrap gap-4 mb-6">
            {Object.entries(colorSchemes).map(([name, colors]) => (
              <button
                key={name}
                onClick={() => setSelectedColorScheme(name)}
                className={`px-4 py-2 rounded-md transition-all ${
                  selectedColorScheme === name 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex items-center justify-center gap-8 mb-8">
            <PulsingLogo 
              size={96} 
              gradientColors={colorSchemes[selectedColorScheme as keyof typeof colorSchemes]} 
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Size Comparison</h2>
          <div className="flex flex-wrap items-end justify-center gap-8">
            {sizes.map(size => (
              <div key={size} className="flex flex-col items-center">
                <PulsingLogo 
                  size={size} 
                  gradientColors={colorSchemes[selectedColorScheme as keyof typeof colorSchemes]} 
                />
                <span className="mt-2 text-sm text-gray-500">{size}px</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Button Preview</h2>
          <div className="flex justify-center">
            <div 
              className="animate-border rounded-2xl p-[1px] relative cursor-pointer"
              style={{ 
                background: `conic-gradient(from var(--border-angle), ${colorSchemes[selectedColorScheme as keyof typeof colorSchemes].join(', ')})`,
                maxWidth: '280px'
              }}
            >
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-[14px]">
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                  <PulsingLogo 
                    size={36} 
                    gradientColors={colorSchemes[selectedColorScheme as keyof typeof colorSchemes]} 
                  />
                </div>
                
                <div className="flex flex-col -space-y-1">
                  <span className="text-[10px] font-normal opacity-70">Link AI Smart Agent</span>
                  <div className="flex items-center">
                    <span className="text-lg font-bold">Hi, let's talk</span>
                    <span className="ml-1 text-lg" role="img" aria-label="wave">👋</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Animated Sphere Preview</h2>
          <div className="flex justify-center">
            <AnimatedSphere 
              size={120} 
              gradientColors={colorSchemes[selectedColorScheme as keyof typeof colorSchemes]} 
              particleCount={50} 
              interactive={true}
            />
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @property --border-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        
        @keyframes border {
          to {
            --border-angle: 360deg;
          }
        }
        
        .animate-border {
          animation: border 4s linear infinite;
        }
      `}</style>
    </div>
  )
} 