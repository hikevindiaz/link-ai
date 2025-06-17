import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <Card className="rounded-xl border-2 border-neutral-200 dark:border-neutral-800 bg-card-light dark:bg-card-dark shadow-sm transition-colors duration-300">
      <CardHeader className="gap-2">
        <Skeleton className="h-5 w-1/5 bg-neutral-200 dark:bg-neutral-700" />
        <Skeleton className="h-4 w-4/5 bg-neutral-200 dark:bg-neutral-700" />
      </CardHeader>
      <CardContent className="h-10">
        <Skeleton className="h-full w-full bg-neutral-200 dark:bg-neutral-700" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-8 w-[120px] bg-neutral-200 dark:bg-neutral-700" />
      </CardFooter>
    </Card>
  );
}
