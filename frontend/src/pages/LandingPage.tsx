import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────
   GLOBAL CSS (fonts + animations + cursor)
───────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');

  html { scroll-behavior: smooth; }
  body { cursor: none !important; overflow-x: hidden; }
  *, *::before, *::after { box-sizing: border-box; }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #25b317; border-radius: 4px; }

  /* ── Cursor ── */
  #lp-cursor {
    position: fixed; width: 12px; height: 12px;
    background: #25b317; border-radius: 50%;
    pointer-events: none; z-index: 9999;
    transform: translate(-50%,-50%);
    transition: width 0.2s, height 0.2s;
    mix-blend-mode: screen;
  }
  #lp-ring {
    position: fixed; width: 36px; height: 36px;
    border: 1px solid rgba(37,179,23,0.5); border-radius: 50%;
    pointer-events: none; z-index: 9998;
    transform: translate(-50%,-50%);
  }
  #lp-cursor.big  { width: 20px; height: 20px; }
  #lp-ring.big    { width: 54px; height: 54px; }

  /* ── Scroll progress ── */
  #scroll-bar {
    position: fixed; top: 0; left: 0; height: 2px;
    background: linear-gradient(90deg, #25b317, #5be146);
    z-index: 1000;
    box-shadow: 0 0 8px rgba(37,179,23,0.5);
    transition: width 0.1s;
  }

  /* ── Animations ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes float-card {
    0%,100% { transform: perspective(1000px) rotateY(-8deg) rotateX(3deg) translateY(0px); }
    50%      { transform: perspective(1000px) rotateY(-8deg) rotateX(3deg) translateY(-14px); }
  }
  @keyframes badge-float {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-8px); }
  }
  @keyframes glow-pulse {
    0%,100% { opacity: 0.35; transform: scale(1); }
    50%      { opacity: 0.65; transform: scale(1.08); }
  }
  @keyframes grid-drift {
    0%   { transform: translateY(0) rotate(0deg); }
    100% { transform: translateY(20px) rotate(0.5deg); }
  }
  @keyframes ticker-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes draw-line {
    to { stroke-dashoffset: 0; }
  }
  @keyframes candle-appear {
    from { transform: scaleY(0); }
    to   { transform: scaleY(1); }
  }
  @keyframes sparkle {
    0%   { opacity: 0; transform: scale(0) translateY(0); }
    50%  { opacity: 1; transform: scale(1) translateY(-20px); }
    100% { opacity: 0; transform: scale(0) translateY(-40px); }
  }
  @keyframes score-fill {
    from { width: 0%; }
  }
  @keyframes scan-line {
    0%   { top: -10%; }
    100% { top: 110%; }
  }
  @keyframes count-up { to { opacity: 1; } }

  .reveal {
    opacity: 0; transform: translateY(32px);
    transition: opacity 0.75s cubic-bezier(0.22,1,0.36,1), transform 0.75s cubic-bezier(0.22,1,0.36,1);
  }
  .reveal.visible { opacity: 1; transform: translateY(0); }
  .delay-1 { transition-delay: 0.1s; }
  .delay-2 { transition-delay: 0.2s; }
  .delay-3 { transition-delay: 0.3s; }
  .delay-4 { transition-delay: 0.4s; }
  .delay-5 { transition-delay: 0.5s; }

  .chart-path {
    stroke-dasharray: 2000;
    stroke-dashoffset: 2000;
    animation: draw-line 2.5s ease forwards 0.6s;
  }
  .candle { transform-origin: bottom center; animation: candle-appear 0.4s ease both; }
  .sparkle-el {
    position: absolute; width: 4px; height: 4px;
    border-radius: 50%; background: #25b317;
    animation: sparkle 3s ease-in-out infinite; opacity: 0;
  }
  .float-card { animation: float-card 6s ease-in-out infinite; }
  .float-badge-anim { animation: badge-float 5s ease-in-out infinite; }

  .shimmer-btn::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s;
  }
  .shimmer-btn:hover::before { transform: translateX(100%); }

  .ticker-wrap { overflow: hidden; position: relative; }
  .ticker-wrap::before, .ticker-wrap::after {
    content: ''; position: absolute; top: 0; bottom: 0; width: 80px; z-index: 2;
  }
  .ticker-wrap::before { left: 0; background: linear-gradient(90deg,#121212,transparent); }
  .ticker-wrap::after  { right:0; background: linear-gradient(-90deg,#121212,transparent); }
  .ticker-track { display: flex; gap: 48px; width: max-content; animation: ticker-scroll 30s linear infinite; }

  @media (max-width: 900px) {
    .hero-visual { display: none; }
    .nav-links-desktop { display: none !important; }
  }
`;

/* ─────────────────────────────────────────
   TICKER DATA
───────────────────────────────────────── */
const TICKER_ITEMS = [
  { sym: "BTC/USD", price: "$64,231.80", chg: "+2.45%", up: true },
  { sym: "ETH/USD", price: "$3,452.12", chg: "+4.12%", up: true },
  { sym: "XAU/USD", price: "$2,183.40", chg: "-0.32%", up: false },
  { sym: "S&P 500", price: "5,241.03", chg: "+0.88%", up: true },
  { sym: "NASDAQ", price: "18,432.11", chg: "+1.20%", up: true },
  { sym: "OIL/USD", price: "$78.34", chg: "-0.67%", up: false },
];

