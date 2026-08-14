'use server'

import sharp from 'sharp'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateIconFile, type BrandingConfig } from '@/lib/branding'

const BUCKET = 'branding'

function sanitize(filename: string) {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_')
}

// Uploads the source image plus three resized PNG variants (192/512/apple
// touch), all center-cropped to square via `fit: 'cover'` -- same approach
// used for the header logo circle, so a non-square upload still works
// rather than being rejected outright. Deletes the previous branding
// objects afterward so storage doesn't accumulate orphans across re-uploads.
export async function updateBrandingIconAction(formData: FormData) {
  const { user } = await requireRole('admin')

  const file = formData.get('file') as File | null
  if (!file) throw new Error('No file provided')
  validateIconFile(file)

  const admin = createAdminClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const [icon192, icon512, appleTouchIcon] = await Promise.all([
    sharp(buffer).resize(192, 192, { fit: 'cover' }).png().toBuffer(),
    sharp(buffer).resize(512, 512, { fit: 'cover' }).png().toBuffer(),
    sharp(buffer).resize(180, 180, { fit: 'cover' }).png().toBuffer(),
  ])

  const stamp = Date.now()
  const sourcePath = `icons/${stamp}-source-${sanitize(file.name)}`
  const icon192Path = `icons/${stamp}-192.png`
  const icon512Path = `icons/${stamp}-512.png`
  const appleTouchIconPath = `icons/${stamp}-apple-touch.png`

  const { data: previous } = await admin.from('settings').select('value').eq('key', 'branding').maybeSingle()

  const uploads = await Promise.all([
    admin.storage.from(BUCKET).upload(sourcePath, buffer, { contentType: file.type }),
    admin.storage.from(BUCKET).upload(icon192Path, icon192, { contentType: 'image/png' }),
    admin.storage.from(BUCKET).upload(icon512Path, icon512, { contentType: 'image/png' }),
    admin.storage.from(BUCKET).upload(appleTouchIconPath, appleTouchIcon, { contentType: 'image/png' }),
  ])
  const uploadError = uploads.find((u) => u.error)?.error
  if (uploadError) throw uploadError

  const newConfig: BrandingConfig = {
    sourcePath,
    icon192Path,
    icon512Path,
    appleTouchIconPath,
    updatedAt: new Date().toISOString(),
  }

  const { error: settingsError } = await admin
    .from('settings')
    .upsert({ key: 'branding', value: newConfig, updated_by: user.id, updated_at: newConfig.updatedAt })
  if (settingsError) throw settingsError

  if (previous?.value) {
    const old = previous.value as BrandingConfig
    await admin.storage.from(BUCKET).remove([old.sourcePath, old.icon192Path, old.icon512Path, old.appleTouchIconPath])
  }

  // Logo/favicon appear on every route, both route groups.
  revalidatePath('/', 'layout')
}
