import { DashboardLayoutSkeleton } from "@/components/ui/dashboard-layout-skeleton"

export default function PhoneNumbersLoading() {
  return (
    <DashboardLayoutSkeleton 
      sidebarTitle="My Phone Numbers"
      hasAddButton={true}
      itemCount={3}
    />
  )
} 