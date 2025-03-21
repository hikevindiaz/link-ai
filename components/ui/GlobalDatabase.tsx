"use client"
import createGlobe from "cobe"
import { FunctionComponent, useEffect, useRef } from "react"
import { cx } from "class-variance-authority"
import {
  RiAtLine,
  RiChat1Line,
  RiMessageLine,
  RiPhoneLine,
} from "@remixicon/react"

const stats = [
  {
    id: 1,
    name: "Web Chat",
    value: "24/7",
    description: "Engage website visitors with responsive AI agents",
    icon: RiChat1Line,
  },
  {
    id: 2,
    name: "Voice",
    value: "80%",
    description: "Automate phone calls with natural-sounding AI",
    icon: RiPhoneLine,
  },
  {
    id: 3,
    name: "SMS",
    value: "10x",
    description: "Handle text conversations at scale",
    icon: RiMessageLine,
  },
  {
    id: 4,
    name: "Email",
    value: "90%",
    description: "Respond to customer inquiries automatically",
    icon: RiAtLine,
  },
]

export const GlobalDatabase: FunctionComponent = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let phi = 4.7

    const globe = createGlobe(canvasRef.current!, {
      devicePixelRatio: 2,
      width: 1200 * 2,
      height: 1200 * 2,
      phi: 0,
      theta: -0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 25000,
      mapBrightness: 13,
      mapBaseBrightness: 0.05,
      baseColor: [0.3, 0.3, 0.3],
      glowColor: [0.15, 0.15, 0.15],
      markerColor: [100, 100, 100],
      markers: [
        // { location: [37.7595, -122.4367], size: 0.03 }, // San Francisco
        // { location: [40.7128, -74.006], size: 0.03 }, // New York City
        // { location: [35.6895, 139.6917], size: 0.03 }, // Tokyo
        // { location: [28.7041, 77.1025], size: 0.03 }, // Delhi
      ],
      onRender: (state: { phi?: number }) => {
        state.phi = phi
        phi += 0.0002
      },
    })

    return () => {
      globe.destroy()
    }
  }, [])

  const features = [
    {
      name: "Global Clusters",
      description: "Enable low-latency global access, enhancing performance.",
    },
    {
      name: "Serverless Triggers",
      description: "Trigger functions automatically for dynamic app behavior.",
    },
    {
      name: "Monitoring & Alerts",
      description:
        "Monitor health with key metrics or integrate third-party tools.",
    },
  ]

  return (
    <div className="px-3">
      <section
        aria-labelledby="global-database-title"
        className="relative mx-auto mt-28 flex w-full max-w-6xl flex-col items-center justify-center overflow-hidden rounded-3xl bg-black pt-24 shadow-xl shadow-black/30 md:mt-40"
      >
        <div className="absolute top-[17rem] size-[40rem] rounded-full bg-indigo-800 blur-3xl md:top-[20rem]" />
        <div className="z-10 inline-block rounded-lg border border-indigo-400/20 bg-indigo-800/20 px-3 py-1.5 font-semibold uppercase leading-4 tracking-tight sm:text-sm">
          <span className="bg-gradient-to-b from-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            Made for the cloud
          </span>
        </div>
        <h2
          id="global-database-title"
          className="z-10 mt-6 inline-block bg-gradient-to-b from-white to-indigo-100 bg-clip-text px-2 text-center text-5xl font-bold tracking-tighter text-transparent md:text-8xl"
        >
          The global <br /> cloud database
        </h2>
        <canvas
          className="absolute top-[7.1rem] z-20 aspect-square size-full max-w-fit md:top-[12rem]"
          ref={canvasRef}
          style={{ width: 1200, height: 1200 }}
        />
        <div className="z-20 -mt-32 h-[36rem] w-full overflow-hidden md:-mt-36">
          <div className="absolute bottom-0 h-3/5 w-full bg-gradient-to-b from-transparent via-black to-black" />
          <div className="absolute inset-x-6 bottom-12 m-auto max-w-4xl md:top-2/3">
            <div className="grid grid-cols-1 gap-x-10 gap-y-6 rounded-lg border border-white/[3%] bg-white/[1%] px-6 py-6 shadow-xl backdrop-blur md:grid-cols-3 md:p-8">
              {features.map((item) => (
                <div key={item.name} className="flex flex-col gap-2">
                  <h3 className="whitespace-nowrap bg-gradient-to-b from-indigo-300 to-indigo-500 bg-clip-text text-lg font-semibold text-transparent md:text-xl">
                    {item.name}
                  </h3>
                  <p className="text-sm leading-6 text-indigo-200/40">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section
        id="global-database"
        aria-labelledby="global-database-heading"
        className="mt-40 overflow-hidden px-3 py-8 sm:py-12 lg:mt-52"
      >
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
            <p className="text-base font-medium leading-7 text-indigo-600 dark:text-indigo-400">
              LinkReps
            </p>
            <h2
              id="global-database-heading"
              className="mt-2 text-4xl font-bold tracking-tighter text-gray-900 sm:text-5xl dark:text-gray-50"
            >
              AI agents across all channels
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
              Link AI creates seamless conversational experiences that integrate
              with your existing systems, reducing costs and increasing
              productivity.
            </p>
          </div>
          <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-10 text-gray-900 sm:mt-20 sm:grid-cols-2 sm:gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-4 dark:text-gray-50">
            {stats.map((stat) => (
              <div
                key={stat.id}
                className={cx(
                  "relative rounded-lg p-6 shadow-lg ring-1 ring-black/5 dark:ring-white/5",
                  stat.id === 1 && "from-indigo-500",
                  stat.id === 2 && "from-indigo-500",
                  stat.id === 3 && "from-sky-500",
                  stat.id === 4 && "from-teal-500",
                  "before:absolute before:bottom-0 before:left-0 before:h-1 before:w-full before:rounded-bl-lg before:rounded-br-lg before:bg-gradient-to-r before:from-current before:to-transparent",
                )}
              >
                <dt className="flex items-center gap-2 truncate text-sm font-medium leading-6 text-gray-600 dark:text-gray-400">
                  <stat.icon
                    aria-hidden="true"
                    className="size-6 flex-none text-indigo-600 dark:text-indigo-400"
                  />
                  {stat.name}
                </dt>
                <div className="text-balance mt-4">
                  <dd className="flex items-baseline gap-1">
                    <p className="text-2xl font-semibold tracking-tight">
                      {stat.value}
                    </p>
                  </dd>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {stat.description}
                  </p>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}
