import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function TicketsLoading() {
  return (
    <UnifiedPageSkeleton 
      sidebarTitle="Tickets"
      hasAddButton={true}
      itemCount={8}
    />
  )
} 