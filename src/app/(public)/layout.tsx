import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/PublicHeader'
import { getBrandingUrls } from '@/lib/branding'

// No auth redirect here -- these pages must work for a sessionless visitor
// (the whole point of this route group) and stay reachable for a logged-in
// user too (doc requirement). Compare (app)/layout.tsx, which does redirect.
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const [
    {
      data: { user },
    },
    brandingUrls,
  ] = await Promise.all([supabase.auth.getUser(), getBrandingUrls(supabase)])

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader isAuthenticated={!!user} logoUrl={brandingUrls.logo} />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
