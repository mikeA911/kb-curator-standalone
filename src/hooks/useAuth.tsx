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
  const [loading, setLoading] = useState(false) // Start as not loading
  const [error, setError] = useState<string | null>(null)
  const profilePromiseCache = useRef<Record<string, Promise<Profile | null>>>({})

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    console.log('[Auth] Fetching profile for:', userId)
    
    // If already fetching, return the existing promise
    if (userId in profilePromiseCache.current) {
      console.log('[Auth] Already fetching profile for this user, returning existing promise')
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
      console.log('[Auth] Initializing auth state...')
      // Only set loading if we don't have a session yet
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[Auth] Session retrieved:', session ? 'Yes' : 'No')
        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          console.log('[Auth] User found in session, fetching profile...')
          // Don't await profile fetch to avoid blocking the UI
          fetchProfile(session.user.id).then(p => {
            if (mounted && p) setProfile(p)
          })
        }
        
        console.log('[Auth] Initialization complete, setting loading to false')
        setLoading(false)
      } catch (err) {
        console.error('[Auth] Init error:', err)
        if (mounted) setLoading(false)
      }
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth state changed:', event, session ? 'Session exists' : 'No session')
      if (!mounted) return
      
      setSession(session)
      const newUser = session?.user ?? null
      setUser(newUser)

      if (newUser) {
        // Only fetch if needed or if it's a sign-in event
        if (event === 'SIGNED_IN' || !profile || profile.id !== newUser.id) {
          console.log('[Auth] Fetching profile due to state change...')
          // Don't await profile fetch to avoid blocking the UI
          fetchProfile(newUser.id).then(p => {
            if (mounted && p) setProfile(p)
          })
        }
      } else {
        if (mounted) setProfile(null)
        localStorage.removeItem('curator_profile')
      }
      
      // Always ensure loading is false after state change
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
