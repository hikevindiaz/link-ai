import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function PhoneNumbersLoading() {
  return (
    <UnifiedPageSkeleton 
      sidebarTitle="Phone Numbers"
      hasAddButton={true}
      itemCount={6}
    />
  )
} 