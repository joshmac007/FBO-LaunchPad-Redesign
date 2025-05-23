import { Skeleton } from "@/components/ui/skeleton"

export default function ReceiptLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
      </header>

      <main className="container px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-24" />
          </div>

          <div className="border-2 rounded-lg">
            <div className="border-b p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div>
                    <Skeleton className="h-8 w-40 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <Skeleton className="h-7 w-32 mb-2" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <Skeleton className="h-20 w-full rounded-md" />

                <div>
                  <Skeleton className="h-7 w-48 mb-2" />
                  <Skeleton className="h-32 w-full rounded-md" />
                </div>

                <div>
                  <Skeleton className="h-7 w-48 mb-2" />
                  <Skeleton className="h-32 w-full rounded-md" />
                </div>

                <div>
                  <Skeleton className="h-7 w-48 mb-2" />
                  <Skeleton className="h-32 w-full rounded-md" />
                </div>
              </div>
            </div>

            <div className="border-t p-6">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
