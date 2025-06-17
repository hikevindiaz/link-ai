import { DashboardLayoutSkeleton } from "@/components/ui/dashboard-layout-skeleton"

export default function IntegrationsLoading() {
  return (
    <DashboardLayoutSkeleton 
      sidebarTitle="Integrations"
      hasAddButton={false}
      itemCount={8}
    />
  )
} 