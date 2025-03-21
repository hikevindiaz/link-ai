import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Define CardHeader, CardContent, and CardFooter if they are not already defined
const CardHeader = ({ children, className }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

const CardContent = ({ children, className }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

const CardFooter = ({ children, className }) => (
  <div className={`mt-4 ${className}`}>{children}</div>
);

export function CardSkeleton() {
  return (
    <Card className="rounded-xl border-2 border-primary bg-card-light dark:bg-card-dark shadow-sm transition-colors duration-300">
      <CardHeader className="gap-2">
        <Skeleton className="h-5 w-1/5 bg-primary/20 dark:bg-primary/30" />
        <Skeleton className="h-4 w-4/5 bg-primary/20 dark:bg-primary/30" />
      </CardHeader>
      <CardContent className="h-10">
        <Skeleton className="h-full w-full bg-primary/20 dark:bg-primary/30" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-8 w-[120px] bg-primary/20 dark:bg-primary/30" />
      </CardFooter>
    </Card>
  );
}
