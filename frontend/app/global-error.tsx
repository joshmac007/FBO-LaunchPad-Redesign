'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900">Error</h1>
            <p className="mt-4 text-xl text-gray-600">
              Something went wrong!
            </p>
            <div className="mt-6 space-x-4">
              <button
                onClick={reset}
                className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Try again
              </button>
              <a
                href="/"
                className="inline-block rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
              >
                Go back home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
} 