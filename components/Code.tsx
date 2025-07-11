import { cn } from "@/lib/utils"
import type { BundledLanguage, BundledTheme } from "shiki"
import { codeToHtml } from "shiki"
import CopyToClipboard from "./CopyToClipboard"

type Props = {
  code: string
  lang?: BundledLanguage
  theme?: BundledTheme
  filename?: string
  copy?: boolean
  className?: string
}

export default async function Code({
  code,
  lang = "typescript",
  copy = false,
  // tokyo-night
  // catppuccin-macchiato
  // min-dark
  // poimandres
  theme = "poimandres",
  className,
}: Props) {
  const html = await codeToHtml(code, {
    lang,
    theme,
  })

  return (
    <div
      className={cn(
        "relative w-full overflow-auto rounded-xl bg-neutral-950 shadow-xl shadow-black/40 ring-1 ring-black dark:shadow-neutral-900/30 dark:ring-white/5",
        className,
      )}
    >
      {copy && (
        <div className="absolute right-0 h-full w-24 bg-gradient-to-r from-neutral-900/0 via-neutral-900/70 to-neutral-900">
          <div className="absolute right-3 top-3">
            <CopyToClipboard code={code} />
          </div>
        </div>
      )}

      <div
        className="text-sm [&>pre]:overflow-x-auto [&>pre]:!bg-neutral-950 [&>pre]:py-6 [&>pre]:pl-4 [&>pre]:pr-5 [&>pre]:leading-snug [&>pre]:dark:!bg-neutral-950 [&_code]:block [&_code]:w-fit [&_code]:min-w-full"
        dangerouslySetInnerHTML={{ __html: html }}
      ></div>
    </div>
  )
}