/* ─────────────────────────────────────────
   FEATURES DATA
───────────────────────────────────────── */
const FEATURES = [
  {
    icon: "🧠",
    title: "AI Trading Coach",
    desc: "Our AI analyzes every trade — win patterns, loss patterns, psychological tendencies, risk behavior — and delivers a personalized coaching report that makes you a better trader with every session.",
    tag: "Powered by Claude AI",
    featured: true,
  },
  {
    icon: "⚡",
    title: "Live Price Feeds",
    desc: "Real-time BTC, Gold, and market data streamed directly to your terminal. Never miss a move.",
    tag: "WebSocket · Sub-second",
    featured: false,
  },
  {
    icon: "📊",
    title: "Smart Alerts",
    desc: "Set price alerts with GTE/LTE conditions. Get notified the instant the market hits your target price.",
    tag: "Price Triggers",
    featured: false,
  },
  {
    icon: "🛡️",
    title: "Risk Management",
    desc: "SL/TP with live preview of risk/reward ratio, margin impact, and net profit calculations before you pull the trigger.",
    tag: "Pre-trade Simulation",
    featured: false,
  },
  {
    icon: "📖",
    title: "Trade Journals",
    desc: "Log every trade with entry/exit reasons, annotate with notes, and review your complete trading history.",
    tag: "Journaling System",
    featured: false,
  },
  {
    icon: "🔥",
    title: "Activity Heatmap",
    desc: "GitHub-style heatmap of your trading activity. Spot your most active days and correlate with PnL performance at a glance.",
    tag: "365-Day View",
    featured: false,
  },
  {
    icon: "💼",
    title: "Multi-Account",
    desc: "Manage multiple trading accounts from one dashboard. Switch between strategies without logging in and out.",
    tag: "Portfolio View",
    featured: false,
  },
  {
    icon: "📈",
    title: "Performance Overview",
    desc: "Win rate, total PnL, charges breakdown, and discipline score — your complete performance dashboard in one view.",
    tag: "Analytics Suite",
    featured: false,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create Account",
    desc: "Sign up with email or Google. No KYC, no friction — you're in the terminal within 60 seconds.",
  },
  {
    n: "02",
    title: "Fund Portfolio",
    desc: "Create a trading account with your starting balance. Manage multiple accounts for different strategies.",
  },
  {
    n: "03",
    title: "Execute Trades",
    desc: "Place market or limit orders on BTC and Gold with up to 200x leverage. Set SL/TP for automatic risk management.",
  },
  {
    n: "04",
    title: "AI Reviews You",
    desc: "After trading, run AI Feedback. Get a complete coaching report — your patterns, habits, strengths, and rules to follow.",
  },
];

const PLANS = [
  {
    name: "Basic",
    price: "Free",
    period: "forever",
    popular: false,
    features: [
      "3 trades per day",
      "1 journal entry per day",
      "1 trading account",
      "Live price feeds",
      "Basic analytics",
    ],
  },
  {
    name: "Pro",
    price: "₹999",
    period: "per month",
    popular: true,
    features: [
      "10 trades per day",
      "3 journal entries per day",
      "3 trading accounts",
      "AI coaching summary",
      "Price alerts",
      "Activity heatmap",
      "Full analytics suite",
    ],
  },
  {
    name: "Premium",
    price: "₹1,999",
    period: "per month",
    popular: false,
    features: [
      "Unlimited trades",
      "Unlimited journals",
      "Unlimited accounts",
      "Full AI feedback suite",
      "Priority support",
      "Early access features",
      "Institutional data feeds",
    ],
  },
];

