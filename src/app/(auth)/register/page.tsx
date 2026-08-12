import { redirect } from 'next/navigation'

// Self-serve registration is removed -- an admin creates accounts from
// /admin's User Management panel instead (see createUserAction). This route
// is kept as a redirect rather than deleted so any stale bookmark/link
// lands somewhere useful instead of a 404.
export default function RegisterPage() {
  redirect('/login')
}
