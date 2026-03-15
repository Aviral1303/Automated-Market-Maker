import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Scroll reveal hook ──────────────────────────────────────────────────────

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.unobserve(el); } },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, className = '', as: Tag = 'div', ...props }) {
  const ref = useReveal();
  return <Tag ref={ref} className={`reveal ${className}`} {...props}>{children}</Tag>;
}

// ─── Glow card mouse tracking ────────────────────────────────────────────────

function GlowCard({ children, className = '', ...props }) {
  const ref = useRef(null);
  const handleMouse = useCallback((e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    ref.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    ref.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);
  return (
    <div ref={ref} onMouseMove={handleMouse} className={`glow-card ${className}`} {...props}>
      {children}
    </div>
  );
}

// ─── Animated bonding curve (hero visual) ────────────────────────────────────

function BondingCurveHero() {
  const canvasRef = useRef(null);
  const animRef = useRef(0);
  const pointRef = useRef({ t: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const pt = pointRef.current;
      pt.t += 0.003;

      const k = 10000;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const scale = Math.min(w, h) * 0.0035;

      // Draw grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5;
      const gridStep = 40;
      for (let x = gridStep; x < w; x += gridStep) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = gridStep; y < h; y += gridStep) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Draw curve x*y=k
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 200; i++) {
        const xVal = 10 + i * 1.8;
        const yVal = k / xVal;
        const px = cx - 100 * scale + xVal * scale;
        const py = cy + 100 * scale - yVal * scale;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Animated point on curve
      const phase = Math.sin(pt.t) * 0.35 + 0.5;
      const xPos = 30 + phase * 300;
      const yPos = k / xPos;
      const dotX = cx - 100 * scale + xPos * scale;
      const dotY = cy + 100 * scale - yPos * scale;

      // Glow
      const grd = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 30);
      grd.addColorStop(0, 'rgba(255,255,255,0.15)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(dotX - 30, dotY - 30, 60, 60);

      // Crosshairs
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(dotX, 0); ctx.lineTo(dotX, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, dotY); ctx.lineTo(w, dotY); ctx.stroke();
      ctx.setLineDash([]);

      // Dot
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Label
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(`(${xPos.toFixed(0)}, ${yPos.toFixed(0)})`, dotX + 8, dotY - 8);

      // k constant label
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(`k = ${k.toLocaleString()}`, 16, h - 16);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}

// ─── Animated counter ────────────────────────────────────────────────────────

function Counter({ end, suffix = '', duration = 1600 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{value}{suffix}</span>;
}

// ─── Formula typewriter ──────────────────────────────────────────────────────

const FORMULAS = [
  'x \u00b7 y = k',
  '\u0394y = y \u00b7 \u0394x / (x + \u0394x)',
  'IL = 2\u221ar / (1+r) \u2212 1',
  'MEV = back_run_out \u2212 front_run_in',
  'P = reserve_B / reserve_A',
  'fee_APR = fees / TVL \u00b7 365',
];

function FormulaTypewriter() {
  const [formulaIdx, setFormulaIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const formula = FORMULAS[formulaIdx];
    if (!deleting && charIdx < formula.length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), 50 + Math.random() * 30);
      return () => clearTimeout(t);
    }
    if (!deleting && charIdx === formula.length) {
      const t = setTimeout(() => setDeleting(true), 2200);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx > 0) {
      const t = setTimeout(() => setCharIdx(c => c - 1), 25);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) {
      setDeleting(false);
      setFormulaIdx(i => (i + 1) % FORMULAS.length);
    }
  }, [charIdx, deleting, formulaIdx]);

  return (
    <span className="font-mono text-white/30 text-sm md:text-base">
      {FORMULAS[formulaIdx].slice(0, charIdx)}
      <span className="inline-block w-[2px] h-4 bg-white/40 ml-0.5 align-middle" style={{ animation: 'cursorBlink 1s step-end infinite' }} />
    </span>
  );
}

