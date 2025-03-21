'use client'

import { useEffect, useRef, useState } from 'react'

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  hue: number
}

interface AnimatedSphereProps {
  size?: number
  gradientColors?: string[]
  particleCount?: number
  interactive?: boolean
  className?: string
}

export default function AnimatedSphere({
  size = 64,
  gradientColors = ["#2563EB", "#7E22CE", "#F97316"], // Blue, Purple, Orange
  particleCount = 40,
  interactive = true,
  className = ""
}: AnimatedSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0, active: false })
  const animationRef = useRef<number>(0)
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    let time = 0;
    let animationFrameId: number;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const outerRadius = size / 2;
      const amplitude = size / 12;

      ctx.beginPath();
      const steps = 360;
      for (let i = 0; i <= steps; i++) {
        const angle = (i * Math.PI) / 180;
        const mod = Math.sin(3 * angle + time) * amplitude;
        const r = outerRadius + mod;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      // Outer glow effect
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 20;
      
      // Create radial gradient fill matching the CodePen stops
      const innerRadius = outerRadius * 0.2;
      const grd = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
      grd.addColorStop(0, gradientColors[0] || "#2563EB");
      grd.addColorStop(0.5, gradientColors[1] || "#7E22CE");
      grd.addColorStop(1, gradientColors[2] || "#F97316");
      
      ctx.fillStyle = grd;
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [size, gradientColors]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  )
} 