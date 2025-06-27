import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function DashboardLoading() {
    return (
        <UnifiedPageSkeleton
            sidebarTitle="Dashboard"
            hasAddButton={true}
            itemCount={6}
            showMainContent={true}
        />
    )
}