// ─── Architecture diagram ────────────────────────────────────────────────────

const ARCH_LAYERS = [
  {
    label: 'Smart Contracts',
    sublabel: 'Solidity / EVM',
    items: ['AMMFactory', 'AMM Pool', 'ERC-20 Tokens', 'Flash Loans'],
    color: 'rgba(255,255,255,0.08)',
  },
  {
    label: 'Backend Services',
    sublabel: 'Node.js / Express',
    items: ['REST API', 'WebSocket', 'Rate Limiter', 'Market Data'],
    color: 'rgba(255,255,255,0.06)',
  },
  {
    label: 'Research Engine',
    sublabel: 'Python / FastAPI',
    items: ['AMM Models', 'Agent Simulation', 'Arbitrage Detection', 'MEV Analysis'],
    color: 'rgba(255,255,255,0.04)',
  },
  {
    label: 'Frontend',
    sublabel: 'React / Vite',
    items: ['Research Dashboard', 'Bonding Curves', 'On-Chain Swap', 'Analytics'],
    color: 'rgba(255,255,255,0.02)',
  },
];

// ─── Tech stack items ────────────────────────────────────────────────────────

const TECH_STACK = [
  { name: 'Solidity', category: 'Smart Contracts' },
  { name: 'Hardhat', category: 'Smart Contracts' },
  { name: 'ethers.js', category: 'Blockchain' },
  { name: 'Node.js', category: 'Backend' },
  { name: 'Express', category: 'Backend' },
  { name: 'WebSocket', category: 'Backend' },
  { name: 'Python', category: 'Research' },
  { name: 'FastAPI', category: 'Research' },
  { name: 'NumPy', category: 'Research' },
  { name: 'React', category: 'Frontend' },
  { name: 'Vite', category: 'Frontend' },
  { name: 'Tailwind', category: 'Frontend' },
  { name: 'Recharts', category: 'Frontend' },
];

// ─── Research chart mockups ──────────────────────────────────────────────────

