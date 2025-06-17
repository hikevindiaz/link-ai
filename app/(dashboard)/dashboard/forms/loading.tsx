import { DashboardLayoutSkeleton } from "@/components/ui/dashboard-layout-skeleton"

export default function FormsLoading() {
  return (
    <DashboardLayoutSkeleton 
      sidebarTitle="Smart Forms"
      hasAddButton={true}
      itemCount={5}
    />
  )
} 