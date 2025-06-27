import React from "react"
import { Badge } from "../Badge"

const stats = [
  {
    name: "Bandwith increase",
    value: "+162%",
  },
  {
    name: "Better storage efficiency",
    value: "2-3x",
  },
  {
    name: "Rows ingested / second",
    value: "Up to 9M",
  },
]

export default function Features() {
  return (
    <section
      aria-labelledby="features-title"
      className="mx-auto mt-44 w-full max-w-6xl px-3"
    >
      <Badge>Security at Scale</Badge>
      <h2
        id="features-title"
        className="mt-2 inline-block bg-gradient-to-br from-neutral-900 to-neutral-800 bg-clip-text py-2 text-4xl font-bold tracking-tighter text-transparent sm:text-6xl md:text-6xl dark:from-neutral-50 dark:to-neutral-300"
      >
        Architected for speed and reliability
      </h2>
      <p className="mt-6 max-w-3xl text-lg leading-7 text-neutral-600 dark:text-neutral-400">
        Database&rsquo; innovative architecture avoids the central bottlenecks
        of traditional systems, enhancing system reliability. This design
        ensures high productivity and security, minimizing the risk of service
        disruptions and outages.
      </p>
      <dl className="mt-12 grid grid-cols-1 gap-y-8 md:grid-cols-3 md:border-y md:border-neutral-200 md:py-14 dark:border-neutral-800">
        {stats.map((stat, index) => (
          <React.Fragment key={index}>
            <div className="border-l-2 border-neutral-100 pl-6 md:border-l md:text-center lg:border-neutral-200 lg:first:border-none dark:border-neutral-900 lg:dark:border-neutral-800">
              <dd className="inline-block bg-gradient-to-t from-neutral-900 to-neutral-600 bg-clip-text text-5xl font-bold tracking-tight text-transparent lg:text-6xl dark:from-neutral-700 dark:to-neutral-400">
                {stat.value}
              </dd>
              <dt className="mt-1 text-neutral-600 dark:text-neutral-400">
                {stat.name}
              </dt>
            </div>
          </React.Fragment>
        ))}
      </dl>
    </section>
  )
}
