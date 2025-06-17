import { DashboardLayoutSkeleton } from "@/components/ui/dashboard-layout-skeleton"

export default function TicketsLoading() {
  return (
    <DashboardLayoutSkeleton 
      sidebarTitle="Customer Tickets"
      hasAddButton={true}
      itemCount={8}
    />
  )
} 