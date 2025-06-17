"use client"

import { RiBubbleChartLine, RiPieChartLine, RiLineChartLine, RiShoppingCart2Line } from "@remixicon/react"

const features = [
  {
    name: "Customer Support",
    description:
      "Link AI agents handle common customer inquiries, troubleshooting, and support requests with human-like understanding.",
    icon: RiBubbleChartLine,
  },
  {
    name: "Lead Generation",
    description:
      "Engage with website visitors 24/7, qualify leads, and schedule appointments seamlessly with your sales team.",
    icon: RiPieChartLine,
  },
  {
    name: "Order Processing",
    description:
      "Automate order taking, product recommendations, and checkout processes with conversational AI.",
    icon: RiShoppingCart2Line,
  },
  {
    name: "Appointment Booking",
    description:
      "Enable customers to book, reschedule, or cancel appointments through natural conversation.",
    icon: RiLineChartLine,
  },
]

export default function Features() {
  return (
    <section
      aria-labelledby="features-heading"
      className="mx-auto mt-28 w-full max-w-6xl px-3"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-1 lg:mx-0 lg:max-w-none lg:grid-cols-3">
        <div className="lg:pr-8">
          <div className="lg:max-w-lg">
            <h2
              id="features-heading"
              className="text-4xl font-bold tracking-tighter text-gray-900 sm:text-5xl dark:text-gray-50"
            >
              Endless possibilities
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
              Link AI agents can be customized for various business use cases, providing consistent quality across all customer interactions.
            </p>
          </div>
        </div>
        <div className="lg:col-span-2">
          <dl className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:mt-0 lg:pt-2">
            {features.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-gray-50">
                  <feature.icon
                    className="size-5 flex-none text-neutral-600 dark:text-neutral-400"
                    aria-hidden="true"
                  />
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-400">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
