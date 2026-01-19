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
  const [profile, setProfile] = useState<Profile | null>(() => {
    // Try to load profile from localStorage for immediate access
    try {
      const saved = localStorage.getItem('curator_profile')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchingProfileFor = useRef<string | null>(null)

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    if (fetchingProfileFor.current === userId) {
      return null
    }

    fetchingProfileFor.current = userId
    
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
            
            localStorage.setItem('curator_profile', JSON.stringify(newProfile))
            return newProfile as Profile
          }
        }
        return null
      }

      localStorage.setItem('curator_profile', JSON.stringify(data))
      return data as Profile
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
      const p = await fetchProfile(user.id)
      setProfile(p)
    }
  }, [user, fetchProfile])

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    async function initialize() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // If we already have a cached profile for this user, we can stop loading now
          if (profile && profile.id === session.user.id) {
            setLoading(false)
            // Still refresh in background
            fetchProfile(session.user.id).then(p => {
              if (mounted && p) setProfile(p)
            })
          } else {
            const p = await fetchProfile(session.user.id)
            if (mounted) setProfile(p)
            if (mounted) setLoading(false)
          }
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('[Auth] Init error:', err)
        if (mounted) setLoading(false)
      }
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      setSession(session)
      const newUser = session?.user ?? null
      setUser(newUser)

      if (newUser) {
        // Only fetch if needed or if it's a sign-in event
        if (event === 'SIGNED_IN' || !profile || profile.id !== newUser.id) {
          const p = await fetchProfile(newUser.id)
          if (mounted) setProfile(p)
        }
      } else {
        if (mounted) setProfile(null)
        localStorage.removeItem('curator_profile')
      }
      
      if (mounted) setLoading(false)
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
