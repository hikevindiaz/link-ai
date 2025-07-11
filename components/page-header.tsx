import { cn } from "@/lib/utils"

interface DocsPageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    heading: string
    text?: string
}

export function DocsPageHeader({
    heading,
    text,
    className,
    ...props
}: DocsPageHeaderProps) {
    return (
        <>
            <div className={cn("space-y-4 p-4 bg-[#0F123B] text-white rounded-xl shadow-md", className)} {...props}>
                <h1 className="inline-block font-heading text-4xl lg:text-5xl">
                    {heading}
                </h1>
                {text && <p className="text-xl text-neutral-300">{text}</p>}
            </div>
            <hr className="my-4 border-neutral-600" />
        </>
    )
}