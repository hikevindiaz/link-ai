import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function InboxLoading() {
  return (
    <UnifiedPageSkeleton 
      sidebarTitle="Inbox"
      hasAddButton={false}
      itemCount={6}
    />
  )
} 