export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL?.trim() &&
      import.meta.env.VITE_SUPABASE_ANON_KEY?.trim(),
  )
}

export function getAllowedEmail(): string | null {
  const email = import.meta.env.VITE_ALLOWED_EMAIL?.trim().toLowerCase()
  return email || null
}

export function isEmailAllowed(email: string): boolean {
  const allowed = getAllowedEmail()
  if (!allowed) return true
  return email.trim().toLowerCase() === allowed
}
