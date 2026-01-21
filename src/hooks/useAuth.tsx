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
  const [loading, setLoading] = useState(true) // Start as loading
  const [error, setError] = useState<string | null>(null)
  const profilePromiseCache = useRef<Record<string, Promise<Profile | null>>>({})
  const initialized = useRef(false)

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    if (!userId) return null
    console.log('[Auth] Fetching profile for:', userId)
    
    // If already fetching, return the existing promise
    if (userId in profilePromiseCache.current) {
      return profilePromiseCache.current[userId]
    }

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('No rows found')) {
            // Try to get user from session to create profile
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user
            
            if (user && user.id === userId) {
              const profileData = {
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                role: 'user' as const,
                is_active: true
              }
              
              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert(profileData)
                .select()
                .single()
              
              if (createError) return null
              
              return newProfile as Profile
            }
          }
          return null
        }

        return data as Profile
      } catch (err) {
        console.error('[Auth] Unexpected error fetching profile:', err)
        return null
      } finally {
        // Remove from cache when done
        delete profilePromiseCache.current[userId]
      }
    })()

    profilePromiseCache.current[userId] = promise
    return promise
  }, [])

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user.id)
      setProfile(p)
    }
  }, [user, fetchProfile])

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    async function initialize() {
      if (initialized.current) return
      initialized.current = true

      console.log('[Auth] Initializing auth state...')
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          // Handle AbortError or other session errors gracefully
          if (sessionError.message?.includes('AbortError')) {
            console.warn('[Auth] Session fetch aborted, will rely on onAuthStateChange')
          } else {
            throw sessionError
          }
        }

        if (!mounted) return

        if (initialSession) {
          setSession(initialSession)
          setUser(initialSession.user)
          const p = await fetchProfile(initialSession.user.id)
          if (mounted && p) setProfile(p)
        }
      } catch (err) {
        console.error('[Auth] Init error:', err)
        if (mounted) setError(err instanceof Error ? err.message : 'Initialization failed')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('[Auth] Auth state changed:', event, currentSession ? 'Session exists' : 'No session')
      
      if (!mounted) return
      
      setSession(currentSession)
      const newUser = currentSession?.user ?? null
      setUser(newUser)

      if (newUser) {
        // Only fetch if needed or if it's a sign-in event
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || !profile || profile.id !== newUser.id) {
          const p = await fetchProfile(newUser.id)
          if (mounted && p) setProfile(p)
        }
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, profile?.id])

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
        if (profile && !profile.is_active) {
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
