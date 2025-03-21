import { Metadata } from "next";

export function constructMetadata({
    title = `Link AI - Start a New Conversation`,
    description = `Use AI to start new conversations.`,
    image = "app/favicon.ico",
    icons = [
        {
            rel: "apple-touch-icon",
            sizes: "32x32",
            url: "/logo-32-32.png",
        },
        {
            rel: "icon",
            type: "image/png",
            sizes: "32x32",
            url: "/logo-32-32.png",
        },
        {
            rel: "icon",
            type: "image/png",
            sizes: "16x16",
            url: "/logo-32-32.png",
        },
    ],
    noIndex = false,
}: {
    title?: string;
    description?: string;
    image?: string | null;
    icons?: Metadata["icons"];
    noIndex?: boolean;
} = {}): Metadata {
    return {
        title,
        description,
        openGraph: {
            title,
            description,
            ...(image && {
                images: [
                    {
                        url: image,
                    },
                ],
            }),
        },
        twitter: {
            title,
            description,
            ...(image && {
                card: "summary_large_image",
                images: [image],
            }),
            creator: "@oassistantgpt",
        },
        icons,
        metadataBase: new URL('https://dashboard.getlinkai.com/'),
        ...(noIndex && {
            robots: {
                index: false,
                follow: false,
            },
        }),
    };
}