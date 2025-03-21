import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
    heading: string;
    text?: string;
    children?: React.ReactNode;
}

export function DashboardHeader({
    heading,
    text,
    children,
}: DashboardHeaderProps) {
    return (
        <div className={cn(
            "sticky top-0 z-20 flex items-center justify-between",
            "w-full px-6 py-4 bg-white dark:bg-gray-900",
            "border-b border-gray-200 dark:border-gray-800 shadow-sm"
        )}>
            {/* Left: Heading and Description */}
            <div className="grid gap-1">
                <h1 className="font-heading text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {heading}
                </h1>
                {text && (
                    <p className="text-md text-gray-500 dark:text-gray-400">
                        {text}
                    </p>
                )}
            </div>

            {/* Right: Optional Actions */}
            <div className="flex items-center space-x-2">
                {children}
            </div>
        </div>
    );
}
