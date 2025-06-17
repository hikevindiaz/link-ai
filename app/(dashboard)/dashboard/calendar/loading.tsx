import { DashboardLayoutSkeleton } from "@/components/ui/dashboard-layout-skeleton"

export default function CalendarLoading() {
  return (
    <DashboardLayoutSkeleton 
      sidebarTitle="Calendar"
      hasAddButton={true}
      itemCount={12}
    />
  )
} 