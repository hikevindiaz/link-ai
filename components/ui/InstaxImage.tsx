"use client"
import { cn } from "@/lib/utils"
import Image from "next/image"

export function InstaxImage({
  className,
  src,
  width,
  height,
  alt,
  caption,
}: {
  className?: string
  src: string
  width: number
  height: number
  alt: string
  caption: string
}) {
  return (
    <figure
      className={cn(
        "h-fit overflow-hidden rounded-lg bg-white shadow-xl shadow-black/10 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-black/20 dark:bg-neutral-900 dark:shadow-neutral-500/5 dark:ring-white/20 dark:hover:shadow-neutral-900/20",
        className,
      )}
    >
      <div className="bg-neutral-50 p-2 dark:bg-neutral-900">
        <div className="relative overflow-hidden rounded">
          <div className="absolute inset-0 shadow-[inset_0px_0px_3px_0px_rgb(0,0,0,1)]"></div>
          <Image src={src} alt={alt} width={width} height={height} />
        </div>
      </div>
      <div
        className={cn(
          "px-2 pb-2 pt-2 font-handwriting text-xl text-neutral-700 dark:text-neutral-300",
        )}
      >
        <figcaption className="text-center">{caption}</figcaption>
      </div>
    </figure>
  )
}
