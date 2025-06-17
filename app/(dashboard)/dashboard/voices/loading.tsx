import { DashboardLayoutSkeleton } from "@/components/ui/dashboard-layout-skeleton"

export default function VoicesLoading() {
  return (
    <DashboardLayoutSkeleton 
      sidebarTitle="Voices"
      hasAddButton={true}
      itemCount={6}
    />
  )
} 