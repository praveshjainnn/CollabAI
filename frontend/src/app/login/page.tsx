'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [nextParam, setNextParam] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextParam(params.get('next'));
  }, []);

  const redirectTo = useMemo(() => {
    if (!nextParam) return '/dashboard';
    if (!nextParam.startsWith('/')) return '/dashboard';
    return nextParam;
  }, [nextParam]);

  const onSubmit = async (data: LoginFormValues) => {
    setApiError('');
    setLoading(true);
    try {
      await login(data.email, data.password);
      router.push(redirectTo);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      setApiError(apiErr?.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fcfdf9', color: '#0f172a', fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
      
      {/* subtle grid texture overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(227,249,136,0.18) 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }} />

      {/* background accent blur blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '40vw', height: '40vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(227,249,136,0.15) 0%, transparent 65%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '40vw', height: '40vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(227,249,136,0.12) 0%, transparent 65%)', filter: 'blur(60px)' }} />
      </div>

      <div className="w-full max-w-md" style={{ position: 'relative', zIndex: 1 }}>
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group" style={{ textDecoration: 'none' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #e3f988, #b5d926)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 14px rgba(227,249,136,0.5)' }}>
              <Sparkles className="text-slate-900" style={{ width: '17px', height: '17px' }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '22px', color: '#0f172a', letterSpacing: '-0.03em' }}>
              Collab<span style={{ color: '#799602' }}>AI</span>
            </span>
          </Link>
          <p style={{ color: '#64748b', marginTop: '8px', fontSize: '14px', fontWeight: 500 }}>Sign in to your workspace</p>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid rgba(227,249,136,0.3)',
          boxShadow: '0 10px 30px rgba(227,249,136,0.08), 0 1px 3px rgba(0,0,0,0.02)',
          padding: '2.5rem'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Welcome back</h1>

          {apiError && (
            <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-xl mb-5 border border-destructive/20 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Email Address</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: errors.email ? '1px solid #ef4444' : '1px solid rgba(227,249,136,0.4)',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontSize: '14px',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                className="focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 placeholder:text-slate-400"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Password</label>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    paddingRight: '44px',
                    borderRadius: '12px',
                    border: errors.password ? '1px solid #ef4444' : '1px solid rgba(227,249,136,0.4)',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '14px',
                    fontWeight: 500,
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  className="focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #e3f988, #b5d926)',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '14px',
                padding: '12px 16px',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 1px 0 1px rgba(227,249,136,0.25), 0 4px 14px rgba(227,249,136,0.25)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                marginTop: '1.5rem',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 1px 0 1px rgba(227,249,136,0.35), 0 6px 18px rgba(227,249,136,0.35)'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = '0 1px 0 1px rgba(227,249,136,0.25), 0 4px 14px rgba(227,249,136,0.25)'; }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '14px', color: '#64748b', marginTop: '1.75rem', fontWeight: 500 }}>
            Don&apos;t have an account?{' '}
            <Link
              href={nextParam ? `/register?next=${encodeURIComponent(nextParam)}` : '/register'}
              style={{ color: '#799602', fontWeight: 600, textDecoration: 'none' }}
              className="hover:underline"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
