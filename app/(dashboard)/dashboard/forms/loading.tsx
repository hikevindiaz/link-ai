import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function FormsLoading() {
  return (
    <UnifiedPageSkeleton 
      sidebarTitle="Smart Forms"
      hasAddButton={true}
      itemCount={10}
    />
  )
} 