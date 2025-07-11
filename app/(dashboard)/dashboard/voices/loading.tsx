import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function VoicesLoading() {
  return (
    <UnifiedPageSkeleton 
      sidebarTitle="Voices"
      hasAddButton={true}
      itemCount={6}
    />
  )
} 