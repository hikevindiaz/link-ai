import { UnifiedPageSkeleton } from "@/components/ui/unified-skeleton"

export default function OnboardingLoading() {
    return (
        <UnifiedPageSkeleton 
            sidebarTitle="Onboarding"
            hasAddButton={false}
            itemCount={4}
            showMainContent={true}
        />
    )
}