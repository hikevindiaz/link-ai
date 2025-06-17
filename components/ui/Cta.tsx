"use client"

import { cx } from "class-variance-authority"
import Link from "next/link"
import { RiCheckLine } from "@remixicon/react"
import { Button } from "../Button"

const plans = [
  {
    name: "Essentials",
    description: "Perfect for small businesses getting started with AI customer service",
    price: "69",
    mostPopular: false,
    features: [
      "AI chatbot for your website",
      "Up to 1,000 conversations/month",
      "Business hours coverage",
      "Basic integrations",
      "Email support"
    ],
  },
  {
    name: "Growth",
    description: "For growing businesses ready to scale their AI customer experience",
    price: "249",
    mostPopular: true,
    features: [
      "Everything in Essentials, plus:",
      "Up to 10,000 conversations/month",
      "24/7 coverage",
      "Voice & SMS capabilities",
      "Advanced integrations",
      "Priority support"
    ],
  },
  {
    name: "Scale",
    description: "For businesses with complex needs and high conversation volume",
    price: "599",
    mostPopular: false,
    features: [
      "Everything in Growth, plus:",
      "Unlimited conversations",
      "Custom AI training",
      "Dedicated account manager",
      "Enterprise integrations",
      "Phone support"
    ],
  },
]

export default function Cta() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="mx-auto mt-28 max-w-6xl px-4 sm:mt-32 sm:px-6 lg:px-8"
    >
      <div className="sm:text-center">
        <h2
          id="pricing-title"
          className="text-4xl font-bold tracking-tighter text-gray-900 sm:text-center sm:text-5xl dark:text-gray-50"
        >
          Simple, transparent pricing
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-gray-600 sm:text-center dark:text-gray-400">
          Choose the plan that works best for your business. All plans include a 14-day free trial.
        </p>
      </div>
      <div className="mx-auto mt-16 max-w-2xl lg:max-w-none">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cx(
                "relative p-8 shadow-md ring-1",
                plan.mostPopular
                  ? "scale-105 shadow-xl ring-neutral-500/30 dark:ring-neutral-400/30"
                  : "ring-gray-200 dark:ring-gray-800",
                "flex flex-col rounded-3xl",
              )}
            >
              {plan.mostPopular && (
                <div className="absolute -top-4 left-0 right-0 mx-auto w-fit rounded-full bg-neutral-500 px-3 py-0.5 text-center text-sm font-semibold text-white dark:bg-neutral-600">
                  Most popular
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50">
                  {plan.name}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                  {plan.description}
                </p>
                <div className="mt-4 flex items-baseline font-bold">
                  <span className="text-4xl">${plan.price}</span>
                  <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">
                    /month
                  </span>
                </div>
              </div>
              <div className="mb-6 flex-grow">
                <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <RiCheckLine
                        className="mr-2 mt-0.5 size-4 shrink-0 text-neutral-600 dark:text-neutral-400"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                variant={plan.mostPopular ? "primary" : "light"}
                asChild
                className={cx(
                  "mt-auto w-full",
                  plan.mostPopular
                    ? "bg-neutral-600 text-white hover:bg-neutral-700 dark:bg-neutral-500 dark:hover:bg-neutral-600"
                    : "text-neutral-700 dark:text-neutral-400",
                )}
              >
                <Link href="#">
                  {plan.mostPopular ? "Start free trial" : "Learn more"}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