const TESTIMONIALS = [
  {
    stars: 5,
    text: '"The AI coaching report is insane. It caught a pattern I had no idea about — I was always over-leveraging on Mondays. Fixed it and my win rate went from 41% to 58% in 3 weeks."',
    name: "Arjun Kapoor",
    role: "BTC Futures Trader · Mumbai",
    initials: "AK",
  },
  {
    stars: 5,
    text: '"Finally a terminal that doesn\'t look like it was built in 2009. The interface is clean, fast, and the heatmap feature helped me realize I trade best on Wednesdays."',
    name: "Priya Rajan",
    role: "Gold & Equity Trader · Bangalore",
    initials: "PR",
  },
  {
    stars: 5,
    text: '"The SL/TP preview with margin calculations is a game changer. I know exactly my risk before I place any trade. This is what retail traders needed for years."',
    name: "Siddharth Shah",
    role: "Crypto Day Trader · Pune",
    initials: "SS",
  },
];

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const mx = useRef(0);
  const my = useRef(0);
  const rx = useRef(0);
  const ry = useRef(0);
  const [navScrolled, setNavScrolled] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [activeTab, setActiveTab] = useState("1H");

  /* ── cursor + scroll ── */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.current = e.clientX;
      my.current = e.clientY;
      if (cursorRef.current) {
        cursorRef.current.style.left = mx.current + "px";
        cursorRef.current.style.top = my.current + "px";
      }
    };
    let raf: number;
    const animRing = () => {
      rx.current += (mx.current - rx.current) * 0.12;
      ry.current += (my.current - ry.current) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.left = rx.current + "px";
        ringRef.current.style.top = ry.current + "px";
      }
      raf = requestAnimationFrame(animRing);
    };
    animRing();
    document.addEventListener("mousemove", onMove);

    const onScroll = () => {
      setNavScrolled(window.scrollY > 40);
      const doc = document.documentElement;
      setScrollPct(
        (window.scrollY / (doc.scrollHeight - doc.clientHeight)) * 100,
      );
    };
    window.addEventListener("scroll", onScroll);
    return () => {
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* ── cursor hover enlarge ── */
  useEffect(() => {
    const hoverEls = document.querySelectorAll("button, a, .hover-cursor");
    const enlarge = () => {
      cursorRef.current?.classList.add("big");
      ringRef.current?.classList.add("big");
    };
    const shrink = () => {
      cursorRef.current?.classList.remove("big");
      ringRef.current?.classList.remove("big");
    };
    hoverEls.forEach((el) => {
      el.addEventListener("mouseenter", enlarge);
      el.addEventListener("mouseleave", shrink);
    });
    return () =>
      hoverEls.forEach((el) => {
        el.removeEventListener("mouseenter", enlarge);
        el.removeEventListener("mouseleave", shrink);
      });
  });

  /* ── reveal on scroll ── */
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });

  /* ── dashboard 3D tilt ── */
  const mockupRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const onVisualMove = (e: React.MouseEvent) => {
    if (!visualRef.current || !mockupRef.current) return;
    const r = visualRef.current.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) / r.width;
    const dy = (e.clientY - r.top - r.height / 2) / r.height;
    mockupRef.current.style.animation = "none";
    mockupRef.current.style.transform = `perspective(1000px) rotateY(${-8 + dx * 12}deg) rotateX(${3 - dy * 8}deg) translateY(-8px)`;
  };
  const onVisualLeave = () => {
    if (mockupRef.current) {
      mockupRef.current.style.transform = "";
      mockupRef.current.style.animation = "";
    }
  };

  const S = {
    page: {
      background: "#050505",
      color: "#e5e2e1",
      fontFamily: "'Manrope',sans-serif",
      minHeight: "100vh",
      overflowX: "hidden" as const,
    },
    green: { color: "#25b317" },
    mono: { fontFamily: "'JetBrains Mono',monospace" },
    syne: { fontFamily: "'Syne',sans-serif" },
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* Cursor */}
      <div id="lp-cursor" ref={cursorRef} />
      <div id="lp-ring" ref={ringRef} />

      {/* Scroll bar */}
      <div id="scroll-bar" style={{ width: scrollPct + "%" }} />

      <div style={S.page}>
        {/* ══════════ NAV ══════════ */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 500,
            padding: "0 40px",
            height: "68px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "background 0.4s, border-color 0.4s",
            backdropFilter: navScrolled ? "blur(20px)" : "none",
            background: navScrolled ? "rgba(5,5,5,0.92)" : "transparent",
            borderBottom: navScrolled
              ? "1px solid rgba(37,179,23,0.1)"
              : "1px solid transparent",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: "#25b317",
                borderRadius: "7px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: 900,
                color: "#023a00",
                boxShadow: "0 0 16px rgba(37,179,23,0.4)",
              }}
            >
              W
            </div>
            <span
              style={{
                ...S.syne,
                fontSize: "17px",
                fontWeight: 800,
                color: "#25b317",
                letterSpacing: "-0.3px",
              }}
            >
              WiseFox
            </span>
          </div>

          <div
            className="nav-links-desktop"
            style={{ display: "flex", gap: "32px" }}
          >
            {["Features", "Markets", "How It Works", "Pricing"].map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/\s+/g, "-")}`}
                style={{
                  ...S.mono,
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#879580",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e5e2e1")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#879580")}
              >
                {l}
              </a>
            ))}
          </div>

          <button
            onClick={() => navigate("/signup")}
            style={{
              fontFamily: "'Manrope',sans-serif",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "1px",
              textTransform: "uppercase",
              padding: "10px 22px",
              borderRadius: "7px",
              background: "#25b317",
              color: "#023a00",
              border: "none",
              cursor: "none",
              transition: "background 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#5be146";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 24px rgba(37,179,23,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#25b317";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            Start Trading →
          </button>
        </nav>

        {/* ══════════ HERO ══════════ */}
        <section
          id="features"
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            padding: "130px 40px 80px",
          }}
        >
          {/* BG Grid */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "linear-gradient(rgba(37,179,23,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(37,179,23,0.04) 1px,transparent 1px)",
              backgroundSize: "60px 60px",
              animation: "grid-drift 12s ease-in-out infinite alternate",
            }}
          />

          {/* Glows */}
          <div
            style={{
              position: "absolute",
              top: "-20%",
              left: "-10%",
              width: "700px",
              height: "700px",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse,rgba(37,179,23,0.08) 0%,transparent 65%)",
              animation: "glow-pulse 8s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-20%",
              right: "-10%",
              width: "600px",
              height: "600px",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse,rgba(37,179,23,0.06) 0%,transparent 65%)",
              animation: "glow-pulse 10s ease-in-out infinite 2s",
              pointerEvents: "none",
            }}
          />

          {/* Sparkles */}
          {[
            { l: "20%", t: "30%", d: "0s" },
            { l: "70%", t: "20%", d: "1s" },
            { l: "85%", t: "60%", d: "2s" },
            { l: "10%", t: "70%", d: "0.5s" },
          ].map((s, i) => (
            <div
              key={i}
              className="sparkle-el"
              style={{ left: s.l, top: s.t, animationDelay: s.d }}
            />
          ))}

          <div
            style={{
              position: "relative",
              zIndex: 1,
              maxWidth: "1100px",
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "60px",
              alignItems: "center",
            }}
          >
            {/* LEFT */}
            <div>
              <div
                className="reveal"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  background: "rgba(37,179,23,0.08)",
                  border: "1px solid rgba(37,179,23,0.2)",
                  ...S.mono,
                  fontSize: "10px",
                  color: "#25b317",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#25b317",
                    boxShadow: "0 0 0 0 rgba(37,179,23,0.6)",
                    animation: "glow-pulse 2s ease infinite",
                  }}
                />
                Institutional Grade Terminal
              </div>

              <h1
                className="reveal delay-1"
                style={{
                  ...S.syne,
                  fontSize: "clamp(42px,5vw,72px)",
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: "-2px",
                  marginBottom: "24px",
                }}
              >
                Trade Smarter
                <br />
                <span
                  style={{
                    background: "linear-gradient(135deg,#25b317,#5be146)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Not Harder
                </span>
              </h1>

              <p
                className="reveal delay-2"
                style={{
                  fontSize: "16px",
                  lineHeight: 1.7,
                  color: "#879580",
                  marginBottom: "36px",
                  maxWidth: "480px",
                }}
              >
                WiseFox is the elite trading terminal built for serious traders.
                Real-time prices, AI-powered insights, precision risk management
                — all in one obsidian interface.
              </p>

              <div
                className="reveal delay-3"
                style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}
              >
                <button
                  className="shimmer-btn"
                  onClick={() => navigate("/signup")}
                  style={{
                    fontFamily: "'Manrope',sans-serif",
                    fontSize: "13px",
                    fontWeight: 800,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                    padding: "14px 32px",
                    borderRadius: "9px",
                    background: "#25b317",
                    color: "#023a00",
                    border: "none",
                    cursor: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    position: "relative",
                    overflow: "hidden",
                    transition:
                      "background 0.2s, box-shadow 0.2s, transform 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.background = "#5be146";
                    b.style.boxShadow = "0 0 40px rgba(37,179,23,0.5)";
                    b.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.background = "#25b317";
                    b.style.boxShadow = "none";
                    b.style.transform = "none";
                  }}
                >
                  ⚡ Start Free Trial
                </button>
                <button
                  onClick={() => navigate("/signin")}
                  style={{
                    fontFamily: "'Manrope',sans-serif",
                    fontSize: "13px",
                    fontWeight: 700,
                    padding: "14px 28px",
                    borderRadius: "9px",
                    background: "transparent",
                    color: "#e5e2e1",
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.borderColor = "rgba(37,179,23,0.35)";
                    b.style.background = "rgba(37,179,23,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.borderColor = "rgba(255,255,255,0.1)";
                    b.style.background = "transparent";
                  }}
                >
                  Sign In →
                </button>
              </div>

              <div
                className="reveal delay-4"
                style={{
                  display: "flex",
                  gap: "28px",
                  marginTop: "48px",
                  paddingTop: "32px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {[
                  { val: "$2.4B+", lbl: "Volume Tracked" },
                  { val: "12K+", lbl: "Active Traders" },
                  { val: "99.9%", lbl: "Uptime" },
                ].map((s, i) => (
                  <div key={i}>
                    <div
                      style={{
                        ...S.syne,
                        fontSize: "28px",
                        fontWeight: 800,
                        color: "#25b317",
                        letterSpacing: "-1px",
                      }}
                    >
                      {s.val}
                    </div>
                    <div
                      style={{
                        ...S.mono,
                        fontSize: "10px",
                        color: "#3e4a39",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        marginTop: "2px",
                      }}
                    >
                      {s.lbl}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Dashboard mockup */}
            <div
              className="hero-visual reveal delay-2"
              ref={visualRef}
              style={{ position: "relative" }}
              onMouseMove={onVisualMove}
              onMouseLeave={onVisualLeave}
            >
              {/* Float badge top */}
              <div
                className="float-badge-anim"
                style={{
                  position: "absolute",
                  top: "-24px",
                  right: "20px",
                  zIndex: 10,
                  background: "linear-gradient(180deg,#1a1a1a,#121212)",
                  border: "1px solid rgba(37,179,23,0.2)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                }}
              >
                <div
                  style={{
                    ...S.mono,
                    fontSize: "9px",
                    color: "#3e4a39",
                    marginBottom: "3px",
                  }}
                >
                  BTC / USD
                </div>
                <div
                  style={{
                    ...S.mono,
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#25b317",
                  }}
                >
                  $64,231
                </div>
                <div style={{ ...S.mono, fontSize: "9px", color: "#25b317" }}>
                  +2.45% ↑
                </div>
              </div>

              {/* Main mockup */}
              <div
                ref={mockupRef}
                className="float-card"
                style={{
                  background: "linear-gradient(180deg,#141414,#0e0e0e)",
                  border: "1px solid rgba(37,179,23,0.15)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow:
                    "0 40px 80px rgba(0,0,0,0.8),0 0 60px rgba(37,179,23,0.06),inset 0 1px 0 rgba(255,255,255,0.04)",
                  cursor: "none",
                }}
              >
                {/* topbar */}
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#0e0e0e",
                    borderBottom: "1px solid #1c1b1b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", gap: "6px" }}>
                    {["#fc8181", "#fbbf24", "#25b317"].map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: c,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ ...S.mono, fontSize: "9px", color: "#3e4a39" }}>
                    WiseFox Terminal — Portfolio
                  </div>
                  <div style={{ ...S.mono, fontSize: "9px", color: "#25b317" }}>
                    ● LIVE
                  </div>
                </div>

                {/* body */}
                <div
                  style={{
                    padding: "14px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  {[
                    {
                      label: "Total Balance",
                      val: "$128,450",
                      color: "#25b317",
                    },
                    { label: "Today PnL", val: "+$4,210", color: "#25b317" },
                  ].map((c, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#161616",
                        border: "1px solid rgba(37,179,23,0.08)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          ...S.mono,
                          fontSize: "8px",
                          color: "#3e4a39",
                          letterSpacing: "0.8px",
                          textTransform: "uppercase",
                        }}
                      >
                        {c.label}
                      </div>
                      <div
                        style={{
                          ...S.mono,
                          fontSize: "16px",
                          fontWeight: 600,
                          color: c.color,
                          marginTop: "4px",
                        }}
                      >
                        {c.val}
                      </div>
                    </div>
                  ))}

                  {/* Chart */}
                  <div
                    style={{
                      gridColumn: "1/-1",
                      background: "#161616",
                      border: "1px solid rgba(37,179,23,0.08)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      height: "90px",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        ...S.mono,
                        fontSize: "8px",
                        color: "#3e4a39",
                        marginBottom: "6px",
                      }}
                    >
                      Portfolio Performance
                    </div>
                    <svg
                      width="100%"
                      height="60"
                      viewBox="0 0 300 60"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient
                          id="mockGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#25b317"
                            stopOpacity="0.3"
                          />
                          <stop
                            offset="100%"
                            stopColor="#25b317"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,50 Q30,35 60,38 T120,16 T180,24 T240,8 T300,4 V60 H0Z"
                        fill="url(#mockGrad)"
                      />
                      <path
                        className="chart-path"
                        d="M0,50 Q30,35 60,38 T120,16 T180,24 T240,8 T300,4"
                        fill="none"
                        stroke="#25b317"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Table */}
                  <div
                    style={{
                      gridColumn: "1/-1",
                      background: "#161616",
                      border: "1px solid rgba(37,179,23,0.06)",
                      borderRadius: "8px",
                      padding: "8px",
                    }}
                  >
                    {[
                      { sym: "BTC", p: "$64,231", chg: "+2.45%", up: true },
                      { sym: "ETH", p: "$3,452", chg: "+4.12%", up: true },
                      { sym: "XAU", p: "$2,183", chg: "-0.32%", up: false },
                    ].map((r, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 4px",
                          borderBottom: i < 2 ? "1px solid #1a1a1a" : "none",
                          ...S.mono,
                          fontSize: "9px",
                        }}
                      >
                        <span style={{ color: "#e5e2e1", fontWeight: 600 }}>
                          {r.sym}
                        </span>
                        <span style={{ color: "#879580" }}>{r.p}</span>
                        <span style={{ color: r.up ? "#25b317" : "#fc8181" }}>
                          {r.chg}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Float badge bottom */}
              <div
                className="float-badge-anim"
                style={{
                  animationDelay: "2s",
                  position: "absolute",
                  bottom: "-20px",
                  left: "-20px",
                  zIndex: 10,
                  background: "linear-gradient(180deg,#1a1a1a,#121212)",
                  border: "1px solid rgba(37,179,23,0.2)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                }}
              >
                <div
                  style={{
                    ...S.mono,
                    fontSize: "9px",
                    color: "#25b317",
                    marginBottom: "2px",
                  }}
                >
                  ✓ Trade Executed
                </div>
                <div style={{ ...S.mono, fontSize: "11px", color: "#e5e2e1" }}>
                  LONG BTC · 25x
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ TICKER ══════════ */}
        <div
          className="ticker-wrap"
          style={{
            background: "#121212",
            borderTop: "1px solid #1c1b1b",
            borderBottom: "1px solid #1c1b1b",
            padding: "12px 0",
          }}
        >
          <div className="ticker-track">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  ...S.mono,
                  fontSize: "11px",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: "#e5e2e1", fontWeight: 600 }}>
                  {t.sym}
                </span>
                <span style={{ color: "#879580" }}>{t.price}</span>
                <span style={{ color: t.up ? "#25b317" : "#fc8181" }}>
                  {t.chg}
                </span>
                <span style={{ color: "#1c1b1b", marginLeft: "16px" }}>|</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ FEATURES ══════════ */}
        <section style={{ padding: "100px 40px", background: "#050505" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <SectionTag>Platform Features</SectionTag>
            <h2
              className="reveal delay-1"
              style={{
                ...S.syne,
                fontSize: "clamp(32px,4vw,54px)",
                fontWeight: 800,
                letterSpacing: "-1.5px",
                lineHeight: 1.1,
                marginBottom: "16px",
              }}
            >
              Everything You Need
              <br />
              to Trade at the <span style={S.green}>Edge</span>
            </h2>
            <p
              className="reveal delay-2"
              style={{
                fontSize: "16px",
                color: "#879580",
                lineHeight: 1.7,
                maxWidth: "560px",
                marginBottom: "60px",
              }}
            >
              From precision order execution to AI-driven coaching — WiseFox
              packs institutional-grade tools into an interface that feels
              native.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: "20px",
              }}
            >
              {FEATURES.map((f, i) => (
                <div
                  key={i}
                  className={`reveal delay-${(i % 3) + 1} hover-cursor`}
                  style={{
                    gridColumn: f.featured ? "span 2" : "span 1",
                    background: f.featured
                      ? "linear-gradient(135deg,rgba(37,179,23,0.04) 0%,#0e0e0e 60%)"
                      : "linear-gradient(180deg,#121212,#0e0e0e)",
                    border: `1px solid ${f.featured ? "rgba(37,179,23,0.15)" : "rgba(37,179,23,0.08)"}`,
                    borderRadius: "14px",
                    padding: "28px 24px",
                    position: "relative",
                    overflow: "hidden",
                    transition:
                      "border-color 0.3s,transform 0.3s,box-shadow 0.3s",
                    cursor: "none",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = "rgba(37,179,23,0.3)";
                    el.style.transform = "translateY(-4px)";
                    el.style.boxShadow =
                      "0 16px 48px rgba(0,0,0,0.5),0 0 30px rgba(37,179,23,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = f.featured
                      ? "rgba(37,179,23,0.15)"
                      : "rgba(37,179,23,0.08)";
                    el.style.transform = "none";
                    el.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "10px",
                      background: "rgba(37,179,23,0.08)",
                      border: "1px solid rgba(37,179,23,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      marginBottom: "18px",
                    }}
                  >
                    {f.icon}
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      marginBottom: "10px",
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {f.title}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#879580",
                      lineHeight: 1.7,
                      marginBottom: "14px",
                    }}
                  >
                    {f.desc}
                  </div>
                  <span
                    style={{
                      ...S.mono,
                      fontSize: "9px",
                      color: "#25b317",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      background: "rgba(37,179,23,0.06)",
                      border: "1px solid rgba(37,179,23,0.15)",
                      padding: "3px 9px",
                      borderRadius: "4px",
                    }}
                  >
                    {f.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ CHART / MARKETS SECTION ══════════ */}
        <section
          id="markets"
          style={{
            padding: "100px 40px",
            background: "linear-gradient(180deg,#050505,#080808)",
          }}
        >
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <SectionTag>Live Markets</SectionTag>
            <h2
              className="reveal delay-1"
              style={{
                ...S.syne,
                fontSize: "clamp(32px,4vw,54px)",
                fontWeight: 800,
                letterSpacing: "-1.5px",
                lineHeight: 1.1,
                marginBottom: "60px",
              }}
            >
              Watch the Market
              <br />
              <span style={S.green}>Move in Real Time</span>
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.4fr",
                gap: "60px",
                alignItems: "center",
              }}
            >
              {/* Chart Panel */}
              <div
                className="reveal delay-1"
                style={{
                  background: "linear-gradient(180deg,#121212,#0e0e0e)",
                  border: "1px solid rgba(37,179,23,0.12)",
                  borderRadius: "16px",
                  padding: "20px",
                  boxShadow:
                    "0 24px 60px rgba(0,0,0,0.6),0 0 40px rgba(37,179,23,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <div
                      style={{ ...S.syne, fontSize: "18px", fontWeight: 800 }}
                    >
                      BTC / USD
                    </div>
                    <div
                      style={{
                        ...S.mono,
                        fontSize: "24px",
                        fontWeight: 600,
                        color: "#25b317",
                      }}
                    >
                      $64,231.80
                    </div>
                    <div
                      style={{ ...S.mono, fontSize: "11px", color: "#25b317" }}
                    >
                      ▲ +2.45% today
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {["1H", "4H", "1D", "1W"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        style={{
                          ...S.mono,
                          fontSize: "10px",
                          padding: "5px 10px",
                          borderRadius: "5px",
                          border: "1px solid transparent",
                          cursor: "none",
                          color: activeTab === t ? "#25b317" : "#879580",
                          background:
                            activeTab === t
                              ? "rgba(37,179,23,0.1)"
                              : "transparent",
                          borderColor:
                            activeTab === t
                              ? "rgba(37,179,23,0.25)"
                              : "transparent",
                          transition: "all 0.2s",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG Candlestick Chart */}
                <div style={{ height: "200px", position: "relative" }}>
                  <svg width="100%" height="200" viewBox="0 0 500 200">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#25b317"
                          stopOpacity="0.2"
                        />
                        <stop
                          offset="100%"
                          stopColor="#25b317"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    {/* Grid */}
                    {[50, 100, 150].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="500"
                        y2={y}
                        stroke="rgba(255,255,255,0.04)"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Area */}
                    <path
                      d="M0,160 Q50,130 80,120 T160,80 T220,90 T280,60 T340,50 T400,30 T460,20 T500,15 V200 H0Z"
                      fill="url(#areaGrad)"
                    />
                    {/* Line */}
                    <path
                      className="chart-path"
                      d="M0,160 Q50,130 80,120 T160,80 T220,90 T280,60 T340,50 T400,30 T460,20 T500,15"
                      fill="none"
                      stroke="#25b317"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Candles */}
                    {[
                      [20, 140, 25, false],
                      [50, 125, 20, false],
                      [80, 110, 18, true],
                      [110, 85, 22, false],
                      [140, 75, 16, false],
                      [170, 88, 14, true],
                      [200, 60, 25, false],
                      [230, 50, 20, false],
                      [260, 55, 12, true],
                      [290, 38, 22, false],
                      [320, 28, 18, false],
                      [350, 32, 10, true],
                      [380, 18, 20, false],
                      [410, 12, 15, false],
                      [440, 10, 14, false],
                      [470, 8, 10, false],
                    ].map(([x, y, h, red], i) => (
                      <rect
                        key={i}
                        className="candle"
                        x={typeof x === "number" ? x : 0}
                        y={typeof y === "number" ? y : 0}
                        width={10}
                        height={typeof h === "number" ? h : 0}
                        rx={1}
                        fill={
                          red ? "rgba(252,129,129,0.7)" : "rgba(37,179,23,0.8)"
                        }
                        style={{
                          animationDelay: `${0.1 + i * 0.05}s`,
                        }}
                      />
                    ))}
                    {/* Price labels */}
                    {[
                      ["$66k", 48],
                      ["$64k", 98],
                      ["$62k", 148],
                    ].map(([label, y], i) => (
                      <text
                        key={i}
                        x="5"
                        y={y as number}
                        fill="rgba(135,149,128,0.6)"
                        fontFamily="JetBrains Mono"
                        fontSize="9"
                      >
                        {label}
                      </text>
                    ))}
                    {/* Current price line */}
                    <line
                      x1="0"
                      y1="15"
                      x2="490"
                      y2="15"
                      stroke="rgba(37,179,23,0.3)"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                    <rect
                      x="458"
                      y="7"
                      width="42"
                      height="16"
                      rx="3"
                      fill="rgba(37,179,23,0.85)"
                    />
                    <text
                      x="462"
                      y="18"
                      fill="#023a00"
                      fontFamily="JetBrains Mono"
                      fontSize="9"
                      fontWeight="600"
                    >
                      64,231
                    </text>
                  </svg>
                </div>
              </div>

              {/* Info cards */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div className="reveal">
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#879580",
                      marginBottom: "6px",
                    }}
                  >
                    Pair your charts with
                  </div>
                  <h3
                    style={{
                      ...S.syne,
                      fontSize: "28px",
                      fontWeight: 800,
                      letterSpacing: "-0.8px",
                      marginBottom: "8px",
                    }}
                  >
                    Real-time Risk
                    <br />
                    Calculations
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#879580",
                      lineHeight: 1.7,
                    }}
                  >
                    Every trade previews your margin required, potential profit,
                    potential loss, and net result — before you confirm.
                  </p>
                </div>
                {[
                  {
                    label: "24H Volume",
                    val: "$38.2B",
                    color: "#25b317",
                    icon: "📊",
                  },
                  {
                    label: "Open Interest",
                    val: "$12.8B",
                    color: "#fbbf24",
                    icon: "🔓",
                  },
                  {
                    label: "Fear & Greed",
                    val: "72 — Greed",
                    color: "#25b317",
                    icon: "🧠",
                  },
                  {
                    label: "BTC Dominance",
                    val: "52.4%",
                    color: "#e5e2e1",
                    icon: "₿",
                  },
                ].map((c, i) => (
                  <div
                    key={i}
                    className={`reveal delay-${i + 1} hover-cursor`}
                    style={{
                      background: "linear-gradient(180deg,#121212,#0e0e0e)",
                      border: "1px solid rgba(37,179,23,0.08)",
                      borderRadius: "12px",
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "border-color 0.2s,transform 0.2s",
                      cursor: "none",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = "rgba(37,179,23,0.22)";
                      el.style.transform = "translateX(4px)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = "rgba(37,179,23,0.08)";
                      el.style.transform = "none";
                    }}
                  >
                    <div>
                      <div
                        style={{
                          ...S.mono,
                          fontSize: "10px",
                          color: "#3e4a39",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          marginBottom: "4px",
                        }}
                      >
                        {c.label}
                      </div>
                      <div
                        style={{
                          ...S.mono,
                          fontSize: "18px",
                          fontWeight: 600,
                          color: c.color,
                        }}
                      >
                        {c.val}
                      </div>
                    </div>
                    <div style={{ fontSize: "24px" }}>{c.icon}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ HOW IT WORKS ══════════ */}
        <section
          id="how-it-works"
          style={{ padding: "100px 40px", background: "#050505" }}
        >
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <SectionTag>Process</SectionTag>
            <h2
              className="reveal delay-1"
              style={{
                ...S.syne,
                fontSize: "clamp(32px,4vw,54px)",
                fontWeight: 800,
                letterSpacing: "-1.5px",
                lineHeight: 1.1,
                marginBottom: "60px",
              }}
            >
              From Sign Up to
              <br />
              <span style={S.green}>First Trade in Minutes</span>
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: "0",
                position: "relative",
              }}
            >
              {/* connector line */}
              <div
                style={{
                  position: "absolute",
                  top: "28px",
                  left: "12.5%",
                  right: "12.5%",
                  height: "1px",
                  background:
                    "linear-gradient(90deg,transparent,rgba(37,179,23,0.25),rgba(37,179,23,0.25),rgba(37,179,23,0.25),transparent)",
                }}
              />
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`reveal delay-${i + 1}`}
                  style={{ padding: "0 20px", textAlign: "center" }}
                >
                  <div
                    className="hover-cursor"
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: "rgba(37,179,23,0.08)",
                      border: "1px solid rgba(37,179,23,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      ...S.syne,
                      fontSize: "20px",
                      fontWeight: 800,
                      color: "#25b317",
                      margin: "0 auto 20px",
                      position: "relative",
                      zIndex: 1,
                      transition: "background 0.3s,box-shadow 0.3s",
                      cursor: "none",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.background = "rgba(37,179,23,0.18)";
                      el.style.boxShadow = "0 0 24px rgba(37,179,23,0.35)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.background = "rgba(37,179,23,0.08)";
                      el.style.boxShadow = "none";
                    }}
                  >
                    {s.n}
                  </div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      marginBottom: "10px",
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#879580",
                      lineHeight: 1.65,
                    }}
                  >
                    {s.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ PRICING ══════════ */}
        <section
          id="pricing"
          style={{
            padding: "100px 40px",
            background: "linear-gradient(180deg,#050505,#080808)",
          }}
        >
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <SectionTag>Pricing</SectionTag>
            <h2
              className="reveal delay-1"
              style={{
                ...S.syne,
                fontSize: "clamp(32px,4vw,54px)",
                fontWeight: 800,
                letterSpacing: "-1.5px",
                lineHeight: 1.1,
                marginBottom: "16px",
              }}
            >
              Simple Plans for
              <br />
              <span style={S.green}>Every Trader</span>
            </h2>
            <p
              className="reveal delay-2"
              style={{
                fontSize: "16px",
                color: "#879580",
                lineHeight: 1.7,
                maxWidth: "500px",
                marginBottom: "60px",
              }}
            >
              Start free. Scale when you're ready. No hidden fees, no
              commissions.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: "20px",
              }}
            >
              {PLANS.map((plan, i) => (
                <div
                  key={i}
                  className={`reveal delay-${i + 1} hover-cursor`}
                  style={{
                    background: plan.popular
                      ? "linear-gradient(180deg,rgba(37,179,23,0.05),#0e0e0e)"
                      : "linear-gradient(180deg,#121212,#0e0e0e)",
                    border: `1px solid ${plan.popular ? "rgba(37,179,23,0.3)" : "rgba(37,179,23,0.08)"}`,
                    borderRadius: "16px",
                    padding: "32px 28px",
                    position: "relative",
                    overflow: "hidden",
                    transition: "transform 0.3s,box-shadow 0.3s",
                    cursor: "none",
                    boxShadow: plan.popular
                      ? "0 0 60px rgba(37,179,23,0.07)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(-6px)";
                    if (plan.popular)
                      el.style.boxShadow =
                        "0 24px 60px rgba(0,0,0,0.6),0 0 60px rgba(37,179,23,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "none";
                    if (plan.popular)
                      el.style.boxShadow = "0 0 60px rgba(37,179,23,0.07)";
                  }}
                >
                  {plan.popular && (
                    <div
                      style={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        ...S.mono,
                        fontSize: "9px",
                        background: "#25b317",
                        color: "#023a00",
                        padding: "4px 10px",
                        borderRadius: "4px",
                        letterSpacing: "1px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      Most Popular
                    </div>
                  )}

                  <div
                    style={{
                      ...S.syne,
                      fontSize: "22px",
                      fontWeight: 800,
                      marginBottom: "4px",
                    }}
                  >
                    {plan.name}
                  </div>
                  <div
                    style={{
                      ...S.mono,
                      fontSize: "36px",
                      fontWeight: 600,
                      color: "#25b317",
                      letterSpacing: "-1px",
                      margin: "16px 0 4px",
                    }}
                  >
                    {plan.price}
                  </div>
                  <div
                    style={{ ...S.mono, fontSize: "11px", color: "#3e4a39" }}
                  >
                    {plan.period}
                  </div>
                  <div
                    style={{
                      height: "1px",
                      background: "#1c1b1b",
                      margin: "20px 0",
                    }}
                  />

                  <ul
                    style={{
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      marginBottom: "28px",
                    }}
                  >
                    {plan.features.map((f, j) => (
                      <li
                        key={j}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          fontSize: "13px",
                          color: "#879580",
                        }}
                      >
                        <div
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "#25b317",
                            flexShrink: 0,
                          }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() =>
                      navigate(plan.name === "Basic" ? "/signup" : "/signup")
                    }
                    style={{
                      width: "100%",
                      padding: "13px",
                      borderRadius: "9px",
                      fontFamily: "'Manrope',sans-serif",
                      fontSize: "12px",
                      fontWeight: 800,
                      letterSpacing: "0.8px",
                      textTransform: "uppercase",
                      cursor: "none",
                      border: plan.popular
                        ? "none"
                        : "1px solid rgba(255,255,255,0.06)",
                      background: plan.popular ? "#25b317" : "#1c1b1b",
                      color: plan.popular ? "#023a00" : "#879580",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      const b = e.currentTarget as HTMLButtonElement;
                      if (plan.popular) {
                        b.style.background = "#5be146";
                        b.style.boxShadow = "0 0 30px rgba(37,179,23,0.4)";
                      } else {
                        b.style.borderColor = "rgba(37,179,23,0.3)";
                        b.style.color = "#e5e2e1";
                      }
                    }}
                    onMouseLeave={(e) => {
                      const b = e.currentTarget as HTMLButtonElement;
                      if (plan.popular) {
                        b.style.background = "#25b317";
                        b.style.boxShadow = "none";
                      } else {
                        b.style.borderColor = "rgba(255,255,255,0.06)";
                        b.style.color = "#879580";
                      }
                    }}
                  >
                    {plan.popular
                      ? "Upgrade to Pro"
                      : plan.name === "Premium"
                        ? "Go Premium"
                        : "Get Started"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ TESTIMONIALS ══════════ */}
        <section style={{ padding: "100px 40px", background: "#050505" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <SectionTag>Testimonials</SectionTag>
            <h2
              className="reveal delay-1"
              style={{
                ...S.syne,
                fontSize: "clamp(32px,4vw,54px)",
                fontWeight: 800,
                letterSpacing: "-1.5px",
                lineHeight: 1.1,
                marginBottom: "60px",
              }}
            >
              Traders Who <span style={S.green}>Love</span> WiseFox
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: "20px",
              }}
            >
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  className={`reveal delay-${i + 1} hover-cursor`}
                  style={{
                    background: "linear-gradient(180deg,#121212,#0e0e0e)",
                    border: "1px solid rgba(37,179,23,0.07)",
                    borderRadius: "14px",
                    padding: "24px",
                    transition: "border-color 0.3s,transform 0.3s",
                    cursor: "none",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = "rgba(37,179,23,0.2)";
                    el.style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = "rgba(37,179,23,0.07)";
                    el.style.transform = "none";
                  }}
                >
                  <div
                    style={{
                      color: "#fbbf24",
                      fontSize: "12px",
                      letterSpacing: "2px",
                      marginBottom: "14px",
                    }}
                  >
                    {"★".repeat(t.stars)}
                  </div>
                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.75,
                      color: "#879580",
                      marginBottom: "20px",
                      fontStyle: "italic",
                    }}
                  >
                    {t.text}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#25b317",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "13px",
                        color: "#023a00",
                        flexShrink: 0,
                      }}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700 }}>
                        {t.name}
                      </div>
                      <div
                        style={{
                          ...S.mono,
                          fontSize: "10px",
                          color: "#3e4a39",
                          marginTop: "2px",
                        }}
                      >
                        {t.role}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ CTA ══════════ */}
        <section
          style={{
            padding: "120px 40px",
            background: "linear-gradient(180deg,#050505,#030303)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: "800px",
              height: "400px",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse,rgba(37,179,23,0.07) 0%,transparent 70%)",
              pointerEvents: "none",
              animation: "glow-pulse 8s ease-in-out infinite",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <SectionTag center>Start Today</SectionTag>
            <h2
              className="reveal delay-1"
              style={{
                ...S.syne,
                fontSize: "clamp(36px,5vw,64px)",
                fontWeight: 800,
                letterSpacing: "-2px",
                lineHeight: 1.05,
                marginBottom: "20px",
              }}
            >
              Ready to Trade
              <br />
              <span style={S.green}>Like a Pro?</span>
            </h2>
            <p
              className="reveal delay-2"
              style={{
                fontSize: "16px",
                color: "#879580",
                marginBottom: "40px",
              }}
            >
              Join 12,000+ traders who upgraded their edge with WiseFox.
            </p>
            <div
              className="reveal delay-3"
              style={{
                display: "flex",
                gap: "14px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                className="shimmer-btn"
                onClick={() => navigate("/signup")}
                style={{
                  fontFamily: "'Manrope',sans-serif",
                  fontSize: "13px",
                  fontWeight: 800,
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                  padding: "16px 36px",
                  borderRadius: "9px",
                  background: "#25b317",
                  color: "#023a00",
                  border: "none",
                  cursor: "none",
                  position: "relative",
                  overflow: "hidden",
                  transition: "background 0.2s,box-shadow 0.2s,transform 0.15s",
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = "#5be146";
                  b.style.boxShadow = "0 0 40px rgba(37,179,23,0.5)";
                  b.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = "#25b317";
                  b.style.boxShadow = "none";
                  b.style.transform = "none";
                }}
              >
                ⚡ Start Free — No Card Required
              </button>
              <button
                onClick={() => navigate("/signin")}
                style={{
                  fontFamily: "'Manrope',sans-serif",
                  fontSize: "13px",
                  fontWeight: 700,
                  padding: "16px 32px",
                  borderRadius: "9px",
                  background: "transparent",
                  color: "#e5e2e1",
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "none",
                  transition: "border-color 0.2s,background 0.2s",
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.borderColor = "rgba(37,179,23,0.35)";
                  b.style.background = "rgba(37,179,23,0.04)";
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.borderColor = "rgba(255,255,255,0.1)";
                  b.style.background = "transparent";
                }}
              >
                Sign In →
              </button>
            </div>
            <div
              className="reveal delay-4"
              style={{
                marginTop: "24px",
                ...S.mono,
                fontSize: "10px",
                color: "#3e4a39",
                letterSpacing: "1px",
              }}
            >
              FREE PLAN AVAILABLE · CANCEL ANYTIME · INSTANT SETUP
            </div>
          </div>
        </section>

        {/* ══════════ FOOTER ══════════ */}
        <footer
          style={{
            background: "#0e0e0e",
            borderTop: "1px solid #1c1b1b",
            padding: "48px 40px 32px",
          }}
        >
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "40px",
                flexWrap: "wrap",
                marginBottom: "40px",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      background: "#25b317",
                      borderRadius: "7px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "15px",
                      fontWeight: 900,
                      color: "#023a00",
                    }}
                  >
                    W
                  </div>
                  <span
                    style={{
                      ...S.syne,
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "#25b317",
                    }}
                  >
                    WiseFox
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#3e4a39",
                    maxWidth: "260px",
                    lineHeight: 1.6,
                  }}
                >
                  Institutional-grade trading terminal for the modern trader.
                  Built with precision, designed for performance.
                </p>
              </div>

              {[
                {
                  title: "Platform",
                  links: [
                    "Terminal",
                    "Portfolio",
                    "Analytics",
                    "AI Coaching",
                    "Journals",
                  ],
                },
                {
                  title: "Company",
                  links: ["About", "Pricing", "Blog", "Careers", "Contact"],
                },
                {
                  title: "Legal",
                  links: [
                    "Privacy Policy",
                    "Terms of Service",
                    "Risk Disclaimer",
                    "Cookie Policy",
                  ],
                },
              ].map((col, i) => (
                <div key={i}>
                  <h4
                    style={{
                      ...S.mono,
                      fontSize: "10px",
                      color: "#3e4a39",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      marginBottom: "14px",
                    }}
                  >
                    {col.title}
                  </h4>
                  <ul
                    style={{
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "9px",
                    }}
                  >
                    {col.links.map((l) => (
                      <li key={l}>
                        <a
                          href="#"
                          style={{
                            fontSize: "13px",
                            color: "#879580",
                            transition: "color 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "#25b317")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "#879580")
                          }
                        >
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div
              style={{
                borderTop: "1px solid #1c1b1b",
                paddingTop: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ ...S.mono, fontSize: "10px", color: "#3e4a39" }}>
                © 2025 WiseFox Technologies. All rights reserved.
              </div>
              <div style={{ ...S.mono, fontSize: "10px", color: "#3e4a39" }}>
                Trading involves risk. Past performance does not guarantee
                future results.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   SECTION TAG HELPER
───────────────────────────────────────── */
function SectionTag({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div
      className="reveal"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: "10px",
        color: "#25b317",
        letterSpacing: "2px",
        textTransform: "uppercase",
        marginBottom: "16px",
        justifyContent: center ? "center" : "flex-start",
        width: center ? "100%" : "auto",
      }}
    >
      {!center && (
        <div style={{ width: "20px", height: "1px", background: "#25b317" }} />
      )}
      {children}
      {center && (
        <div style={{ width: "20px", height: "1px", background: "#25b317" }} />
      )}
    </div>
  );
}
