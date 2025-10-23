import { useRef, useEffect } from 'react'

interface PreviewPaneProps {
  code: string
}

export default function PreviewPane({ code }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!code || !iframeRef.current) return

    // Create a complete HTML document with Tailwind CSS
    const fullHTML = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Preview</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          ${code}
        </body>
      </html>
    `

    // Create blob URL for the HTML content
    const blob = new Blob([fullHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)

    if (iframeRef.current) {
      iframeRef.current.src = url
    }

    // Cleanup blob URL when component unmounts or code changes
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [code])

  return (
    <div className="flex-1 bg-white relative">
      {code ? (
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Preview"
        />
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">🍒</div>
            <p>No code to preview yet</p>
            <p className="text-sm">Generate some code to see the preview</p>
          </div>
        </div>
      )}
    </div>
  )
}
