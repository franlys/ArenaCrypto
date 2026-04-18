-- Migration: Fix infinite recursion in profiles RLS
-- Project: ArenaCrypto

-- 1. Create a secure, non-recursive function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER   -- Bypasses RLS to avoid infinite recursion
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 2. Grant execution
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

-- 3. Drop the infinitely recursive policy
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

-- 4. Recreate the policy cleanly using the SECURITY DEFINER function
CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.is_admin() OR auth.uid() = id
);
