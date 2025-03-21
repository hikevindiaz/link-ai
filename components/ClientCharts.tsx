"use client";

import dynamic from "next/dynamic";
import React, { useState } from "react";
import { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function ClientCharts({ chartData }: { chartData: any[] }) {
  const [selectedPeriod, setSelectedPeriod] = useState("Last 7 days");

  const options: ApexOptions = {
    chart: {
      height: "100%",
      type: "area",
      fontFamily: "Inter, sans-serif",
      dropShadow: {
        enabled: false,
      },
      toolbar: {
        show: false,
      },
    },
    tooltip: {
      enabled: true,
      x: {
        show: false,
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
        gradientToColors: ["#1C64F2"],
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 6,
      curve: "smooth",
    },
    grid: {
      show: false,
    },
    series: [
      {
        name: "Messages",
        data: chartData.map((d) => d.total),
        color: "#1A56DB",
      },
    ],
    xaxis: {
      categories: chartData.map((d) => d.date),
      labels: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      show: false,
    },
  };

  const periods = ["Last 7 days", "Last 30 days", "Last 90 days"];

  return (
    <div className="relative p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Total Messages</h3>
          <p className="text-sm text-gray-500">{selectedPeriod}</p>
        </div>
        <select
          className="text-sm text-blue-500"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          {periods.map((period) => (
            <option key={period} value={period}>
              {period}
            </option>
          ))}
        </select>
      </div>
      <div className="relative h-64">
        <Chart options={options} series={options.series} type="area" height="100%" />
      </div>
    </div>
  );
}
