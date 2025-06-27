import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function CrawlersSettingsLoading() {
    return (
        <UnifiedPageSkeleton 
            sidebarTitle="Crawlers"
            hasAddButton={true}
            itemCount={6}
            showMainContent={true}
        />
    )
}