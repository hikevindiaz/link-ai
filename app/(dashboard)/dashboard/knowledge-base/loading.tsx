export default function KnowledgeBaseLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-600 dark:border-t-neutral-400"></div>
        </div>
        <h1 className="text-2xl font-normal text-neutral-700 dark:text-neutral-200">
          Loading Knowledge Base...
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          Please wait while we load your knowledge sources.
        </p>
      </div>
    </div>
  )
} 