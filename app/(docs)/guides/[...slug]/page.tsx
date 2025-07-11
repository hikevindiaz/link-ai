import { notFound } from "next/navigation"
import "@/styles/mdx.css"
import { Metadata } from "next"
import { absoluteUrl, cn, getSafeGitHubConfig } from "@/lib/utils"

// Ensure this page is always rendered dynamically
export const dynamic = 'force-dynamic';

// Check if we're running on Vercel
const isVercel = process.env.VERCEL === '1';

// Import contentlayer only if not on Vercel
let allGuides: any[] = [];
if (!isVercel) {
  try {
    // Use dynamic import with require to avoid build errors
    const contentlayer = require("contentlayer/generated");
    allGuides = contentlayer.allGuides || [];
  } catch (error) {
    console.warn("ContentLayer not available:", error);
    allGuides = [];
  }
} else {
  // On Vercel, use empty array
  allGuides = [];
}

interface GuidePageProps {
    params: {
        slug: string[]
    }
}

async function getGuideFromParams(params: any) {
    if (isVercel) return null;
    
    const slug = params?.slug?.join("/")
    const guide = allGuides.find((guide) => guide.slugAsParams === slug)

    if (!guide) {
        return null
    }

    return guide
}

export async function generateMetadata({
    params,
}: GuidePageProps): Promise<Metadata> {
    // Make sure we have the safe GitHub config
    const safeConfig = getSafeGitHubConfig();
    
    // If this is the index page (the slug is "index")
    if (params.slug.length === 1 && params.slug[0] === "index") {
        return {
            title: "Guides",
            description: "Learn how to use our product with our comprehensive guides.",
        }
    }

    const guide = await getGuideFromParams(params)

    if (!guide) {
        return {}
    }

    const url = process.env.NEXT_PUBLIC_VERCEL_URL

    const ogUrl = new URL(`${url}/api/og`)
    ogUrl.searchParams.set("heading", guide.title)
    ogUrl.searchParams.set("type", "Guide")
    ogUrl.searchParams.set("mode", "dark")

    return {
        title: guide.title,
        description: guide.description,
        openGraph: {
            title: guide.title,
            description: guide.description,
            type: "article",
            url: absoluteUrl(guide.slug),
            images: [
                {
                    url: ogUrl.toString(),
                    width: 1200,
                    height: 630,
                    alt: guide.title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: guide.title,
            description: guide.description,
            images: [ogUrl.toString()],
        },
    }
}

export async function generateStaticParams(): Promise<
    GuidePageProps["params"][]
> {
    // Make sure we have the safe GitHub config
    const safeConfig = getSafeGitHubConfig();
    
    if (isVercel) return [{ slug: ["index"] }];
    
    // Include the root guides page as "index"
    const paths = [{ slug: ["index"] }];
    
    // Add all the individual guide pages
    allGuides.forEach((guide) => {
        paths.push({
            slug: guide.slugAsParams.split("/"),
        });
    });
    
    return paths;
}

export default function GuidePage({ params }: GuidePageProps) {
    // Add safe GitHub config
    const safeConfig = getSafeGitHubConfig();
    
    // If on Vercel, show simplified version
    if (isVercel) {
        return (
            <div className="container mx-auto py-10">
                <h1 className="text-3xl font-bold mb-4">Guides</h1>
                <p>Our guides are currently being updated. Please check back soon.</p>
                <p className="mt-4">
                    <a href="/dashboard" className="text-blue-500 hover:underline">
                        Return to Dashboard
                    </a>
                </p>
            </div>
        );
    }

    // For the index page, render a simplified version
    if (params.slug.length === 1 && params.slug[0] === "index") {
        return (
            <div className="container max-w-4xl py-6 lg:py-10">
                <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:gap-8">
                    <div className="flex-1 space-y-4">
                        <h1 className="inline-block text-4xl font-bold tracking-tight lg:text-5xl">
                            Guides
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            Learn how to use our product with our comprehensive guides.
                        </p>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 md:gap-6 mt-8">
                    <div className="group relative rounded-xl border p-6 shadow-md transition-shadow hover:shadow-lg">
                        <div className="flex flex-col justify-between space-y-4">
                            <div className="space-y-2">
                                <h2 className="text-xl font-medium tracking-tight">
                                    Getting Started
                                </h2>
                                <p className="text-muted-foreground">
                                    Learn the basics of our platform.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="group relative rounded-xl border p-6 shadow-md transition-shadow hover:shadow-lg">
                        <div className="flex flex-col justify-between space-y-4">
                            <div className="space-y-2">
                                <h2 className="text-xl font-medium tracking-tight">
                                    Advanced Features
                                </h2>
                                <p className="text-muted-foreground">
                                    Explore advanced capabilities.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // For individual guide pages, show a simplified version
    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-4">Guide Content</h1>
            <p>This guide is currently being updated. Please check back soon.</p>
            <p className="mt-4">
                <a href="/guides" className="text-blue-500 hover:underline">
                    Return to Guides
                </a>
            </p>
        </div>
    );
}
