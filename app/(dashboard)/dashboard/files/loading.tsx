import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function FilesLoading() {
    return (
        <UnifiedPageSkeleton 
            sidebarTitle="Files"
            hasAddButton={true}
            itemCount={8}
            showMainContent={true}
        />
    )
}