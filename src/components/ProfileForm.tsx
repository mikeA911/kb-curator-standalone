'use client'

import { useState, useTransition } from 'react'
import { updateOwnFullNameAction } from '@/app/actions/profile'

export function ProfileForm({ initialFullName }: { initialFullName: string | null }) {
  const [fullName, setFullName] = useState(initialFullName ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    startTransition(async () => {
      await updateOwnFullNameAction(fullName)
      setSaved(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Full name</span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full max-w-sm rounded border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Not set"
        />
      </label>
      <div className="flex items-center gap-2">
        <button disabled={isPending} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? 'Saving…' : 'Save'}
        </button>
        {saved && !isPending && <span className="text-sm text-green-700">Saved</span>}
      </div>
    </form>
  )
}
