import { SectionHero } from '@/components/SectionHero'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <div className="w-full">
        <SectionHero image="/images/login-banner.png" height="compact" priority />
      </div>
      <LoginForm />
      <div className="w-full">
        <SectionHero image="/images/login-banner.png" height="compact" />
      </div>
    </div>
  )
}
