import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function CalendarLoading() {
  return (
    <UnifiedPageSkeleton 
      sidebarTitle="Calendar"
      hasAddButton={true}
      itemCount={8}
    />
  )
} 