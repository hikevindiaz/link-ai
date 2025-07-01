"use client"

import { RiPlayCircleFill } from "@remixicon/react"
import Link from "next/link"
import { Button } from "../Button"
import HeroImage from "./HeroImage"

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="mt-32 flex flex-col items-center justify-center text-center sm:mt-40"
    >
      <h1
        id="hero-title"
        className="inline-block animate-slide-up-fade bg-gradient-to-br from-neutral-900 to-neutral-800 bg-clip-text p-2 text-4xl font-bold tracking-tighter text-transparent sm:text-6xl md:text-7xl dark:from-neutral-50 dark:to-neutral-300"
        style={{ animationDuration: "700ms" }}
      >
        AI agents that do <br />real work for you
      </h1>
      <p
        className="mt-6 max-w-lg animate-slide-up-fade text-lg text-neutral-700 dark:text-neutral-400"
        style={{ animationDuration: "900ms" }}
      >
        Link AI powers intelligent conversations across web chat, voice, and SMS
        to handle 80% of your customer inquiries automatically.
      </p>
      <div
        className="mt-8 flex w-full animate-slide-up-fade flex-col justify-center gap-3 px-3 sm:flex-row"
        style={{ animationDuration: "1100ms" }}
      >
        <Button className="h-10 font-semibold">
          <Link href="#">Get started for free</Link>
        </Button>
        <Button
          asChild
          variant="light"
          className="group gap-x-2 bg-transparent font-semibold hover:bg-transparent dark:bg-transparent hover:dark:bg-transparent"
        >
          <Link
            href="#"
            className="ring-1 ring-neutral-200 sm:ring-0 dark:ring-neutral-900"
            target="_blank"
          >
            <span className="mr-1 flex size-6 items-center justify-center rounded-full bg-neutral-50 transition-all group-hover:bg-neutral-200 dark:bg-neutral-800 dark:group-hover:bg-neutral-700">
              <RiPlayCircleFill
                aria-hidden="true"
                className="size-5 shrink-0 text-neutral-900 dark:text-neutral-50"
              />
            </span>
            Watch demo
          </Link>
        </Button>
      </div>
      <div
        className="relative mx-auto ml-3 mt-20 h-fit w-[40rem] max-w-6xl animate-slide-up-fade sm:ml-auto sm:w-full sm:px-2"
        style={{ animationDuration: "1400ms" }}
      >
        <HeroImage />
        <div
          className="absolute inset-x-0 -bottom-20 -mx-10 h-2/4 bg-gradient-to-t from-white via-white to-transparent lg:h-1/4 dark:from-neutral-950 dark:via-neutral-950"
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
