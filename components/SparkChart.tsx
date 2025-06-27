"use client"

import React from "react"
import {
  Area,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { cn } from "@/lib/utils"

export interface TooltipProps {
  active: boolean | undefined
  payload: any[]
  label: string
}

interface SparkAreaChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Record<string, any>[]
  index: string
  categories: string[]
  colors?: string[]
  fill?: "gradient" | "solid"
  showTooltip?: boolean
  customTooltip?: React.ComponentType<TooltipProps>
}

const colorMap = {
  emerald: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#8b5cf6",
  pink: "#ec4899",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  gray: "#6b7280",
}

export const SparkAreaChart = React.forwardRef<HTMLDivElement, SparkAreaChartProps>(
  ({ 
    data, 
    index, 
    categories, 
    colors = ["blue"], 
    fill = "solid", 
    showTooltip = false,
    customTooltip: CustomTooltip,
    className, 
    ...props 
  }, ref) => {
    const getColor = (colorName: string) => {
      return colorMap[colorName as keyof typeof colorMap] || colorMap.blue
    }

    return (
      <div ref={ref} className={cn("h-10 w-20", className)} {...props}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart data={data}>
            {showTooltip && (
              <Tooltip
                wrapperStyle={{ outline: "none" }}
                isAnimationActive={true}
                animationDuration={100}
                cursor={{ stroke: "#d1d5db", strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  return showTooltip && active ? (
                    CustomTooltip ? (
                      <CustomTooltip
                        active={active}
                        payload={payload}
                        label={label}
                      />
                    ) : null
                  ) : null
                }}
              />
            )}
            {categories.map((category, index) => (
              <Area
                key={category}
                type="monotone"
                dataKey={category}
                stroke={getColor(colors[index] || colors[0])}
                fill={fill === "gradient" ? `url(#gradient-${category})` : getColor(colors[index] || colors[0])}
                fillOpacity={fill === "solid" ? 0.3 : 0.1}
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
              />
            ))}
            {fill === "gradient" && (
              <defs>
                {categories.map((category, index) => (
                  <linearGradient key={category} id={`gradient-${category}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={getColor(colors[index] || colors[0])} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={getColor(colors[index] || colors[0])} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
            )}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    )
  }
)

SparkAreaChart.displayName = "SparkAreaChart" 