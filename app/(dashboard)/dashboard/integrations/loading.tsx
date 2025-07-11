import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function IntegrationsLoading() {
  return (
    <UnifiedPageSkeleton 
      sidebarTitle="Integrations"
      hasAddButton={false}
      itemCount={8}
    />
  )
} 