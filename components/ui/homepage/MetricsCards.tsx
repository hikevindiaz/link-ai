type Category = "red" | "orange" | "emerald" | "neutral"
type Metric = {
  label: string
  value: number
  percentage: string
  fraction: string
}

const getCategory = (value: number): Category => {
  if (value < 0.3) return "red"
  if (value < 0.7) return "orange"
  return "emerald"
}

const categoryConfig = {
  red: {
    activeClass: "bg-red-500 dark:bg-red-500",
    bars: 1,
  },
  orange: {
    activeClass: "bg-orange-500 dark:bg-orange-500",
    bars: 2,
  },
  emerald: {
    activeClass: "bg-emerald-500 dark:bg-emerald-500",
    bars: 3,
  },
  neutral: {
    activeClass: "bg-neutral-300 dark:bg-neutral-800",
    bars: 0,
  },
} as const

function Indicator({ number }: { number: number }) {
  const category = getCategory(number)
  const config = categoryConfig[category]
  const inactiveClass = "bg-neutral-300 dark:bg-neutral-800"

  return (
    <div className="flex gap-0.5">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`h-3.5 w-1 rounded-sm ${
            index < config.bars ? config.activeClass : inactiveClass
          }`}
        />
      ))}
    </div>
  )
}

const metrics: Metric[] = [
  {
    label: "Lead-to-Quote Ratio",
    value: 0.61,
    percentage: "59.8%",
    fraction: "450/752",
  },
  {
    label: "Project Load",
    value: 0.24,
    percentage: "12.9%",
    fraction: "129/1K",
  },
  {
    label: "Win Probability",
    value: 0.8,
    percentage: "85.1%",
    fraction: "280/329",
  },
]

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <div>
      <dt className="text-sm text-neutral-500 dark:text-neutral-500">
        {metric.label}
      </dt>
      <dd className="mt-1.5 flex items-center gap-2">
        <Indicator number={metric.value} />
        <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {metric.percentage}{" "}
          <span className="font-medium text-neutral-400 dark:text-neutral-600">
            - {metric.fraction}
          </span>
        </p>
      </dd>
    </div>
  )
}

export function MetricsCards() {
  return (
    <>
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        Overview
      </h1>
      <dl className="mt-6 flex flex-wrap items-center gap-x-12 gap-y-8">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </dl>
    </>
  )
}
