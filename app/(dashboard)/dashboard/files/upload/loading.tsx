import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function UploadFileLoading() {
    return (
        <UnifiedPageSkeleton 
            sidebarTitle="Upload File"
            hasAddButton={false}
            itemCount={6}
            showMainContent={true}
        />
    )
}