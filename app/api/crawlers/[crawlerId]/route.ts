import { getServerSession } from "next-auth/next"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { crawlerSchema } from "@/lib/validations/crawler"
import { deleteFromSupabase } from "@/lib/supabase"
import { deleteContent } from "@/lib/vector-service"

const routeContextSchema = z.object({
    params: z.object({
        crawlerId: z.string(),
    }),
})

async function verifyCurrentUserHasAccessToCrawler(crawlerId: string) {
    const session = await getServerSession(authOptions)

    const count = await db.crawler.count({
        where: {
            userId: session?.user?.id,
            id: crawlerId,
        },
    })

    return count > 0
}

export async function DELETE(
    req: Request,
    context: z.infer<typeof routeContextSchema>
) {
    try {
        // Validate the route params.
        const { params } = routeContextSchema.parse(context)

        if (!(await verifyCurrentUserHasAccessToCrawler(params.crawlerId))) {
            return new Response(null, { status: 403 })
        }

        console.log(`[Crawler Deletion] Starting deletion process for crawler ${params.crawlerId}`)

        // Get crawler files with knowledge source info
        const crawlerFiles = await db.file.findMany({
            where: {
                crawlerId: params.crawlerId
            },
            include: {
                knowledgeSource: true
            }
        })

        console.log(`[Crawler Deletion] Found ${crawlerFiles.length} files to delete`)

        // Delete files and their vectors
        for (const crawlerFile of crawlerFiles) {
            try {
                // Delete from vector store first
                if (crawlerFile.knowledgeSourceId) {
                    console.log(`[Crawler Deletion] Deleting vector content for crawler ${params.crawlerId}`)
                    try {
                        // The crawler creates vector jobs with content_id pattern: crawler-{crawlerId}-{timestamp}
                        // We need to find and delete all vector content for this crawler
                        
                        // Method 1: Delete by crawler pattern (more reliable)
                        await db.$executeRaw`
                          DELETE FROM embedding_jobs 
                          WHERE knowledge_source_id = ${crawlerFile.knowledgeSourceId}
                          AND content_type = 'website'
                          AND content_id LIKE ${'crawler-' + params.crawlerId + '-%'}
                        `;
                        
                        await db.$executeRaw`
                          DELETE FROM vector_documents 
                          WHERE knowledge_source_id = ${crawlerFile.knowledgeSourceId}
                          AND content_type = 'website'
                          AND content_id LIKE ${'crawler-' + params.crawlerId + '-%'}
                        `;
                        
                        console.log(`[Crawler Deletion] ✓ Deleted vector content for crawler ${params.crawlerId}`)
                    } catch (vectorError) {
                        console.error(`[Crawler Deletion] Error deleting vector content:`, vectorError)
                    }
                }

                // Delete from storage
                if (crawlerFile.storageUrl) {
                    console.log(`[Crawler Deletion] Deleting file from storage: ${crawlerFile.storageUrl}`)
                    const deleted = await deleteFromSupabase(crawlerFile.storageUrl, 'files')
                    if (deleted) {
                        console.log(`[Crawler Deletion] ✓ Deleted file from storage`)
                    } else {
                        console.log(`[Crawler Deletion] ⚠️ Failed to delete file from storage`)
                    }
                } else if (crawlerFile.blobUrl) {
                    // Legacy Vercel Blob support
                    console.log(`[Crawler Deletion] File uses legacy blob storage, skipping deletion`)
                }
            } catch (error) {
                console.error(`[Crawler Deletion] Error deleting file ${crawlerFile.id}:`, error)
                // Continue with other files
            }
        }

        // Delete the crawler
        console.log(`[Crawler Deletion] Deleting crawler record from database`)
        await db.crawler.delete({
            where: {
                id: params.crawlerId as string,
            },
        })

        console.log(`[Crawler Deletion] ✓ Crawler deletion completed successfully`)
        return new Response(null, { status: 204 })
    } catch (error) {
        console.error(`[Crawler Deletion] Error:`, error)
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.issues), { status: 422 })
        }

        return new Response(null, { status: 500 })
    }
}

export async function PATCH(
    req: Request,
    context: z.infer<typeof routeContextSchema>
) {
    try {
        // Validate the route context.
        const { params } = routeContextSchema.parse(context)

        if (!(await verifyCurrentUserHasAccessToCrawler(params.crawlerId))) {
            return new Response(null, { status: 403 })
        }

        const body = await req.json()
        const payload = crawlerSchema.parse(body)

        await db.crawler.update({
            where: {
                id: params.crawlerId,
            },
            data: {
                name: payload.name,
                crawlUrl: payload.crawlUrl,
                selector: payload.selector,
                urlMatch: payload.urlMatch,
                maxPagesToCrawl: payload.maxPagesToCrawl,
            },
        })

        return new Response(null, { status: 200 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.issues), { status: 422 })
        }

        return new Response(null, { status: 500 })
    }
}