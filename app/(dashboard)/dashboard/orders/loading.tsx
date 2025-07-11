import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function OrdersLoading() {
  return (
    <UnifiedPageSkeleton 
      sidebarTitle="Orders"
      hasAddButton={false}
      itemCount={10}
    />
  )
} 