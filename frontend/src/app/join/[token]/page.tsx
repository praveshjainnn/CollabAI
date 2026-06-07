'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, FileText, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function JoinPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'accepting' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [docId, setDocId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      // Store the join token to redirect back after login if needed
      // For now, just send to login
      router.push(`/login?redirect=/join/${token}`);
      return;
    }

    const acceptInvite = async () => {
      setStatus('accepting');
      try {
        const { data } = await api.post(`/documents/share-links/${token}/accept`);
        setDocId(data.documentId);
        setStatus('success');
        
        // Redirect after a short delay to show success
        setTimeout(() => {
          router.push(`/document/${data.documentId}`);
        }, 1500);
      } catch (err: any) {
        console.error('Failed to accept invite', err);
        setError(err.response?.data?.error || 'This invitation link is invalid or has expired.');
        setStatus('error');
      }
    };

    void acceptInvite();
  }, [authLoading, isAuthenticated, router, token]);

  return (
    <div style={{
      backgroundColor: '#fcfdf9',
      color: '#0f172a',
      fontFamily: "'Inter', system-ui, sans-serif",
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* subtle lime dot-grid texture overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(227,249,136,0.18) 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }} />

      {/* background accent blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-10%', right: '-10%',
          width: '40vw', height: '40vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(227,249,136,0.15) 0%, transparent 65%)',
          filter: 'blur(50px)'
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-10%',
          width: '40vw', height: '40vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(227,249,136,0.12) 0%, transparent 65%)',
          filter: 'blur(60px)'
        }} />
      </div>

      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid rgba(227,249,136,0.3)',
        boxShadow: '0 10px 30px rgba(227,249,136,0.08), 0 1px 3px rgba(0,0,0,0.02)',
        position: 'relative',
        zIndex: 1
      }} className="p-8 w-full max-w-md text-center animate-fade-in">
        
        {/* Logo */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #e3f988, #b5d926)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 14px rgba(227,249,136,0.5)',
          margin: '0 auto 1.5rem'
        }}>
          <Sparkles className="text-slate-900 w-6 h-6" />
        </div>

        {/* Brand name */}
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontWeight: 800, fontSize: '22px', color: '#0f172a', letterSpacing: '-0.03em' }}>
            Collab<span style={{ color: '#799602' }}>AI</span>
          </span>
        </div>

        {(status === 'loading' || status === 'accepting') && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Joining Document...</h1>
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#799602' }} />
            </div>
            <p className="text-slate-400 text-sm font-semibold">Setting up your collaborative workspace</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Success!</h1>
            <p className="text-slate-400 font-semibold">You&apos;ve been added to the document. Redirecting you now...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Invitation Error</h1>
            <p className="text-slate-500 bg-slate-50 p-4 rounded-xl text-sm border border-slate-100 font-medium">
              {error}
            </p>
            <div className="pt-4">
              <Link
                href="/dashboard"
                style={{
                  background: 'linear-gradient(135deg, #e3f988, #b5d926)',
                  color: '#0f172a',
                  boxShadow: '0 1px 0 1px rgba(227,249,136,0.25), 0 4px 14px rgba(227,249,136,0.25)',
                  textDecoration: 'none',
                  display: 'inline-block',
                  padding: '10px 24px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
