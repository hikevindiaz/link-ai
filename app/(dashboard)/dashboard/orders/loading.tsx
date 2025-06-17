import { DashboardLayoutSkeleton } from "@/components/ui/dashboard-layout-skeleton"

export default function OrdersLoading() {
  return (
    <DashboardLayoutSkeleton 
      sidebarTitle="Orders"
      hasAddButton={false}
      itemCount={10}
    />
  )
} 