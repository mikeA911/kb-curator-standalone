import { useState, useEffect, createContext, useContext, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, UserRole } from '../types'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  isRole: (role: UserRole) => boolean
  isCurator: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchingProfileFor = useRef<string | null>(null)

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    if (fetchingProfileFor.current === userId) {
      console.log('[Auth] Already fetching profile for:', userId)
      return null
    }

    console.log('[Auth] Fetching profile for:', userId)
    fetchingProfileFor.current = userId
    
    try {
      console.log('[Auth] Executing Supabase query for profile (simple)...')
      // Use a simpler query without .single() to see if it helps
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, assigned_kbs')
        .eq('id', userId)

      console.log('[Auth] Profile query result:', { hasData: !!data, count: data?.length, hasError: !!error })

      if (error) {
        console.error('[Auth] Profile fetch error:', error)
        // ... creation logic ...
        return null
      }

      if (!data || data.length === 0) {
        console.log('[Auth] Profile not found, creating...')
        // ... creation logic ...
        return null
      }

      const profile = data[0] as Profile
      console.log('[Auth] Profile fetched successfully:', profile)
      return profile
    } catch (err) {
      console.error('[Auth] Unexpected error fetching profile:', err)
      return null
    } finally {
      fetchingProfileFor.current = null
    }
  }, [])

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (user) {
      const profile = await fetchProfile(user.id)
      setProfile(profile)
    }
  }, [user, fetchProfile])

  // Initialize auth state
  useEffect(() => {
    console.log('[Auth] useEffect mounting...')
    let mounted = true

    async function initialize() {
      console.log('[Auth] initialize() starting...')
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[Auth] initialize() session fetched:', !!session)
        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          console.log('[Auth] initialize() user found, fetching profile...')
          // Add a timeout to the profile fetch
          const profilePromise = fetchProfile(session.user.id)
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 5000))
          
          try {
            const p = await Promise.race([profilePromise, timeoutPromise]) as Profile | null
            if (mounted) {
              console.log('[Auth] initialize() profile set')
              setProfile(p)
            }
          } catch (e) {
            console.error('[Auth] initialize() profile fetch timed out or failed')
          }
        } else {
          console.log('[Auth] initialize() no user found')
        }
      } catch (err) {
        console.error('[Auth] Init error:', err)
      } finally {
        if (mounted) {
          console.log('[Auth] initialize() complete, setting loading to false')
          setLoading(false)
        }
      }
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange event:', event, 'session:', !!session)
      if (!mounted) return
      
      setSession(session)
      const newUser = session?.user ?? null
      setUser(newUser)

      if (newUser) {
        console.log('[Auth] onAuthStateChange user found, fetching profile...')
        // Add a timeout to the profile fetch
        const profilePromise = fetchProfile(newUser.id)
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 5000))
        
        try {
          const p = await Promise.race([profilePromise, timeoutPromise]) as Profile | null
          if (mounted) {
            console.log('[Auth] onAuthStateChange profile set')
            setProfile(p)
          }
        } catch (e) {
          console.error('[Auth] onAuthStateChange profile fetch timed out or failed')
        }
      } else {
        console.log('[Auth] onAuthStateChange no user found')
        if (mounted) setProfile(null)
      }
      
      if (mounted) {
        console.log('[Auth] onAuthStateChange complete, setting loading to false')
        setLoading(false)
      }
    })

    return () => {
      console.log('[Auth] useEffect unmounting')
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // Sign in
  const signIn = async (email: string, password: string) => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }

      if (data.user) {
        const profile = await fetchProfile(data.user.id)
        if (!profile?.is_active) {
          await supabase.auth.signOut()
          return { success: false, error: 'Account is inactive. Please contact an administrator.' }
        }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      setError(message)
      return { success: false, error: message }
    }
  }

  // Sign up
  const signUp = async (email: string, password: string, fullName?: string) => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
        },
      })

      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }

      if (data.user && !data.session) {
        return { success: true, error: 'Please check your email to confirm your account.' }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed'
      setError(message)
      return { success: false, error: message }
    }
  }

  // Sign out
  const signOut = async () => {
    setError(null)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  // Check role
  const isRole = useCallback((role: UserRole): boolean => {
    if (!profile?.is_active) return false

    if (profile.role === 'admin') return true
    if (profile.role === 'curator' && (role === 'curator' || role === 'user')) return true
    if (profile.role === 'user' && role === 'user') return true

    return false
  }, [profile])

  const value = useMemo(() => ({
    user,
    profile,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    isRole,
    isCurator: isRole('curator'),
    isAdmin: profile?.role === 'admin' && profile?.is_active === true,
  }), [user, profile, session, loading, error, signIn, signUp, signOut, refreshProfile, isRole])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
