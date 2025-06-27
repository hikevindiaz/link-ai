import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function CrawlingLoading() {
    return (
        <UnifiedPageSkeleton 
            sidebarTitle="Crawling"
            hasAddButton={false}
            itemCount={6}
            showMainContent={true}
        />
    )
}