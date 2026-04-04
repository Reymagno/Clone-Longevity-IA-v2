/**
 * Steps de almacenamiento con retry.
 * Wraps Supabase Storage con retry automático y manejo de paths.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Upload with retry ───────────────────────────────────────────────

export interface UploadOptions {
  bucket: string
  path: string
  data: Buffer | Blob | ArrayBuffer
  contentType: string
  maxRetries?: number
}

export async function uploadToStorage(
  supabase: SupabaseClient,
  options: UploadOptions,
): Promise<{ path: string; error?: string }> {
  const { bucket, path, data, contentType, maxRetries = 2 } = options
  let lastError: string | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, data, { contentType, upsert: false })

    if (!error) return { path }

    lastError = error.message
    if (attempt < maxRetries) {
      // Wait briefly before retry (exponential backoff)
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
    }
  }

  return { path, error: lastError }
}

// ── Delete from storage ─────────────────────────────────────────────

export async function deleteFromStorage(
  supabase: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return

  const cleanPaths = paths
    .map(p => extractPathFromUrl(p, bucket))
    .filter(Boolean) as string[]

  if (cleanPaths.length > 0) {
    await supabase.storage.from(bucket).remove(cleanPaths)
  }
}

// ── Build storage path ──────────────────────────────────────────────

export function buildStoragePath(prefix: string, fileName: string): string {
  // Sanitize: whitelist alphanumeric + safe chars, prevent path traversal
  const safeName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '')
  return `${safePrefix}/${Date.now()}-${safeName}`
}

// ── Extract path from URL ───────────────────────────────────────────

export function extractPathFromUrl(urlOrPath: string, bucket: string): string | null {
  if (!urlOrPath) return null

  // Already a bare path
  if (!urlOrPath.startsWith('http')) return urlOrPath

  // Full URL — extract path after bucket name
  const marker = `/${bucket}/`
  const idx = urlOrPath.indexOf(marker)
  if (idx === -1) return null

  return urlOrPath.slice(idx + marker.length)
}

// ── Validate files ──────────────────────────────────────────────────

export interface FileValidationResult {
  valid: boolean
  error?: string
}

export function validateFiles(
  files: { size: number; type: string }[],
  rules: { maxSizeBytes: number; maxTotalBytes: number; allowedTypes: string[] },
): FileValidationResult {
  let totalSize = 0

  for (const file of files) {
    if (!rules.allowedTypes.includes(file.type)) {
      return { valid: false, error: `Tipo de archivo no permitido: ${file.type}` }
    }
    if (file.size > rules.maxSizeBytes) {
      return { valid: false, error: `Archivo excede ${Math.round(rules.maxSizeBytes / 1024 / 1024)}MB` }
    }
    totalSize += file.size
  }

  if (totalSize > rules.maxTotalBytes) {
    return { valid: false, error: `Total excede ${Math.round(rules.maxTotalBytes / 1024 / 1024)}MB` }
  }

  return { valid: true }
}
