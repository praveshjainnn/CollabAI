'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Zap, Shield, ArrowRight, Sparkles, MousePointer2,
  GitBranch, Server, Clock, FileText, ArrowUpRight
} from 'lucide-react';

function GithubIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = end / 48;
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setCount(end); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 25);
        observer.disconnect();
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);
  return <span ref={ref}>{count}{suffix}</span>;
}

const features = [
  { icon: Zap,           title: 'CRDT Sync',         desc: 'Zero-conflict editing via Yjs binary state vectors — every keystroke is mathematically reconciled across all clients.', tag: 'Real-time' },
  { icon: MousePointer2, title: 'Live Cursors',       desc: 'See every teammate\'s named cursor and selection update at 60 fps with full awareness state broadcasting.', tag: 'Presence' },
  { icon: Sparkles,      title: 'AI Commands',        desc: 'Press / to invoke Groq and Gemini AI inline. Summarize, refine, or continue writing without leaving the editor.', tag: 'AI-Powered' },
  { icon: Clock,         title: 'Revision History',   desc: 'Every debounced save creates a versioned snapshot in Postgres. Restore any prior state with one click.', tag: 'Versioning' },
  { icon: Shield,        title: 'JWT Auth & RBAC',    desc: 'Cookie-based JWT sessions with Owner / Editor / Viewer roles. Granular access control per document.', tag: 'Security' },
  { icon: FileText,      title: 'Export & Share',     desc: 'Export to DOCX. Share via invite link with configurable role and expiry — full ownership controls.', tag: 'Collaboration' },
];

const techStack = [
  { label: 'Python',    sublabel: 'FastAPI Backend' },
  { label: 'pycrdt',   sublabel: 'Yjs CRDT Engine' },
  { label: 'Next.js 15', sublabel: 'React Frontend' },
  { label: 'Neon DB',  sublabel: 'Serverless Postgres' },
  { label: 'Groq',     sublabel: 'LLM Inference' },
  { label: 'Gemini',   sublabel: 'AI Assistance' },
];

