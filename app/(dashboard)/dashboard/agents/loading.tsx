import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function AgentsLoading() {
  return (
    <UnifiedPageSkeleton 
      sidebarTitle="My Agents"
      hasAddButton={true}
      itemCount={8}
    />
  )
} 