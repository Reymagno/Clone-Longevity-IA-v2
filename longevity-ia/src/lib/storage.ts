/**
 * HIPAA-compliant storage helpers.
 * Files are stored in private buckets; access via signed URLs only.
 */

/**
 * Build a deterministic storage path for a file within a bucket.
 */
export function buildStoragePath(userId: string, fileName: string): string {
  const timestamp = Date.now()
  const safeName = fileName.replace(/\s/g, '_')
  return `${userId}/${timestamp}-${safeName}`
}

/**
 * Client-side helper to get a signed URL for a private file.
 */
export async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  try {
    const res = await fetch('/api/storage/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, path }),
    })
    if (!res.ok) return null
    const { url } = await res.json()
    return url
  } catch {
    return null
  }
}

/**
 * Extract the storage path from a full Supabase URL.
 * Example: "https://xxx.supabase.co/storage/v1/object/public/lab-files/abc/123-file.pdf"
 * Returns: "abc/123-file.pdf"
 *
 * If the value is already a bare path (no "http"), returns it as-is.
 */
export function extractPathFromUrl(url: string, bucket: string): string {
  // Already a bare storage path (no URL scheme)
  if (!url.startsWith('http')) return url

  const marker = `/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return url
  return url.substring(idx + marker.length)
}
