import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function SettingsLoading() {
    return (
        <UnifiedPageSkeleton 
            sidebarTitle="Settings"
            hasAddButton={false}
            itemCount={5}
            showMainContent={true}
        />
    )
}