function MiniChart({ type, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    if (type === 'price-impact') {
      // Price impact curve (exponential)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 100; i++) {
        const x = (i / 100) * w;
        const y = h - (Math.pow(i / 100, 2.2) * h * 0.85 + h * 0.05);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Fill under
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, 'rgba(255,255,255,0.06)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.fill();
    }

    if (type === 'il-curve') {
      // Impermanent loss (concave down)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(248,113,113,0.5)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 100; i++) {
        const ratio = 0.1 + (i / 100) * 4.9;
        const sqrtR = Math.sqrt(ratio);
        const il = (2 * sqrtR / (1 + ratio) - 1) * 100;
        const x = (i / 100) * w;
        const y = h * 0.15 - (il / 30) * h * 0.7;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Zero line
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, h * 0.15); ctx.lineTo(w, h * 0.15); ctx.stroke();
    }

    if (type === 'depth') {
      // Liquidity depth (symmetric around center)
      const mid = w / 2;
      ctx.strokeStyle = 'rgba(74,222,128,0.4)';
      ctx.lineWidth = 1.5;
      // Bid side
      ctx.beginPath();
      for (let i = 0; i <= 50; i++) {
        const x = mid - (i / 50) * mid;
        const depth = Math.pow(i / 50, 0.6) * h * 0.7;
        const y = h - depth - h * 0.1;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Ask side
      ctx.strokeStyle = 'rgba(248,113,113,0.4)';
      ctx.beginPath();
      for (let i = 0; i <= 50; i++) {
        const x = mid + (i / 50) * mid;
        const depth = Math.pow(i / 50, 0.6) * h * 0.7;
        const y = h - depth - h * 0.1;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Center line
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(mid, 0); ctx.lineTo(mid, h); ctx.stroke();
      ctx.setLineDash([]);
    }

    if (type === 'arb-spread') {
      // Two oscillating price lines
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const x = (i / 100) * w;
        const y = h * 0.5 + Math.sin(i * 0.08) * h * 0.15 + Math.sin(i * 0.03) * h * 0.1;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const x = (i / 100) * w;
        const y = h * 0.5 + Math.sin(i * 0.08 + 0.4) * h * 0.12 + Math.sin(i * 0.03 + 0.2) * h * 0.08;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, [type]);

  return <canvas ref={canvasRef} className={`w-full h-full block ${className}`} />;
}

// ─── Main landing component ──────────────────────────────────────────────────

export function Landing() {
  const navigate = useNavigate();
  const [chainLive, setChainLive] = useState(null);
  const [blockNum, setBlockNum] = useState(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    fetch('https://ethereum-sepolia-rpc.publicnode.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
    })
      .then(r => r.json())
      .then(d => { setChainLive(true); setBlockNum(parseInt(d.result, 16)); })
      .catch(() => setChainLive(false));
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navOpacity = Math.min(scrollY / 100, 1);

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Sticky nav ────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: `rgba(0,0,0,${0.5 + navOpacity * 0.4})`,
          backdropFilter: navOpacity > 0.1 ? 'blur(12px)' : 'none',
          borderBottom: `1px solid rgba(255,255,255,${navOpacity * 0.06})`,
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md border border-white/15 flex items-center justify-center bg-white/5">
              <span className="text-white font-bold text-[11px]">L</span>
            </div>
            <span className="font-semibold text-[13px] text-white tracking-tight">LiquidityLab</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[12px] text-white/40">
            <a href="#overview" className="hover:text-white transition-colors duration-200">Overview</a>
            <a href="#capabilities" className="hover:text-white transition-colors duration-200">Capabilities</a>
            <a href="#architecture" className="hover:text-white transition-colors duration-200">Architecture</a>
            <a href="#research" className="hover:text-white transition-colors duration-200">Research</a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/Aviral1303/liquidity-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
              GitHub
            </a>
            <button
              onClick={() => navigate('/app')}
              className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-white text-black hover:bg-white/90 transition-colors"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero section ──────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background grid with parallax */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transform: `translateY(${scrollY * 0.15}px)` }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
              `,
              backgroundSize: '80px 80px',
              animation: 'gridPulse 8s ease-in-out infinite',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black" />
        </div>

        {/* Subtle radial glow behind hero */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: text content */}
            <div>
              {/* Chain status pill */}
              <div className={`landing-fade-in-up landing-delay-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-mono mb-8 ${
                chainLive === true
                  ? 'border-success/30 bg-success/5 text-success/80'
                  : chainLive === false
                  ? 'border-danger/30 bg-danger/5 text-danger/80'
                  : 'border-white/10 bg-white/3 text-white/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${chainLive === true ? 'bg-success live-dot' : chainLive === false ? 'bg-danger' : 'bg-white/20'}`} />
                {chainLive === true
                  ? `Live on Sepolia \u00b7 Block #${blockNum?.toLocaleString() ?? '...'}`
                  : chainLive === false
                  ? 'Chain unreachable'
                  : 'Checking chain...'}
              </div>

              <h1 className="landing-fade-in-up landing-delay-2">
                <span className="block text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.95] gradient-text">
                  LiquidityLab
                </span>
                <span className="block text-lg md:text-xl font-medium text-white/30 mt-4 tracking-tight">
                  AMM Research Platform
                </span>
              </h1>

              <p className="landing-fade-in-up landing-delay-3 text-white/40 text-[15px] md:text-base leading-relaxed mt-6 max-w-lg">
                A quantitative research platform for analyzing automated market makers,
                liquidity dynamics, arbitrage opportunities, and MEV behavior in
                decentralized markets. Built with deployed Solidity contracts on Ethereum Sepolia.
              </p>

              {/* Formula typewriter */}
              <div className="landing-fade-in-up landing-delay-4 mt-6 h-6">
                <FormulaTypewriter />
              </div>

              {/* CTA buttons */}
              <div className="landing-fade-in-up landing-delay-5 flex items-center gap-3 mt-10">
                <button
                  onClick={() => navigate('/app')}
                  className="group relative px-7 py-3 rounded-xl font-medium text-[13px] bg-white text-black hover:bg-white/90 transition-all duration-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                >
                  View Dashboard
                  <span className="inline-block ml-1.5 transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
                </button>
                <a
                  href="https://github.com/Aviral1303/liquidity-lab"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group px-7 py-3 rounded-xl font-medium text-[13px] border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-all duration-200"
                >
                  View Source
                  <span className="inline-block ml-1.5 transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
                </a>
              </div>
            </div>

            {/* Right: animated bonding curve */}
            <div className="landing-fade-in-scale landing-delay-4 hidden lg:block">
              <div className="relative border-gradient rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <div className="absolute inset-0 bg-surface/80 rounded-2xl" />
                <div className="relative w-full h-full">
                  <BondingCurveHero />
                </div>
                {/* Floating label */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Constant Product Curve</span>
                </div>
                <div className="absolute bottom-4 right-4">
                  <span className="text-[10px] font-mono text-white/20">x &middot; y = k</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="landing-fade-in-up landing-delay-7 mt-24">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
              {[
                { value: 6, suffix: '', label: 'Smart Contracts', sub: 'Deployed on Sepolia' },
                { value: 3, suffix: '', label: 'AMM Models', sub: 'CP, StableSwap, Balancer' },
                { value: 30, suffix: 'bps', label: 'Swap Fee', sub: 'Per transaction' },
                { value: 2800, suffix: '+', label: 'Lines of Code', sub: 'Python research engine' },
              ].map(({ value, suffix, label, sub }) => (
                <div key={label} className="bg-black px-6 py-6 text-center">
                  <p className="font-mono font-bold text-2xl text-white">
                    <Counter end={value} suffix={suffix} />
                  </p>
                  <p className="text-[11px] text-white/50 mt-1 font-medium">{label}</p>
                  <p className="text-[10px] text-white/20 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 landing-fade-in-up landing-delay-8">
          <span className="text-[10px] text-white/20 uppercase tracking-widest">Scroll</span>
          <div className="w-[1px] h-8 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </section>

      {/* ── Product overview ──────────────────────────────────────────────── */}
      <section id="overview" className="relative py-32 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <Reveal>
                <p className="text-[11px] text-white/30 uppercase tracking-[0.2em] font-medium mb-4">Platform</p>
              </Reveal>
              <Reveal>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                  Study market microstructure
                  <span className="text-white/30"> at the protocol level</span>
                </h2>
              </Reveal>
              <Reveal>
                <p className="text-white/40 text-[14px] leading-relaxed mt-6">
                  LiquidityLab connects deployed Solidity smart contracts with a Python-powered
                  research engine. Run agent-based simulations against real AMM models,
                  detect arbitrage opportunities, quantify MEV extraction, and visualize
                  impermanent loss dynamics — all from a single interface.
                </p>
              </Reveal>
              <Reveal>
                <div className="mt-8 space-y-4">
                  {[
                    { title: 'Live Chain Reads', desc: 'On-chain reserves from Sepolia via public RPC. No API key required.' },
                    { title: 'Python Research Engine', desc: '3 AMM models, agent-based simulation, Monte Carlo analysis via FastAPI.' },
                    { title: 'Real Market Data', desc: 'Binance OHLCV feeds for historical replay and backtesting.' },
                  ].map(({ title, desc }) => (
                    <div key={title} className="flex gap-3">
                      <div className="w-1 bg-white/10 rounded-full shrink-0 mt-1" style={{ height: '32px' }} />
                      <div>
                        <p className="text-white text-[13px] font-medium">{title}</p>
                        <p className="text-white/30 text-[12px] mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Code-like visual */}
            <Reveal>
              <div className="border border-white/[0.06] rounded-2xl bg-surface/60 overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06]">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <span className="ml-3 text-[10px] text-white/20 font-mono">simulation.py</span>
                </div>
                <div className="p-5 font-mono text-[11px] leading-relaxed">
                  <p className="text-white/20"><span className="text-white/40">from</span> core.constant_product <span className="text-white/40">import</span> ConstantProductAMM</p>
                  <p className="text-white/20"><span className="text-white/40">from</span> simulation.engine <span className="text-white/40">import</span> SimulationEngine</p>
                  <p className="text-white/20"><span className="text-white/40">from</span> simulation.agents <span className="text-white/40">import</span> ArbitrageurAgent, RetailTrader</p>
                  <p className="text-white/10 mt-3"># Initialize pool with 100K reserves</p>
                  <p className="text-white/30">amm = ConstantProductAMM(<span className="text-white/50">100_000</span>, <span className="text-white/50">100_000</span>, fee_bps=<span className="text-white/50">30</span>)</p>
                  <p className="text-white/10 mt-3"># Run 200-step agent simulation</p>
                  <p className="text-white/30">engine = SimulationEngine(pool, agents=[</p>
                  <p className="text-white/30 pl-4">RetailTrader(<span className="text-white/50">"retail_0"</span>),</p>
                  <p className="text-white/30 pl-4">ArbitrageurAgent(<span className="text-white/50">"arb_0"</span>),</p>
                  <p className="text-white/30">])</p>
                  <p className="text-white/30 mt-1">results = engine.run(steps=<span className="text-white/50">200</span>, volatility=<span className="text-white/50">0.02</span>)</p>
                  <p className="text-white/10 mt-3"># Analyze: volume, fees, IL, arb opportunities</p>
                  <p className="text-white/30">print(f<span className="text-white/50">"Volume: {'{'}results.total_volume:.2f{'}'}"</span>)</p>
                  <p className="text-white/30">print(f<span className="text-white/50">"Fees:   {'{'}results.total_fees:.4f{'}'}"</span>)</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Divider line */}
      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-white/[0.06]" /></div>

      {/* ── Key capabilities ──────────────────────────────────────────────── */}
      <section id="capabilities" className="relative py-32">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-[11px] text-white/30 uppercase tracking-[0.2em] font-medium mb-4">Capabilities</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Built for quantitative research
              </h2>
              <p className="text-white/30 text-[14px] mt-4 max-w-lg mx-auto">
                Every component is designed for studying AMM mechanics, from constant product invariants to MEV extraction dynamics.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {[
              {
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
                title: 'AMM Simulation Engine',
                desc: 'Run multi-step agent-based simulations across Constant Product, StableSwap, and Balancer models with configurable volatility and agent behavior.',
              },
              {
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
                title: 'Arbitrage Detection',
                desc: 'Compare AMM spot prices against CEX reference prices. Calculate optimal trade sizes and expected profit in basis points.',
              },
              {
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                title: 'MEV Sandwich Simulation',
                desc: 'Step-by-step sandwich attack simulation: front-run, victim execution, and back-run. Quantify MEV extracted and victim slippage degradation.',
              },
              {
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
                title: 'Model Comparison',
                desc: 'Head-to-head comparison of AMM models under identical GBM price paths. Evaluate volume, fees, and impermanent loss for each model.',
              },
              {
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
                title: 'Live On-Chain Data',
                desc: 'Read reserves directly from 6 deployed Sepolia contracts. No wallet needed — public RPC with automatic failover across multiple endpoints.',
              },
              {
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
                title: 'On-Chain Execution',
                desc: 'Connect MetaMask and execute real swaps with slippage protection against swapWithProtection() on deployed EVM contracts.',
              },
            ].map(({ icon, title, desc }) => (
              <GlowCard key={title} className="reveal border border-white/[0.06] rounded-xl bg-surface/40 p-6 hover:border-white/[0.12] transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl border border-white/[0.08] flex items-center justify-center text-white/30 group-hover:text-white/60 group-hover:border-white/15 transition-all duration-300 mb-5">
                  {icon}
                </div>
                <h3 className="font-semibold text-white text-[14px] mb-2">{title}</h3>
                <p className="text-[12px] text-white/30 leading-relaxed">{desc}</p>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider */}
      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-white/[0.06]" /></div>

      {/* ── Architecture ──────────────────────────────────────────────────── */}
      <section id="architecture" className="relative py-32">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-[11px] text-white/30 uppercase tracking-[0.2em] font-medium mb-4">System Design</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Multi-layer architecture
              </h2>
              <p className="text-white/30 text-[14px] mt-4 max-w-lg mx-auto">
                From EVM smart contracts to a Python research engine, every layer is purpose-built.
              </p>
            </div>
          </Reveal>

          <div className="max-w-3xl mx-auto space-y-3 stagger-children">
            {ARCH_LAYERS.map((layer, i) => (
              <Reveal key={layer.label}>
                <GlowCard className="border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.1] transition-all duration-300" style={{ backgroundColor: layer.color }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white text-[14px]">{layer.label}</h3>
                      <p className="text-[11px] text-white/25 font-mono mt-0.5">{layer.sublabel}</p>
                    </div>
                    <span className="text-[10px] font-mono text-white/15 bg-white/[0.03] px-2 py-0.5 rounded">Layer {i + 1}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {layer.items.map(item => (
                      <span key={item} className="text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.06] text-white/40 bg-white/[0.02]">
                        {item}
                      </span>
                    ))}
                  </div>
                </GlowCard>
              </Reveal>
            ))}
          </div>

          {/* Connection lines hint */}
          <Reveal>
            <div className="flex justify-center mt-6">
              <div className="flex items-center gap-2 text-[10px] text-white/15 font-mono">
                <span>Contracts</span>
                <span className="w-4 h-px bg-white/10" />
                <span>Node.js</span>
                <span className="w-4 h-px bg-white/10" />
                <span>FastAPI</span>
                <span className="w-4 h-px bg-white/10" />
                <span>React</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Divider */}
      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-white/[0.06]" /></div>

      {/* ── Research features ─────────────────────────────────────────────── */}
      <section id="research" className="relative py-32">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-[11px] text-white/30 uppercase tracking-[0.2em] font-medium mb-4">Analytics</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Research-grade visualizations
              </h2>
              <p className="text-white/30 text-[14px] mt-4 max-w-lg mx-auto">
                Quantitative charts for every aspect of AMM behavior. From impermanent loss curves to arbitrage spread tracking.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-4 stagger-children">
            {[
              { title: 'Price Impact Curve', sub: 'Non-linear slippage as trade size increases relative to pool depth', type: 'price-impact' },
              { title: 'Impermanent Loss', sub: 'IL curve across price ratios (0.1x to 5.0x) for constant product pools', type: 'il-curve' },
              { title: 'Liquidity Depth', sub: 'Bid/ask-side liquidity distribution around the current pool price', type: 'depth' },
              { title: 'Arbitrage Spread', sub: 'AMM vs CEX price divergence and convergence over time', type: 'arb-spread' },
            ].map(({ title, sub, type }) => (
              <Reveal key={title}>
                <GlowCard className="border border-white/[0.06] rounded-xl bg-surface/40 overflow-hidden hover:border-white/[0.1] transition-all duration-300 group">
                  <div className="p-5 pb-0">
                    <h3 className="text-[13px] font-semibold text-white">{title}</h3>
                    <p className="text-[11px] text-white/25 mt-1">{sub}</p>
                  </div>
                  <div className="h-32 mt-3 px-3 pb-3">
                    <MiniChart type={type} />
                  </div>
                </GlowCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider */}
      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-white/[0.06]" /></div>

      {/* ── Interactive visualization teaser ───────────────────────────────── */}
      <section className="relative py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal>
              <div className="border border-white/[0.06] rounded-2xl overflow-hidden bg-surface/40" style={{ aspectRatio: '3/2' }}>
                <div className="w-full h-full relative">
                  <BondingCurveHero />
                  <div className="absolute top-4 left-4">
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Live Curve</p>
                  </div>
                </div>
              </div>
            </Reveal>
            <div>
              <Reveal>
                <p className="text-[11px] text-white/30 uppercase tracking-[0.2em] font-medium mb-4">Visualization</p>
              </Reveal>
              <Reveal>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                  Watch the invariant
                  <span className="text-white/30"> in real time</span>
                </h2>
              </Reveal>
              <Reveal>
                <p className="text-white/40 text-[14px] leading-relaxed mt-6">
                  The interactive bonding curve visualizes how the constant product invariant
                  <span className="font-mono text-white/50 mx-1">x &middot; y = k</span>
                  constrains every trade. See how large swaps move the price point along
                  the hyperbola, and understand price impact geometrically.
                </p>
              </Reveal>
              <Reveal>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Formula', value: 'x \u00b7 y = k' },
                    { label: 'Fee Model', value: '30 bps' },
                    { label: 'Protection', value: 'Slippage + Deadline' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-3">
                      <p className="text-[10px] text-white/20 uppercase tracking-wider">{label}</p>
                      <p className="text-[12px] font-mono text-white/50 mt-1">{value}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Divider */}
      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-white/[0.06]" /></div>

      {/* ── Technology stack ───────────────────────────────────────────────── */}
      <section className="relative py-32">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-[11px] text-white/30 uppercase tracking-[0.2em] font-medium mb-4">Stack</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Purpose-built tools
              </h2>
            </div>
          </Reveal>

          <Reveal>
            <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
              {TECH_STACK.map(({ name, category }) => (
                <span
                  key={name}
                  className="group relative px-4 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[12px] text-white/40 font-mono hover:border-white/[0.15] hover:text-white/60 hover:bg-white/[0.04] transition-all duration-300 cursor-default"
                >
                  {name}
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-white/20 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {category}
                  </span>
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Divider */}
      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-white/[0.06]" /></div>

      {/* ── CTA section ───────────────────────────────────────────────────── */}
      <section className="relative py-32">
        <div className="max-w-6xl mx-auto px-6 text-center">
          {/* Subtle radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.02) 0%, transparent 70%)' }}
          />

          <Reveal>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text leading-tight">
              Explore LiquidityLab
            </h2>
          </Reveal>
          <Reveal>
            <p className="text-white/30 text-[15px] mt-6 max-w-md mx-auto leading-relaxed">
              Open the research dashboard to run simulations, analyze on-chain data,
              and study AMM mechanics firsthand.
            </p>
          </Reveal>
          <Reveal>
            <div className="flex items-center justify-center gap-3 mt-10">
              <button
                onClick={() => navigate('/app')}
                className="group relative px-8 py-3.5 rounded-xl font-medium text-[14px] bg-white text-black hover:bg-white/90 transition-all duration-200 hover:shadow-[0_0_40px_rgba(255,255,255,0.12)]"
              >
                Launch Dashboard
                <span className="inline-block ml-1.5 transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
              </button>
              <a
                href="https://github.com/Aviral1303/liquidity-lab"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3.5 rounded-xl font-medium text-[14px] border border-white/10 text-white/40 hover:text-white hover:border-white/25 transition-all duration-200"
              >
                View Source Code
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center bg-white/[0.03]">
              <span className="text-white/50 font-bold text-[9px]">L</span>
            </div>
            <span className="text-[12px] text-white/25">LiquidityLab</span>
          </div>
          <p className="text-[11px] text-white/15 font-mono hidden sm:block">
            Quantitative AMM research platform
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Aviral1303/liquidity-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/20 hover:text-white/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
            </a>
            <a
              href="https://sepolia.etherscan.io/address/0xB138d15Dd1f372C9736af9Df885D40450f8F072d"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-white/15 hover:text-white/40 transition-colors font-mono"
            >
              Etherscan
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
