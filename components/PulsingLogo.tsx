'use client'

import { useEffect, useRef } from 'react';

interface PulsingLogoProps {
  size?: number;
  gradientColors?: string[];
}

export default function PulsingLogo({ 
  size = 36, 
  gradientColors = ["#2563EB", "#7E22CE", "#F97316"] 
}: PulsingLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    
    // Set canvas CSS size
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    
    let animationFrameId: number;
    let gradientAngle = 0;
    
    // Create a circular mask for the gradient
    const createCircularMask = () => {
      // Create a circular clipping path
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
    };
    
    // Create and animate the Stripe-like gradient
    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, size, size);
      
      // Save context state before applying clip
      ctx.save();
      createCircularMask();
      
      // Calculate gradient positions based on angle
      const x1 = size / 2 + Math.cos(gradientAngle) * size;
      const y1 = size / 2 + Math.sin(gradientAngle) * size;
      const x2 = size / 2 + Math.cos(gradientAngle + Math.PI) * size;
      const y2 = size / 2 + Math.sin(gradientAngle + Math.PI) * size;
      
      // Create gradient
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      
      // Add color stops with extended color array for smoother transitions
      const extendedColors = [...gradientColors, ...gradientColors];
      const totalColors = extendedColors.length;
      
      extendedColors.forEach((color, index) => {
        const offset = (index / (totalColors - 1)) % 1;
        gradient.addColorStop(offset, color);
      });
      
      // Fill background with gradient
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      // Add subtle pulsing waves for extra effect
      const waveCount = 3;
      const time = Date.now() / 2000; // Slow down the animation
      
      for (let i = 0; i < waveCount; i++) {
        const phase = (time + i / waveCount) % 1;
        const radius = phase * (size / 2);
        const opacity = 0.1 * (1 - phase);
        
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();
      }
      
      // Restore context state (removes clipping)
      ctx.restore();
      
      // Draw border to ensure clean edges
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Update gradient angle for next frame (slow rotation)
      gradientAngle += 0.005;
      
      animationFrameId = window.requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [size, gradientColors]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="rounded-full"
      style={{ width: size, height: size }}
    />
  );
} 