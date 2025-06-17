import { DashboardLayoutSkeleton } from "@/components/ui/dashboard-layout-skeleton"

export default function KnowledgeBaseLoading() {
  return (
    <DashboardLayoutSkeleton 
      sidebarTitle="Knowledge Base"
      hasAddButton={true}
      itemCount={4}
    />
  )
} 