/* ─── palette ────────────────────────────────────────────────── */
const C = {
  bg:        '#fcfdf9',   // very light lime-white
  surface:   '#ffffff',
  surfaceAlt:'#f4fbe2',   // hover state
  border:    'rgba(227, 249, 136, 0.3)',
  borderHov: 'rgba(227, 249, 136, 0.55)',
  text:      '#0f172a',
  textMid:   '#334155',
  textSub:   '#5c6b73',
  accent:    '#b5d926',
  accentLt:  '#e3f988',
  accentPale:'rgba(227, 249, 136, 0.15)',
  accentPale2:'rgba(227, 249, 136, 0.22)',
  tag:       'rgba(227, 249, 136, 0.18)',
  tagText:   '#799602',
  tagBorder: 'rgba(227, 249, 136, 0.4)',
};

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { if (!loading && isAuthenticated) router.push('/dashboard'); }, [isAuthenticated, loading, router]);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 36);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <div style={{ backgroundColor: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden', minHeight: '100vh' }}>

      {/* subtle grid texture overlay */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(227,249,136,0.18) 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }} />

      {/* accent blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-15%', right: '-5%', width: '55vw', height: '55vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(227,249,136,0.15) 0%, transparent 65%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '-8%', width: '45vw', height: '45vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 65%)', filter: 'blur(60px)' }} />
      </div>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        background: scrolled ? 'rgba(246,247,255,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'all 0.35s ease',
        padding: '0 2rem',
      }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '62px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px',
              background: 'linear-gradient(135deg, #e3f988, #b5d926)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 14px rgba(227,249,136,0.5)' }}>
              <Sparkles style={{ width: '15px', height: '15px', color: '#0f172a' }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '17px', color: C.text, letterSpacing: '-0.025em' }}>
              Collab<span style={{ color: C.accentLt }}>AI</span>
            </span>
          </Link>

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {[['#how','How It Works'],['#features','Features'],['#stack','Tech Stack']].map(([href,lbl]) => (
              <a key={href} href={href} style={{ color: C.textSub, fontSize: '13px', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e=>(e.currentTarget.style.color=C.text)}
                onMouseLeave={e=>(e.currentTarget.style.color=C.textSub)}>{lbl}</a>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/login" style={{ color: C.textSub, fontSize: '13px', fontWeight: 500, textDecoration: 'none', padding: '6px 12px' }}>Sign in</Link>
            <Link href="/register" style={{
              background: 'linear-gradient(135deg, #e3f988, #b5d926)',
              color: '#0f172a', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
              padding: '8px 18px', borderRadius: '8px',
              boxShadow: '0 1px 0 1px rgba(227,249,136,0.3), 0 4px 14px rgba(227,249,136,0.3)',
              display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 1px 0 1px rgba(227,249,136,0.4), 0 8px 24px rgba(227,249,136,0.4)';}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 0 1px rgba(227,249,136,0.3), 0 4px 14px rgba(227,249,136,0.3)';}}>
              Get Started <ArrowRight style={{ width: '12px', height: '12px' }} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '148px 2rem 96px', maxWidth: '1160px', margin: '0 auto' }}>
        {/* live badge */}
        <div style={{ marginBottom: '26px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: C.accentPale2, border: `1px solid ${C.tagBorder}`,
            padding: '5px 13px', borderRadius: '100px', fontSize: '11px',
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
            color: C.tagText, fontWeight: 600, letterSpacing: '0.06em',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e',
              display: 'inline-block', boxShadow: '0 0 0 2px rgba(34,197,94,0.25)', animation: 'blink 2s infinite' }} />
            v2.0 · Python FastAPI · pycrdt · Open Source
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          {/* Left */}
          <div>
            <h1 style={{ fontSize: 'clamp(38px,4.8vw,64px)', fontWeight: 900, lineHeight: 1.06,
              letterSpacing: '-0.04em', margin: '0 0 22px', color: C.text }}>
              Write together.<br />
              <span style={{ background: 'linear-gradient(135deg,#799602 0%,#b5d926 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Never conflict.
              </span>
            </h1>
            <p style={{ fontSize: '16.5px', color: C.textMid, lineHeight: 1.72, margin: '0 0 34px', maxWidth: '460px' }}>
              CollabAI is a real-time collaborative document editor powered by{' '}
              <strong style={{ color: C.accentLt }}>CRDT mathematics</strong>, a Python FastAPI backend,
              and inline AI assistance via Groq and Gemini.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link href="/register" style={{
                background: 'linear-gradient(135deg, #e3f988, #b5d926)',
                color: '#0f172a', fontWeight: 700, fontSize: '14.5px',
                padding: '13px 26px', borderRadius: '10px', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                boxShadow: '0 1px 0 1px rgba(227,249,136,0.3), 0 6px 24px rgba(227,249,136,0.3)',
                transition: 'all 0.18s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';}}>
                Start Writing <ArrowRight style={{ width: '15px', height: '15px' }} />
              </Link>
              <a href="https://github.com/praveshjainnn/CollabAI" target="_blank" rel="noopener noreferrer" style={{
                color: C.textMid, fontWeight: 600, fontSize: '14px',
                padding: '13px 22px', borderRadius: '10px', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                border: `1px solid ${C.border}`, background: C.surface,
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                transition: 'all 0.18s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderHov;e.currentTarget.style.color=C.accent;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMid;}}>
                <GithubIcon style={{ width: '15px', height: '15px' }} /> View Source
              </a>
            </div>
          </div>

          {/* Right — terminal card (stays dark for contrast) */}
          <div style={{
            background: '#0d1017',
            border: '1px solid rgba(227,249,136,0.35)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 2px 0 1px rgba(227,249,136,0.15), 0 24px 56px rgba(15,20,60,0.16)',
          }}>
            {/* window chrome */}
            <div style={{ background: 'rgba(227,249,136,0.12)', borderBottom: '1px solid rgba(227,249,136,0.25)',
              padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{ width:'10px',height:'10px',borderRadius:'50%',background:c }}/>)}
              </div>
              <span style={{ fontFamily:'monospace', fontSize:'11px', color:'#4b5563', marginLeft:'8px' }}>collab-engine.py · live</span>
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:'#22c55e', fontFamily:'monospace' }}>
                <div style={{ width:'6px',height:'6px',borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 6px #22c55e' }}/>
                2 users syncing
              </div>
            </div>
            {/* code */}
            <div style={{ padding:'20px', fontFamily:"'JetBrains Mono','Fira Code',monospace", fontSize:'12px', lineHeight:'1.9', color:'#e2e8f0' }}>
              <div><span style={{color:'#374151'}}>01</span>  <span style={{color:'#818cf8'}}>@websocket_server</span><span style={{color:'#94a3b8'}}>.on_connect</span></div>
              <div><span style={{color:'#374151'}}>02</span>  <span style={{color:'#f472b6'}}>async def</span> <span style={{color:'#4ade80'}}>handle_client</span><span style={{color:'#e2e8f0'}}>(scope, msg):</span></div>
              <div><span style={{color:'#374151'}}>03</span>    <span style={{color:'#fbbf24'}}>user</span> <span style={{color:'#94a3b8'}}>=</span> <span style={{color:'#94a3b8'}}>await</span> <span style={{color:'#4ade80'}}>verify_jwt_cookie</span><span style={{color:'#e2e8f0'}}>(scope)</span></div>
              <div><span style={{color:'#374151'}}>04</span>    <span style={{color:'#fbbf24'}}>room</span> <span style={{color:'#94a3b8'}}>=</span> <span style={{color:'#94a3b8'}}>await</span> <span style={{color:'#4ade80'}}>get_or_create_room</span><span style={{color:'#e2e8f0'}}>(doc_id)</span></div>
              <div><span style={{color:'#374151'}}>05</span>    <span style={{color:'#94a3b8'}}># Hydrate YDoc state from Postgres</span></div>
              <div><span style={{color:'#374151'}}>06</span>    <span style={{color:'#94a3b8'}}>await</span> <span style={{color:'#4ade80'}}>hydrate_from_db</span><span style={{color:'#e2e8f0'}}>(doc_id, room)</span></div>
              <div><span style={{color:'#374151'}}>07</span>    <span style={{color:'#94a3b8'}}>return</span> <span style={{color:'#f472b6'}}>False</span>  <span style={{color:'#1f2937'}}># accepted ✓</span></div>
            </div>
            <div style={{ borderTop:'1px solid rgba(227,249,136,0.15)', padding:'10px 16px', display:'flex', gap:'14px', fontSize:'11px', fontFamily:'monospace' }}>
              {[['pycrdt','#a5b4fc'],['asyncpg','#86efac'],['FastAPI','#fda4af']].map(([t,c])=>(
                <span key={t} style={{ color: c as string }}>● {t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS STRIP ───────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.surface, position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:'1160px', margin:'0 auto', padding:'0 2rem', display:'grid', gridTemplateColumns:'repeat(4,1fr)' }}>
          {[
            { value:99, suffix:'.9%',      label:'Sync Uptime' },
            { value:15, suffix:'ms',        label:'Avg Latency' },
            { value:0,  suffix:' Conflicts',label:'CRDT Guarantee' },
            { value:60, suffix:'fps',       label:'Cursor Updates' },
          ].map((m,i)=>(
            <div key={i} style={{ padding:'26px 20px', borderRight: i<3?`1px solid ${C.border}`:'none' }}>
              <div style={{ fontSize:'clamp(26px,2.8vw,38px)', fontWeight:900, color:C.accent,
                letterSpacing:'-0.03em', fontFamily:"'JetBrains Mono',monospace" }}>
                <AnimatedCounter end={m.value} suffix={m.suffix} />
              </div>
              <div style={{ fontSize:'10.5px', color:C.textSub, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', marginTop:'4px' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section id="how" style={{ position:'relative', zIndex:1, padding:'96px 2rem', maxWidth:'1160px', margin:'0 auto' }}>
        <div style={{ marginBottom:'52px' }}>
          <div style={{ fontSize:'11px', fontFamily:'monospace', color:C.accentLt, letterSpacing:'0.16em', textTransform:'uppercase', marginBottom:'10px' }}>// how it works</div>
          <h2 style={{ fontSize:'clamp(26px,3.2vw,42px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:0, maxWidth:'480px', lineHeight:1.15 }}>
            From keystroke to all screens in milliseconds
          </h2>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1px', background:C.border, borderRadius:'16px', overflow:'hidden', border:`1px solid ${C.border}` }}>
          {[
            { step:'01', title:'You Type', desc:'Tiptap captures your input and converts it into a Yjs CRDT operation — a compact binary delta describing exactly what changed, not the full document.' },
            { step:'02', title:'Python Syncs', desc:'pycrdt-websocket receives the delta, merges it into the server YDoc, and broadcasts it to every connected client. No coordination needed — math handles it.' },
            { step:'03', title:'Auto-Saved', desc:'After 2 seconds of inactivity the full document state is serialized and written to Neon Postgres as a versioned revision. Restores are instant.' },
          ].map(s=>(
            <div key={s.step} style={{ padding:'38px 30px', background:C.surface, transition:'background 0.2s' }}
              onMouseEnter={e=>(e.currentTarget.style.background=C.surfaceAlt)}
              onMouseLeave={e=>(e.currentTarget.style.background=C.surface)}>
              <div style={{ fontSize:'44px', fontWeight:900, fontFamily:'monospace', lineHeight:1, marginBottom:'18px',
                WebkitTextStroke:`1px rgba(181,217,38,0.45)`, color:'transparent' }}>{s.step}</div>
              <h3 style={{ fontSize:'17px', fontWeight:700, color:C.text, margin:'0 0 10px', letterSpacing:'-0.01em' }}>{s.title}</h3>
              <p style={{ fontSize:'13.5px', color:C.textSub, lineHeight:1.7, margin:0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES BENTO GRID ─────────────────────────────────── */}
      <section id="features" style={{ position:'relative', zIndex:1, padding:'0 2rem 96px', maxWidth:'1160px', margin:'0 auto' }}>
        <div style={{ marginBottom:'44px' }}>
          <div style={{ fontSize:'11px', fontFamily:'monospace', color:C.accentLt, letterSpacing:'0.16em', textTransform:'uppercase', marginBottom:'10px' }}>// capabilities</div>
          <h2 style={{ fontSize:'clamp(26px,3.2vw,42px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:0, lineHeight:1.15 }}>
            Everything built.<br />Nothing missing.
          </h2>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
          {features.map((f,i)=>(
            <div key={f.title}
              style={{
                padding:'28px', borderRadius:'14px',
                border:`1px solid ${C.border}`,
                background: C.surface,
                gridColumn: i===0?'span 2':'span 1',
                transition:'border-color 0.22s, background 0.22s, transform 0.18s, box-shadow 0.22s',
                cursor:'default',
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.borderHov; e.currentTarget.style.background=C.surfaceAlt; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(227,249,136,0.25)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.surface; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'; }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'18px' }}>
                <div style={{ width:'38px', height:'38px', borderRadius:'10px',
                  background:C.accentPale, border:`1px solid ${C.tagBorder}`,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <f.icon style={{ width:'17px', height:'17px', color:C.accentLt }} />
                </div>
                <span style={{ fontSize:'10px', fontWeight:700, fontFamily:'monospace',
                  color:C.tagText, background:C.tag, border:`1px solid ${C.tagBorder}`,
                  padding:'3px 9px', borderRadius:'100px', letterSpacing:'0.05em' }}>{f.tag}</span>
              </div>
              <h3 style={{ fontSize:'16px', fontWeight:700, color:C.text, margin:'0 0 8px', letterSpacing:'-0.01em' }}>{f.title}</h3>
              <p style={{ fontSize:'13.5px', color:C.textSub, lineHeight:1.65, margin:0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TECH STACK ──────────────────────────────────────────── */}
      <section id="stack" style={{ position:'relative', zIndex:1, borderTop:`1px solid ${C.border}`, background:C.surface, padding:'80px 2rem' }}>
        <div style={{ maxWidth:'1160px', margin:'0 auto' }}>
          <div style={{ marginBottom:'44px', display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'16px' }}>
            <div>
              <div style={{ fontSize:'11px', fontFamily:'monospace', color:C.accentLt, letterSpacing:'0.16em', textTransform:'uppercase', marginBottom:'10px' }}>// open source · built by pravesh</div>
              <h2 style={{ fontSize:'clamp(22px,2.8vw,36px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:0 }}>The full stack, no magic.</h2>
            </div>
            <a href="https://github.com/praveshjainnn/CollabAI" target="_blank" rel="noopener noreferrer" style={{
              display:'inline-flex', alignItems:'center', gap:'7px',
              background:C.accentPale, border:`1px solid ${C.tagBorder}`,
              color:C.accent, fontWeight:600, fontSize:'13px',
              padding:'9px 16px', borderRadius:'8px', textDecoration:'none',
              transition:'all 0.2s', fontFamily:'monospace',
            }}
              onMouseEnter={e=>{e.currentTarget.style.background=C.accentPale2;}}
              onMouseLeave={e=>{e.currentTarget.style.background=C.accentPale;}}>
              <GithubIcon style={{ width:'14px', height:'14px' }} />
              praveshjainnn/CollabAI
              <ArrowUpRight style={{ width:'12px', height:'12px' }} />
            </a>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1px', background:C.border, borderRadius:'14px', overflow:'hidden', border:`1px solid ${C.border}` }}>
            {techStack.map((t,i)=>(
              <div key={t.label} style={{ padding:'26px 22px', background:C.surface, borderBottom: i<3?`1px solid ${C.border}`:'none', transition:'background 0.18s' }}
                onMouseEnter={e=>(e.currentTarget.style.background=C.surfaceAlt)}
                onMouseLeave={e=>(e.currentTarget.style.background=C.surface)}>
                <div style={{ fontSize:'20px', fontWeight:800, color:C.accent, fontFamily:"'JetBrains Mono',monospace", letterSpacing:'-0.02em', marginBottom:'3px' }}>{t.label}</div>
                <div style={{ fontSize:'12px', color:C.textSub, fontWeight:500 }}>{t.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section style={{ position:'relative', zIndex:1, padding:'96px 2rem', textAlign:'center' }}>
        <div style={{ maxWidth:'600px', margin:'0 auto' }}>
          <div style={{ fontSize:'11px', fontFamily:'monospace', color:C.accentLt, letterSpacing:'0.16em', textTransform:'uppercase', marginBottom:'18px' }}>// get started</div>
          <h2 style={{ fontSize:'clamp(30px,3.8vw,52px)', fontWeight:900, color:C.text, letterSpacing:'-0.04em', lineHeight:1.1, margin:'0 0 18px' }}>
            Your documents.<br />
            <span style={{ background:'linear-gradient(135deg,#799602,#b5d926)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              Always in sync.
            </span>
          </h2>
          <p style={{ fontSize:'15px', color:C.textSub, lineHeight:1.72, margin:'0 0 38px' }}>
            Free. Open source. Built with Python, pycrdt, and a strong dislike for merge conflicts.
          </p>
          <div style={{ display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/register" style={{
              background:'linear-gradient(135deg,#e3f988,#b5d926)',
              color:'#0f172a', fontWeight:700, fontSize:'15px',
              padding:'14px 32px', borderRadius:'10px', textDecoration:'none',
              display:'inline-flex', alignItems:'center', gap:'7px',
              boxShadow:'0 1px 0 1px rgba(227,249,136,0.3), 0 6px 28px rgba(227,249,136,0.3)',
              transition:'all 0.18s',
            }}
              onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; }}>
              Create Free Account <ArrowRight style={{ width:'15px', height:'15px' }} />
            </Link>
            <Link href="/login" style={{
              color:C.textMid, fontWeight:600, fontSize:'15px',
              padding:'14px 26px', borderRadius:'10px', textDecoration:'none',
              border:`1px solid ${C.border}`, background:C.surface,
              display:'inline-flex', alignItems:'center',
              boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
              transition:'all 0.18s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderHov;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;}}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer style={{ borderTop:`1px solid ${C.border}`, background:C.surface, padding:'36px 2rem', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:'1160px', margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'9px' }}>
            <div style={{ width:'26px', height:'26px', borderRadius:'7px',
              background:'linear-gradient(135deg,#e3f988,#b5d926)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Sparkles style={{ width:'12px', height:'12px', color:'#0f172a' }} />
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:'14px', color:C.text }}>Collab<span style={{ color:C.accentLt }}>AI</span></div>
              <div style={{ fontSize:'11px', color:C.textSub, fontFamily:'monospace' }}>
                Built by{' '}
                <a href="https://github.com/praveshjainnn" target="_blank" rel="noopener noreferrer"
                  style={{ color:C.accent, textDecoration:'none' }}>@praveshjainnn</a>
                {' '}· v2.0.0 · Open Source
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'20px', alignItems:'center' }}>
            <a href="https://github.com/praveshjainnn/CollabAI" target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', gap:'5px', color:C.textSub, fontSize:'12px', textDecoration:'none', transition:'color 0.2s', fontWeight:500 }}
              onMouseEnter={e=>(e.currentTarget.style.color=C.accent)}
              onMouseLeave={e=>(e.currentTarget.style.color=C.textSub)}>
              <GithubIcon style={{ width:'13px', height:'13px' }} /> GitHub
            </a>
            <span style={{ color:C.border, fontSize:'12px' }}>MIT License</span>
            <span style={{ color:C.textSub, fontSize:'12px', fontFamily:'monospace' }}>Python 3.11+</span>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.35} }
        * { box-sizing: border-box; }
        @media (max-width: 900px) {
          nav > div > div:nth-child(2) { display: none; }
        }
        @media (max-width: 768px) {
          section > div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
