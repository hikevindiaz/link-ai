import { notFound } from "next/navigation"
import "@/styles/mdx.css"
import { Metadata } from "next"
import { absoluteUrl, getSafeGitHubConfig } from "@/lib/utils"

// Ensure this page is always rendered dynamically
export const dynamic = 'force-dynamic';

// Check if we're running on Vercel
const isVercel = process.env.VERCEL === '1';

// Import contentlayer only if not on Vercel
let allDocs: any[] = [];
if (!isVercel) {
  try {
    // Use dynamic import with require to avoid build errors
    const contentlayer = require("contentlayer/generated");
    allDocs = contentlayer.allDocs || [];
  } catch (error) {
    console.warn("ContentLayer not available:", error);
    allDocs = [];
  }
} else {
  // On Vercel, use empty array
  allDocs = [];
}

interface DocPageProps {
    params: {
        slug?: string[]
    }
}

async function getDocFromParams(params: any) {
    if (isVercel) return null;
    
    const slug = params.slug?.join("/") || ""
    const doc = allDocs.find((doc: any) => doc.slugAsParams === slug)

    if (!doc) {
        return null
    }

    return doc
}

export async function generateMetadata({
    params,
}: DocPageProps): Promise<Metadata> {
    // Make sure we have the safe GitHub config
    const safeConfig = getSafeGitHubConfig();
    
    // If this is the index page
    if (!params.slug || params.slug.length === 0) {
        return {
            title: "Documentation",
            description: "Learn how to use our product with our comprehensive documentation.",
        }
    }

    const doc = await getDocFromParams(params)

    if (!doc) {
        return {}
    }

    const url = process.env.NEXT_PUBLIC_VERCEL_URL

    const ogUrl = new URL(`${url}/api/og`)
    ogUrl.searchParams.set("heading", doc.description ?? doc.title)
    ogUrl.searchParams.set("type", "Documentation")
    ogUrl.searchParams.set("mode", "dark")

    return {
        title: doc.title,
        description: doc.description,
        openGraph: {
            title: doc.title,
            description: doc.description,
            type: "article",
            url: absoluteUrl(doc.slug),
            images: [
                {
                    url: ogUrl.toString(),
                    width: 1200,
                    height: 630,
                    alt: doc.title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: doc.title,
            description: doc.description,
            images: [ogUrl.toString()],
        },
    }
}

export async function generateStaticParams(): Promise<
    DocPageProps["params"][]
> {
    // Make sure we have the safe GitHub config
    const safeConfig = getSafeGitHubConfig();
    
    if (isVercel) return [{ slug: [] }];
    
    // Include the root docs page
    const paths = [{ slug: [] }];
    
    // Add all the individual doc pages
    allDocs.forEach((doc) => {
        paths.push({
            slug: doc.slugAsParams.split("/"),
        });
    });
    
    return paths;
}

export default function DocPage({ params }: DocPageProps) {
    // Add safe GitHub config
    const safeConfig = getSafeGitHubConfig();
    
    // If on Vercel, show simplified version
    if (isVercel) {
        return (
            <div className="container mx-auto py-10">
                <h1 className="text-3xl font-bold mb-4">Documentation</h1>
                <p>Documentation is currently being updated. Please check back soon.</p>
                <p className="mt-4">
                    <a href="/dashboard" className="text-blue-500 hover:underline">
                        Return to Dashboard
                    </a>
                </p>
            </div>
        );
    }

    // Check if this is the index page
    if (!params.slug || params.slug.length === 0) {
        return (
            <div className="container max-w-4xl py-6 lg:py-10">
                <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:gap-8">
                    <div className="flex-1 space-y-4">
                        <h1 className="inline-block text-4xl font-bold tracking-tight lg:text-5xl">
                            Documentation
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            Learn how to use our product with our comprehensive documentation.
                        </p>
                    </div>
                </div>
                <div className="grid gap-8 mt-8">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Getting Started</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <a href="/docs/introduction" className="group rounded-xl border p-4 hover:bg-muted">
                                <h3 className="font-medium">Introduction</h3>
                                <p className="text-sm text-muted-foreground">
                                    Learn the basics of our platform.
                                </p>
                            </a>
                            <a href="/docs/installation" className="group rounded-xl border p-4 hover:bg-muted">
                                <h3 className="font-medium">Installation</h3>
                                <p className="text-sm text-muted-foreground">
                                    How to install and set up our product.
                                </p>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // For individual doc pages, show a simplified version
    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-4">Documentation Content</h1>
            <p>This documentation page is currently being updated. Please check back soon.</p>
            <p className="mt-4">
                <a href="/docs" className="text-blue-500 hover:underline">
                    Return to Documentation
                </a>
            </p>
        </div>
    );
}
