import { DashboardLayoutSkeleton } from "@/components/ui/dashboard-layout-skeleton"

export default function AgentsLoading() {
  return (
    <DashboardLayoutSkeleton 
      sidebarTitle="My Agents"
      hasAddButton={true}
      itemCount={4}
    />
  )
} 