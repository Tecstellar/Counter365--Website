import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Zap,
  Sparkles,
  Store,
  Tag,
  Laptop,
  ArrowRight,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Interactive Live Demo State
  const [quantities, setQuantities] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [shownTotal, setShownTotal] = useState<number>(0);
  const [receiptState, setReceiptState] = useState<'feed' | 'paid' | 'tear'>('feed');
  const [selectedLang, setSelectedLang] = useState<'English' | 'தமிழ்' | 'हिन्दी'>('English');
  const [selectedPlanModal, setSelectedPlanModal] = useState<{
    id: string;
    duration: string;
    sub: string;
    price: number;
    originalPrice?: number;
    offerPrice?: number;
    ratePerMonth: string;
    isPopular?: boolean;
    isBestValue?: boolean;
    features: string[];
  } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [policyModal, setPolicyModal] = useState<'privacy' | 'terms' | null>(null);

  const pricingPlans = [
    {
      id: '3_months',
      duration: '3 Months',
      sub: 'Quarterly Counter License',
      price: 2999,
      ratePerMonth: '₹999 / mo',
      features: [
        'Unlimited Cloud Billing & KOT',
        'Android Counter & Web App Sync',
        'Daily Register & Closing Reports',
        'WhatsApp Invoice Sharing',
        'Live Khata & Customer Ledger',
      ],
    },
    {
      id: '6_months',
      duration: '6 Months',
      sub: 'Semi-Annual Counter License',
      price: 5499,
      originalPrice: 5999,
      offerPrice: 5499,
      ratePerMonth: '₹916 / mo',
      isPopular: true,
      features: [
        'Everything in 3 Months Plan',
        'Priority 24/7 Counter Assistance',
        'Custom Thermal Receipt Templates',
        'Multi-Cashier & Staff Permissions',
        'Instant Low-Stock & Wastage Alerts',
      ],
    },
    {
      id: '12_months',
      duration: '12 Months',
      sub: 'Annual Business License',
      price: 9999,
      originalPrice: 11999,
      offerPrice: 9999,
      ratePerMonth: '₹833 / mo',
      isBestValue: true,
      features: [
        'Everything in 6 Months Plan',
        '1 Year Continuous Cloud Backup',
        'Dedicated Onboarding Account Manager',
        'VIP Thermal Hardware & Bluetooth Support',
        'Zero Transaction Limits or Restraints',
      ],
    },
  ];

  const demoItems = [
    { name: 'Super Tea Cut', price: 10, image: '/items/tea_cut.jpg' },
    { name: 'Super Tea Full', price: 20, image: '/items/tea_full.jpg' },
    { name: 'Kesar Tea', price: 40, image: '/items/kesar_tea.jpg' },
    { name: 'Hot Coffee', price: 30, image: '/items/coffee.jpg' },
    { name: 'Watermelon Juice', price: 35, image: '/items/watermelon.jpg' },
    { name: 'Pineapple Juice', price: 35, image: '/items/pineapple.jpg' },
  ];

  const formatRupee = (n: number) => '₹' + n.toLocaleString('en-IN');
  const qtyString = (n: number) => (n > 1 ? Math.floor(n / 2) : '') + (n % 2 ? '½' : '') || '0';

  const calculateTotal = (q: number[]) => {
    return q.reduce((sum, count, idx) => sum + (demoItems[idx].price * count) / 2, 0);
  };

  const handleAddItem = (index: number, halfUnits: number) => {
    setQuantities(prev => {
      const next = [...prev];
      next[index] += halfUnits;
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setQuantities(prev => {
      const next = [...prev];
      next[index] = next[index] === 1 ? 0 : Math.max(0, next[index] - 2);
      return next;
    });
  };

  // Smooth total number counter animation
  useEffect(() => {
    const target = calculateTotal(quantities);
    const start = shownTotal;
    const startTime = performance.now();
    const duration = 400;

    let animId: number;
    const animate = (t: number) => {
      const progress = Math.min(1, (t - startTime) / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      setShownTotal(Math.round(start + (target - start) * ease));
      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [quantities]);

  // Initial sequence demo
  useEffect(() => {
    const seq = [
      [0, 2],
      [2, 2],
      [4, 1],
      [3, 2],
      [1, 1],
    ];
    let k = 0;
    const timer = setInterval(() => {
      if (k < seq.length) {
        const [idx, units] = seq[k++];
        handleAddItem(idx, units);
      } else {
        clearInterval(timer);
      }
    }, 1200);

    return () => clearInterval(timer);
  }, []);

  const handlePrintDemo = () => {
    if (!quantities.some(q => q > 0)) return;
    setReceiptState('paid');
    setTimeout(() => setReceiptState('tear'), 900);
    setTimeout(() => {
      setQuantities([0, 0, 0, 0, 0, 0]);
      setReceiptState('feed');
    }, 1500);
  };

  // Flying particle helper
  const triggerFly = (btnElem: HTMLElement) => {
    const r = btnElem.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'fly';
    fly.textContent = '+';
    fly.style.left = `${r.left + r.width / 2}px`;
    fly.style.top = `${r.top + r.height / 2}px`;
    document.body.appendChild(fly);

    const totalEl = document.getElementById('tot');
    const tr = totalEl?.getBoundingClientRect() || { left: r.left, top: r.top };
    fly
      .animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)' },
          {
            transform: `translate(calc(-50% + ${tr.left + 30 - r.left}px), calc(-50% + ${tr.top - r.top}px)) scale(.4)`,
            opacity: 0.2,
          },
        ],
        { duration: 600, easing: 'cubic-bezier(.5,0,.2,1)' }
      )
      .onfinish = () => fly.remove();
  };

  // Scroll Progress and Interactive animations
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      const m = document.documentElement.scrollHeight - window.innerHeight;
      const pg = document.getElementById('pg');
      const bg = document.querySelector('.big') as HTMLElement;
      if (pg) pg.style.transform = `scaleX(${m > 0 ? y / m : 0})`;
      if (bg) bg.style.transform = `translateY(${y * 0.18}px)`;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Intersection Observer for scroll reveals & countups
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          e.target.classList.add('in');
          e.target.querySelectorAll('[data-n]').forEach(c => {
            const el = c as HTMLElement;
            const targetNum = Number(el.dataset.n);
            const t0 = performance.now();
            const step = (t: number) => {
              const p = Math.min(1, (t - t0) / 1400);
              el.textContent = String(Math.round(targetNum * (1 - Math.pow(1 - p, 3))));
              if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          });
        });
      },
      { threshold: 0.2 }
    );
    document.querySelectorAll('.rv').forEach(e => io.observe(e));

    // Mouse tilt on Bento Cards
    const cards = document.querySelectorAll('.bc');
    cards.forEach(c => {
      const card = c as HTMLElement;
      card.addEventListener('pointermove', (e: any) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${-y * 7}deg) rotateY(${x * 9}deg) translateY(-4px)`;
        card.style.setProperty('--x', e.clientX - r.left + 'px');
        card.style.setProperty('--y', e.clientY - r.top + 'px');
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });

    // Navigation Scroll Spy
    const ul = document.getElementById('menu');
    if (ul) {
      const ls = Array.from(ul.querySelectorAll('a'));
      const ids = ['top', 'why', 'features', 'who', 'pricing'];
      const put = (i: number) => {
        ls.forEach((a, j) => a.classList.toggle('on', j === i));
      };

      const spy = () => {
        let k = 0;
        ids.forEach((id, i) => {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top < window.innerHeight * 0.45) k = i;
        });
        put(k);
      };
      window.addEventListener('scroll', spy, { passive: true });
      put(0);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      io.disconnect();
    };
  }, []);

  // Handle Mobile Drawer scroll lock & keyboard dismissal
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth > 991) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileMenuOpen]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const languageReceiptData = {
    English: [
      ['Super Tea Full', '₹20'],
      ['Kesar Tea', '₹40'],
      ['Hot Coffee', '₹30'],
      'Total',
    ],
    தமிழ்: [
      ['சூப்பர் டீ (முழு)', '₹20'],
      ['குங்குமப்பூ டீ', '₹40'],
      ['சூடான காபி', '₹30'],
      'மொத்தம்',
    ],
    हिन्दी: [
      ['सुपर चाय (फुल)', '₹20'],
      ['केसर चाय', '₹40'],
      ['गरम कॉफी', '₹30'],
      'कुल',
    ],
  };

  return (
    <div className="landing-root">
      {/* Embedded landing styles */}
      <style>{`
        :root {
          --bg: #FBF6EE;
          --bg2: #F4EBDD;
          --ink: #1B120B;
          --mute: #7A6B5D;
          --card: #fff;
          --line: rgba(27,18,11,.1);
          --o: #FF5A00;
          --o2: #FF9A4D;
          --soft: #FFE6D2;
          --esp: #1E140D;
          --paper: #FFFBF3;
          --glow: rgba(255,90,0,.22);
          color-scheme: light;
        }
        .landing-root {
          background: var(--bg);
          color: var(--ink);
          font: 400 16px/1.6 "DM Sans", system-ui, sans-serif;
          overflow-x: hidden;
          min-height: 100vh;
        }
        .landing-root h1, .landing-root h2, .landing-root h3, .landing-root .logo {
          font-family: "Bricolage Grotesque", system-ui, sans-serif;
          letter-spacing: -.03em;
        }
        .landing-root a { color: inherit; text-decoration: none; }
        .wrap { max-width: 1140px; margin: auto; padding: 0 22px; }
        section { padding: 96px 0; }
        h2 { font-size: clamp(2rem, 4.6vw, 3.3rem); line-height: 1.06; font-weight: 800; max-width: 17ch; margin: 10px 0 14px; }
        .ey { color: var(--o); font-weight: 700; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; }
        .lead { color: var(--mute); max-width: 54ch; }
        #pg { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--o), var(--o2)); transform: scaleX(0); transform-origin: left; z-index: 70; }
        
        nav.pn {
          position: sticky;
          top: 14px;
          width: calc(100% - 32px);
          max-width: 1120px;
          margin: 14px auto 0;
          height: 60px;
          border-radius: 99px;
          padding: 0 12px 0 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(251, 246, 238, 0.92);
          border: 1px solid rgba(27, 18, 11, 0.09);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 2px 12px rgba(27, 18, 11, 0.04);
          color: var(--ink);
          z-index: 1000;
        }
        nav.pn .logo {
          display: flex;
          align-items: center;
          height: 44px;
          padding: 0 8px 0 0;
          flex-shrink: 0;
        }
        nav.pn .logo img {
          height: 30px;
          max-height: 32px;
          width: auto;
          object-fit: contain;
          display: block;
        }
        nav.pn .btn {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 99px;
          font: 600 .9rem "DM Sans", sans-serif;
          border: none;
          cursor: pointer;
          color: #fff;
          background: #FF5A00;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          white-space: nowrap;
          transition: transform .15s ease, background-color .15s ease, box-shadow .15s ease;
        }
        nav.pn .btn:hover {
          transform: translateY(-1px);
          background: #e65100;
          box-shadow: 0 4px 12px rgba(255, 90, 0, 0.25);
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .mobile-menu-toggle {
          display: none;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255, 90, 0, 0.08);
          border: 1.5px solid rgba(255, 90, 0, 0.24);
          color: #FF5A00;
          cursor: pointer;
          transition: all .2s cubic-bezier(.16, 1, .3, 1);
          padding: 0;
          outline: none;
          flex-shrink: 0;
        }
        .mobile-menu-toggle:hover,
        .mobile-menu-toggle.is-active {
          background: #FF5A00;
          color: #ffffff;
          border-color: #FF5A00;
          box-shadow: 0 4px 14px rgba(255, 90, 0, 0.35);
          transform: scale(1.04);
        }
        .mobile-menu-toggle:active {
          transform: scale(0.95);
        }

        .mobile-nav-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(20, 14, 9, 0.4);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 1098;
          animation: navFadeIn .18s cubic-bezier(.16, 1, .3, 1) forwards;
        }
        .mobile-nav-drawer {
          position: fixed;
          top: 68px;
          right: 14px;
          left: auto;
          width: min(300px, calc(100vw - 28px));
          background: rgba(255, 255, 255, 0.97);
          border: 1px solid rgba(255, 90, 0, 0.2);
          border-radius: 20px;
          padding: 12px;
          box-shadow: 0 20px 48px -10px rgba(27, 18, 11, 0.24), 0 8px 24px -4px rgba(255, 90, 0, 0.15);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          z-index: 1100;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transform-origin: top right;
          animation: cornerMenuPop .22s cubic-bezier(.16, 1, .3, 1) forwards;
          max-height: calc(100vh - 84px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        @keyframes navFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cornerMenuPop {
          from { opacity: 0; transform: scale(0.92) translateY(-6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .mobile-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 2px 4px 8px;
          border-bottom: 1px solid rgba(27, 18, 11, 0.07);
        }
        .mobile-drawer-title {
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #a89d91;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .mobile-drawer-close {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid rgba(27, 18, 11, 0.08);
          background: rgba(27, 18, 11, 0.03);
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background .15s ease, color .15s ease, transform .15s ease;
        }
        .mobile-drawer-close:hover {
          background: rgba(255, 90, 0, 0.12);
          color: #FF5A00;
          transform: scale(1.05);
        }
        .mobile-nav-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .mobile-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 12px;
          text-decoration: none;
          color: var(--ink);
          background: transparent;
          border: 1px solid transparent;
          transition: all .16s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .mobile-nav-item:hover, .mobile-nav-item:active {
          background: rgba(255, 90, 0, 0.07);
          border-color: rgba(255, 90, 0, 0.16);
          transform: translateX(2px);
        }
        .mobile-nav-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: rgba(255, 90, 0, 0.08);
          color: #FF5A00;
          border: 1px solid rgba(255, 90, 0, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background .15s ease, color .15s ease, transform .15s ease;
        }
        .mobile-nav-item:hover .mobile-nav-icon {
          background: #FF5A00;
          color: #ffffff;
          transform: scale(1.04);
        }
        .mobile-nav-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
          flex: 1;
          min-width: 0;
        }
        .mobile-nav-label {
          font-size: 0.86rem;
          font-weight: 700;
          color: var(--ink);
          line-height: 1.25;
        }
        .mobile-nav-desc {
          font-size: 0.70rem;
          color: #7a6e62;
          font-weight: 400;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mobile-nav-arrow {
          color: #a89d91;
          display: flex;
          align-items: center;
          opacity: 0.55;
          transition: transform .15s ease, opacity .15s ease, color .15s ease;
        }
        .mobile-nav-item:hover .mobile-nav-arrow {
          transform: translateX(2px);
          opacity: 1;
          color: #FF5A00;
        }
        .mobile-drawer-cta {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 2px;
          padding-top: 10px;
          border-top: 1px solid rgba(27, 18, 11, 0.07);
        }
        .mobile-primary-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          font: 700 0.88rem "DM Sans", sans-serif;
          border: none;
          cursor: pointer;
          color: #fff;
          background: linear-gradient(135deg, #FF5A00 0%, #FF7728 100%);
          box-shadow: 0 4px 14px rgba(255, 90, 0, 0.35);
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .mobile-primary-btn:hover {
          box-shadow: 0 6px 18px rgba(255, 90, 0, 0.45);
        }
        .mobile-primary-btn:active {
          transform: scale(0.98);
        }
        .mobile-btn-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mobile-sub-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 2px 4px 0;
          font-size: 0.72rem;
          color: var(--mute);
        }
        .mobile-sub-link {
          color: var(--o);
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        #menu {
          position: static;
          transform: none;
          height: 44px;
          display: flex;
          align-items: center;
          gap: 4px;
          list-style: none;
          padding: 0 6px;
          margin: 0 12px;
          background: rgba(27, 18, 11, 0.035);
          border-radius: 99px;
          border: 1px solid rgba(27, 18, 11, 0.06);
        }
        #menu li {
          display: flex;
          align-items: center;
        }
        #menu a {
          display: flex;
          align-items: center;
          height: 34px;
          padding: 0 14px;
          border-radius: 99px;
          font-size: .88rem;
          font-weight: 600;
          color: var(--mute);
          transition: all .2s ease;
          cursor: pointer;
          white-space: nowrap;
        }
        #menu a b { font-weight: 600; }
        #menu a u { display: none; text-decoration: none; font-weight: 600; }
        #menu a:hover {
          color: var(--o);
          background: rgba(255, 90, 0, 0.09);
        }
        #menu a.on {
          color: #ffffff;
          background: var(--o);
          box-shadow: 0 2px 10px rgba(255, 90, 0, 0.38);
        }
        #menu a.on b {
          color: #ffffff;
          background: none;
          -webkit-background-clip: unset;
          background-clip: unset;
        }

        .hero { position: relative; padding: 60px 0 90px; overflow: hidden; }
        .big { position: absolute; right: -3%; top: -20px; font: 800 clamp(200px,34vw,440px)/1 "Bricolage Grotesque", sans-serif; color: transparent; -webkit-text-stroke: 2px var(--line); pointer-events: none; user-select: none; }
        .hero .wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; position: relative; }
        .pill { display: inline-flex; gap: 8px; align-items: center; padding: 7px 14px; border-radius: 99px; background: var(--soft); color: var(--o); font-weight: 700; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; }
        .pill b, .live::before { width: 8px; height: 8px; border-radius: 50%; background: var(--o); animation: pu 1.6s infinite; }
        .live::before { content: ""; display: inline-block; margin-right: 8px; background: #58d68d; }
        @keyframes pu { 0% { box-shadow: 0 0 0 0 currentColor; } 100% { box-shadow: 0 0 0 10px transparent; } }

        h1 { font-size: clamp(2.6rem, 6vw, 4.8rem); line-height: 1; font-weight: 800; margin: 20px 0; }
        .w.g { background: linear-gradient(100deg, var(--o), #FFB347, var(--o)); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: sh 5s linear infinite; }
        @keyframes sh { to { background-position: 200% center; } }

        .cta { display: flex; gap: 12px; flex-wrap: wrap; margin: 30px 0; }
        .store, .landing-root a.store {
          display: inline-flex !important;
          align-items: center !important;
          gap: 12px !important;
          background: #0B0805 !important;
          color: #FFFFFF !important;
          border: 1px solid rgba(255,255,255,.35) !important;
          border-radius: 14px !important;
          padding: 9px 22px 9px 16px !important;
          text-decoration: none !important;
          transition: transform .25s, box-shadow .25s, border-color .25s !important;
        }
        .store:hover, .landing-root a.store:hover {
          transform: translateY(-3px) !important;
          border-color: var(--o2) !important;
          box-shadow: 0 14px 30px -10px var(--o) !important;
        }
        .store svg, .landing-root a.store svg {
          width: 28px !important;
          height: 28px !important;
          flex: none !important;
          fill: #FFFFFF;
        }
        .landing-root a.store *, .store span, .store small, .store b {
          color: #FFFFFF !important;
        }
        .store small, .landing-root a.store small {
          display: block !important;
          font-size: 10px !important;
          letter-spacing: .08em !important;
          opacity: .9 !important;
          line-height: 1.1 !important;
          font-family: "DM Sans", sans-serif !important;
          color: rgba(255, 255, 255, 0.9) !important;
        }
        .store b, .landing-root a.store b {
          display: block !important;
          font: 700 1.15rem/1.15 "DM Sans", sans-serif !important;
          color: #FFFFFF !important;
        }
        .trust { display: flex; gap: 20px; flex-wrap: wrap; color: var(--mute); font-size: .88rem; }
        .trust span::before { content: "✓ "; color: var(--o); font-weight: 700; }

        .demo { position: relative; background: var(--esp); color: #FFF3E6; border-radius: 24px; padding: 22px; box-shadow: 0 24px 50px -15px rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.1); max-width: 470px; margin: auto; width: 100%; }
        .spin { position: absolute; right: -8px; top: -34px; width: 98px; height: 98px; z-index: 3; background: var(--bg); border-radius: 50%; box-shadow: 0 10px 30px -10px var(--o); }
        .spin svg { position: absolute; inset: 0; animation: rot 14s linear infinite; }
        .spin text { font: 700 10.5px "DM Sans", sans-serif; fill: var(--o); }
        .spin img { position: absolute; inset: 27px; width: 44px; height: 44px; border-radius: 12px; }
        @keyframes rot { to { transform: rotate(360deg); } }

        .dh { display: flex; justify-content: space-between; font-size: 12px; opacity: .85; margin-bottom: 14px; }
        .ig { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .it {
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 18px;
          padding: 8px;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;
          touch-action: manipulation;
          user-select: none;
          transition: transform .2s ease, background .2s ease, border-color .2s ease, box-shadow .2s ease;
          display: flex;
          flex-direction: column;
        }
        .it:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 90, 0, 0.45);
          transform: translateY(-2px);
          box-shadow: 0 10px 24px -6px rgba(0, 0, 0, 0.4);
        }
        .it:active { transform: scale(.95); }
        .it-img-wrap {
          position: relative;
          width: 100%;
          height: 68px;
          border-radius: 13px;
          overflow: hidden;
          margin-bottom: 7px;
          background: #231812;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
        }
        .it-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform .35s ease;
        }
        .it:hover .it-photo {
          transform: scale(1.08);
        }
        .it-price-tag {
          position: absolute;
          bottom: 4px;
          right: 4px;
          background: rgba(15, 10, 7, 0.85);
          backdrop-filter: blur(6px);
          color: #fff;
          font-weight: 700;
          font-size: 11px;
          padding: 2px 7px;
          border-radius: 99px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          letter-spacing: -0.01em;
        }
        .it b.it-title {
          display: block;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.25;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .it .it-sub {
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.65);
          margin-top: 2px;
        }

        .rc { position: relative; background: var(--paper); color: #1B120B; border-radius: 6px 6px 0 0; margin: 14px 0 10px; padding: 14px 16px 18px; font: 12.5px/1.7 ui-monospace, Menlo, Consolas, monospace; }
        .rc::after { content: ""; position: absolute; left: 0; right: 0; top: 100%; height: 9px; background: linear-gradient(135deg, var(--paper) 50%, transparent 50%) 0 0/14px 9px, linear-gradient(225deg, var(--paper) 50%, transparent 50%) 0 0/14px 9px; }
        .rc .hd { text-align: center; font-weight: 700; border-bottom: 1px dashed rgba(27,18,11,.3); padding-bottom: 6px; margin-bottom: 6px; }
        .rr { display: flex; justify-content: space-between; gap: 8px; }
        .mn { margin-left: 8px; width: 18px; height: 18px; border-radius: 50%; border: 1px solid rgba(27,18,11,.3); background: none; cursor: pointer; line-height: 14px; font-weight: 700; }
        .mn:hover { background: var(--o); color: #fff; border-color: var(--o); }
        .tt { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed rgba(27,18,11,.3); margin-top: 8px; padding-top: 8px; }
        .tt b { font: 800 1.5rem "Bricolage Grotesque", sans-serif; }
        .stamp { position: absolute; right: 14px; top: 34%; border: 3px solid #2E9B6A; color: #2E9B6A; font: 800 1.4rem "Bricolage Grotesque", sans-serif; padding: 0 12px; border-radius: 8px; transform: rotate(-14deg) scale(2); opacity: 0; }
        .rc.feed { animation: feed .7s both; }
        .rc.paid .stamp { animation: st .45s forwards; }
        .rc.tear { animation: tear .6s forwards; }
        @keyframes feed { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0); } }
        @keyframes st { to { transform: rotate(-14deg) scale(1); opacity: .9; } }
        @keyframes tear { to { transform: translateY(-30px) rotate(-3deg); opacity: 0; } }

        .btn.pr { width: 100%; justify-content: center; background: var(--o); color: #fff; padding: 13px; border-radius: 99px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 10px 26px -8px var(--o); }

        .mq { overflow: hidden; padding: 10px 0; border-block: 1px solid var(--line); -webkit-mask: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); mask: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
        .mq div { display: flex; gap: 10px; width: max-content; animation: mq 46s linear infinite; }
        @keyframes mq { to { transform: translateX(-50%); } }
        .mq-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px; border-radius: 99px; background: var(--card); border: 1px solid var(--line); font-weight: 700; font-size: .82rem; white-space: nowrap; box-shadow: 0 1px 3px rgba(27,18,11,.04); }
        .mq-icon { font-style: normal; display: inline-block; font-size: .95rem; line-height: 1; background: none !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }

        .cmp { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px; }
        .cmp > div { border-radius: 26px; padding: 32px; border: 1px solid var(--line); }
        .cmp .old { background: var(--bg2); }
        .cmp .new { background: var(--esp); color: #FFF3E6; border-color: var(--o); position: relative; }
        .cmp h3 { font-size: 1.6rem; margin-bottom: 14px; }
        .cmp li { list-style: none; padding: 10px 0 10px 28px; position: relative; border-top: 1px solid var(--line); font-size: .95rem; }
        .cmp li::before { content: "✕"; position: absolute; left: 0; color: #c0392b; font-weight: 700; }
        .cmp .new li::before { content: "✓"; color: var(--o2); }

        .bento { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-top: 40px; }
        .bc { grid-column: span 2; background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 24px; position: relative; overflow: hidden; transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
        .bc.w { grid-column: span 3; }
        .bc:hover { transform: translateY(-3px); border-color: rgba(255, 90, 0, 0.3); box-shadow: 0 12px 28px -12px rgba(27, 18, 11, 0.08); }
        .bc h3 { font-size: 1.2rem; margin-bottom: 4px; }
        .bc p { color: var(--mute); font-size: .92rem; margin-bottom: 16px; }

        .gs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .gs > div { position: relative; overflow: hidden; background: var(--soft); border-radius: 16px; padding: 16px 6px; text-align: center; font-size: .8rem; font-weight: 700; }
        .gs b { display: block; font-size: 1.1rem; color: var(--o); }

        .mu { position: relative; height: 150px; }
        .mu div { position: absolute; left: 0; right: 0; height: 44px; border-radius: 14px; background: var(--soft); display: flex; justify-content: space-between; align-items: center; padding: 0 16px; font-weight: 700; font-size: .9rem; }
        .ma { animation: ma 6s ease-in-out infinite; top: 0; }
        .mb { animation: mb 6s ease-in-out infinite; top: 0; }
        .mc { animation: mc 6s ease-in-out infinite; top: 0; }
        @keyframes ma { 0%, 30% { transform: translateY(106px); } 50%, 85% { transform: translateY(0); background: var(--o); color: #fff; } 100% { transform: translateY(106px); } }
        @keyframes mb { 0%, 30% { transform: translateY(0); } 50%, 85% { transform: translateY(53px); } 100% { transform: translateY(0); } }
        @keyframes mc { 0%, 30% { transform: translateY(53px); } 50%, 85% { transform: translateY(106px); } 100% { transform: translateY(53px); } }

        .bars { display: flex; align-items: flex-end; gap: 7px; height: 100px; }
        .bars i { flex: 1; background: linear-gradient(var(--o2), var(--o)); border-radius: 6px 6px 2px 2px; animation: gr 2.8s ease-in-out infinite alternate; }
        @keyframes gr { from { height: 14%; } to { height: var(--h); } }

        .sb { background: var(--soft); border-radius: 14px; padding: 12px 14px; font: 600 .95rem ui-monospace, Menlo, monospace; display: flex; }
        .ty { overflow: hidden; white-space: nowrap; width: 0; border-right: 2px solid var(--o); animation: ty 4s steps(5) infinite; }
        @keyframes ty { 0% { width: 0; } 45%, 90% { width: 5ch; } 100% { width: 0; } }
        .rs { margin-top: 10px; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--o); font-weight: 700; font-size: .9rem; animation: rs 4s infinite; }
        @keyframes rs { 0%, 40% { opacity: 0; transform: translateY(8px); } 55%, 90% { opacity: 1; transform: none; } 100% { opacity: 0; } }

        .cs { display: flex; flex-wrap: wrap; gap: 8px; }
        .cs span { padding: 8px 14px; border-radius: 99px; font-size: .82rem; font-weight: 700; background: var(--soft); animation: hl 6s infinite; }
        .cs span:nth-child(2) { animation-delay: 1.5s; }
        .cs span:nth-child(3) { animation-delay: 3s; }
        .cs span:nth-child(4) { animation-delay: 4.5s; }
        @keyframes hl { 0%, 22% { background: var(--o); color: #fff; } 27%, 100% { background: var(--soft); color: var(--ink); } }

        .band { position: relative; overflow: hidden; background: var(--esp); color: #FFF3E6; border-radius: 34px; margin: 0 20px; padding: 54px 24px; text-align: center; }
        .band h2 { color: #fff; margin-inline: auto; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 30px; }
        .stats b { font: 800 clamp(2.4rem, 5vw, 4rem)/1 "Bricolage Grotesque", sans-serif; color: var(--o2); display: block; }
        .stats span { color: #cdbfb1; font-size: .9rem; }

        .lang { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        .tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 26px; }
        .tab { padding: 10px 18px; border-radius: 99px; border: 1px solid var(--line); background: transparent; color: var(--ink); font: 600 .9rem "DM Sans", sans-serif; cursor: pointer; transition: .25s; }
        .tab:hover { border-color: var(--o); }
        .tab.active { background: var(--o); color: #fff; border-color: var(--o); }
        .paper { position: relative; background: var(--paper); color: #1B120B; border-radius: 8px 8px 0 0; padding: 26px; font: 14px/1.7 ui-monospace, Menlo, Consolas, monospace; box-shadow: 0 30px 60px -30px var(--o); min-height: 230px; }
        .paper::after { content: ""; position: absolute; left: 0; right: 0; top: 100%; height: 9px; background: linear-gradient(135deg, var(--paper) 50%, transparent 50%) 0 0/14px 9px, linear-gradient(225deg, var(--paper) 50%, transparent 50%) 0 0/14px 9px; }
        .paper .r { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed rgba(27,18,11,.25); }
        .paper .t { display: flex; justify-content: space-between; font: 800 1.6rem "Bricolage Grotesque", sans-serif; margin-top: 14px; }

        /* Pricing Grid & Cards */
        .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 36px; align-items: stretch; }
        .p-card { background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 32px 24px 24px; display: flex; flex-direction: column; position: relative; transition: transform .2s, box-shadow .2s, border-color .2s; }
        .p-card:hover { transform: translateY(-3px); box-shadow: 0 16px 32px -12px rgba(28,25,23,.08); border-color: #ffd8c2; }
        .p-card.featured { border: 2px solid var(--o); box-shadow: 0 16px 36px -10px rgba(255,95,0,.15); background: linear-gradient(180deg, #fffaf6 0%, #ffffff 45%); }
        .p-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--o); color: #fff; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: 3px 12px; border-radius: 99px; box-shadow: 0 2px 8px rgba(255,95,0,.25); white-space: nowrap; }
        .p-dur { font: 700 24px var(--font-head); color: var(--ink); margin-bottom: 4px; letter-spacing: -.02em; }
        .p-sub { color: var(--mute); font-size: 13px; margin-bottom: 22px; }
        .p-price-wrap { margin-bottom: 24px; padding-bottom: 22px; border-bottom: 1px dashed var(--line); }
        .p-orig { font-size: 14px; color: var(--mute); text-decoration: line-through; margin-bottom: 4px; font-weight: 500; }
        .p-val { font: 700 42px/1 var(--font-head); color: var(--ink); letter-spacing: -.03em; }
        .p-val span { font-size: 14px; font-weight: 500; color: var(--mute); letter-spacing: 0; }
        .p-tax { font-size: 12px; font-weight: 600; color: #b45309; background: #fffbeb; padding: 3px 8px; border-radius: 6px; display: inline-block; margin-top: 8px; }
        .p-feats { list-style: none; padding: 0; margin: 0 0 30px 0; display: grid; gap: 12px; flex: 1; }
        .p-feats li { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #44403c; }
        .p-feats li svg { width: 17px; height: 17px; color: var(--o); flex-shrink: 0; }
        .p-cta { display: flex; align-items: center; justify-content: center; width: 100%; padding: 14px 20px; border-radius: 99px; font-weight: 600; font-size: 14px; background: #f5ede6; color: var(--ink); border: 0; cursor: pointer; transition: .2s; }
        .p-cta:hover { background: var(--sand); }
        .p-card.featured .p-cta { background: var(--o); color: #fff; box-shadow: 0 8px 20px -6px rgba(255,95,0,.55); }
        .p-card.featured .p-cta:hover { background: #e55500; transform: translateY(-1px); }

        /* Checkout Modal */
        .checkout-backdrop { position: fixed; inset: 0; background: rgba(28, 25, 23, 0.55); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); z-index: 9999; display: grid; place-items: center; padding: 18px; overflow-y: auto; }
        .checkout-modal { background: #fff; border-radius: 26px; width: 100%; max-width: 460px; padding: 30px 26px 26px; box-shadow: 0 25px 60px -15px rgba(28,25,23,.3); position: relative; animation: p_drop .25s cubic-bezier(.3,.1,.2,1); }
        .checkout-close { position: absolute; top: 18px; right: 18px; width: 34px; height: 34px; border-radius: 50%; background: #f4efea; border: 0; display: grid; place-items: center; cursor: pointer; color: var(--ink); font-size: 16px; transition: .2s; }
        .checkout-close:hover { background: #ffe9dc; color: var(--o); }
        .checkout-slip { background: #faf8f5; border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; margin: 18px 0; }
        .checkout-slip .row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #e4ded7; font-size: 13.5px; color: #57534e; }
        .checkout-slip .row:last-child { border-bottom: 0; }
        .checkout-slip .row b { font-weight: 600; color: var(--ink); }
        .checkout-slip .row.tax { color: #854d0e; }
        .checkout-slip .row.total { border-top: 2px solid var(--ink); border-bottom: 0; margin-top: 8px; padding-top: 14px; font-size: 16px; }
        .checkout-slip .row.total b { font-size: 24px; color: var(--o); font-family: var(--font-head); }
        @keyframes p_drop { from { opacity: 0; transform: translateY(-16px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

        @media (max-width: 960px) {
          .pricing-grid { grid-template-columns: 1fr; max-width: 440px; margin-inline: auto; }
        }

        .fin { position: relative; background: var(--esp); color: #FFF3E6; border-radius: 34px; margin: 0 20px; padding: 80px 24px 70px; text-align: center; overflow: hidden; }
        .fin h2 { margin-inline: auto; color: #fff; }
        .fin .lead { margin: 0 auto 26px; color: #cdbfb1; }
        .fin .cta { justify-content: center; }
        .cup { position: relative; width: 136px; height: 136px; margin: 0 auto 28px; display: flex; align-items: center; justify-content: center; }
        .cup-rounder { position: relative; width: 136px; height: 136px; border-radius: 50%; background: #ffffff; box-shadow: 0 18px 45px rgba(0,0,0,0.45), 0 0 0 6px rgba(255, 90, 0, 0.28), 0 0 35px rgba(255, 90, 0, 0.35); display: flex; align-items: center; justify-content: center; }
        .cup-spin-svg { position: absolute; inset: 0; width: 100%; height: 100%; animation: rot 16s linear infinite; pointer-events: none; }
        .cup-spin-svg text { font: 800 10.2px "DM Sans", sans-serif; fill: var(--o); letter-spacing: 1.1px; }
        .cup-core { width: 82px; height: 82px; border-radius: 50%; background: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.08), inset 0 0 0 1.5px rgba(255, 90, 0, 0.2); z-index: 2; }
        .cup-core img { width: 56px; height: 56px; object-fit: contain; filter: drop-shadow(0 3px 8px rgba(255, 90, 0, 0.25)); }
        .steam { position: absolute; left: 0; right: 0; top: -40px; display: flex; justify-content: center; gap: 18px; z-index: 3; }
        .steam i { width: 10px; height: 46px; border-radius: 50%; background: linear-gradient(transparent, rgba(255,255,255,.75)); filter: blur(6px); opacity: 0; animation: sm 3.2s ease-in infinite; }
        .steam i:nth-child(2) { animation-delay: 1s; }
        .steam i:nth-child(3) { animation-delay: 2s; }
        @keyframes sm { 0% { transform: translateY(24px) scaleX(1); opacity: 0; } 30% { opacity: .8; } 100% { transform: translateY(-30px) scaleX(2.4); opacity: 0; } }

        .policy-modal { background: #fff; border-radius: 26px; width: 100%; max-width: 640px; max-height: 85vh; padding: 30px 28px 24px; box-shadow: 0 25px 60px -15px rgba(28,25,23,.35); position: relative; animation: p_drop .25s cubic-bezier(.3,.1,.2,1); display: flex; flex-direction: column; }
        .policy-body { overflow-y: auto; padding-right: 8px; font-size: 14px; line-height: 1.65; color: #44403c; }
        .policy-body h5 { font: 700 15px var(--font-head); color: #1c1917; margin: 18px 0 6px; }
        .policy-body h5:first-child { margin-top: 0; }
        .policy-body p { margin: 0 0 12px; }
        .policy-body ul { margin: 0 0 12px; padding-left: 20px; }
        .policy-body li { margin-bottom: 6px; }

        /* Enhanced Modern Minimalist Footer */
        footer.ft {
          position: relative;
          overflow: hidden;
          background: #0d0a07;
          background-image:
            radial-gradient(ellipse 90% 45% at 50% -5%, rgba(255, 95, 0, 0.09), transparent 60%),
            radial-gradient(circle at 10% 90%, rgba(255, 122, 41, 0.04), transparent 50%),
            radial-gradient(circle at 90% 90%, rgba(255, 95, 0, 0.03), transparent 50%);
          color: #c5b9ac;
          padding: 32px 0 20px;
          font-size: 0.92rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ft-top-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 14px;
          margin-bottom: 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          flex-wrap: wrap;
        }

        .ft-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 12px;
          border-radius: 999px;
          background: rgba(46, 155, 106, 0.12);
          border: 1px solid rgba(46, 155, 106, 0.28);
          font-size: 0.76rem;
          font-weight: 600;
          color: #38c182;
          letter-spacing: 0.02em;
        }

        .ft-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #2E9B6A;
          box-shadow: 0 0 8px #2E9B6A;
          animation: ft_pulse 2s infinite ease-in-out;
        }

        @keyframes ft_pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.85); }
        }

        .ft-tagline-muted {
          font-size: 0.85rem;
          color: #8c8275;
          letter-spacing: -0.01em;
        }

        .fg {
          display: grid;
          grid-template-columns: 1.5fr 0.9fr 1.15fr 0.9fr;
          gap: 36px;
          position: relative;
          z-index: 2;
        }

        .fg h4 {
          font: 700 11px "DM Sans", sans-serif;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #ffffff;
          opacity: 0.5;
          margin-bottom: 14px;
        }

        .fg-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .fg-links li a, .fg a.fl {
          color: #bdb0a2;
          text-decoration: none;
          font-size: 0.88rem;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .fg-links li a:hover, .fg a.fl:hover {
          color: #ffffff;
          transform: translateX(2px);
        }

        .ft-contact-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ft-contact-phone {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #ffffff;
          font-weight: 700;
          font-size: 1.02rem;
          letter-spacing: -0.01em;
          text-decoration: none;
          transition: color 0.18s;
        }

        .ft-contact-phone:hover {
          color: #FF7A29;
        }

        .ft-social-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #d1c5b8;
          font-size: 0.86rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.18s ease;
          padding: 2px 0;
        }

        .ft-social-link:hover {
          color: #ffffff;
          transform: translateX(2px);
        }

        .ft-timing-note {
          font-size: 0.78rem;
          color: #7d7367;
          line-height: 1.45;
          margin: 2px 0 0;
        }

        .fbig {
          position: relative;
          z-index: 1;
          margin: 24px 0 16px;
          text-align: center;
          user-select: none;
          pointer-events: none;
        }

        .fbig img {
          display: block;
          margin: auto;
          width: min(600px, 80%);
          height: auto;
          opacity: 0.07;
          filter: drop-shadow(0 0 40px rgba(255, 95, 0, 0.08));
        }

        /* Bottom Bar */
        .fb {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.09);
          padding-top: 20px;
          font-size: 0.84rem;
          position: relative;
          z-index: 3;
        }

        .fb-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          color: #8c8275;
          font-size: 0.82rem;
          letter-spacing: -0.01em;
        }

        .fb-center {
          display: none;
        }

        .fb-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Powered by Tecstellar Badge */
        .ft-powered-block {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 3px 6px 3px 9px;
          border-radius: 999px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .ft-powered-block:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.16);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
        }

        .ft-powered-txt {
          font-size: 0.66rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #8c8275;
          white-space: nowrap;
        }

        .ft-tecstellar-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 3px 9px 3px 7px;
          border-radius: 999px;
          text-decoration: none;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .ft-tecstellar-chip:hover {
          background: linear-gradient(135deg, rgba(255, 122, 41, 0.24) 0%, rgba(255, 255, 255, 0.12) 100%);
          border-color: rgba(255, 122, 41, 0.65);
          box-shadow: 0 4px 14px rgba(255, 122, 41, 0.3);
          transform: translateY(-1px);
        }

        .ft-tecstellar-logo-img {
          height: 14px;
          width: auto;
          max-width: 95px;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.4));
        }

        .ft-tecstellar-emblem-img {
          height: 14px;
          width: 14px;
          object-fit: contain;
          display: block;
          filter: brightness(1.2);
        }

        .ft-tecstellar-name {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: #ffffff;
          line-height: 1;
        }

        .ft-tecstellar-arrow {
          color: #FF7A29;
          display: inline-flex;
          align-items: center;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s;
        }

        .ft-tecstellar-chip:hover .ft-tecstellar-arrow {
          transform: translate(2px, -2px);
          color: #ff9d5c;
        }

        .ft-admin-pill {
          display: inline-flex;
          align-items: center;
          padding: 5px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
          font-size: 0.8rem;
          font-weight: 600;
          color: #d1c5b8;
          text-decoration: none;
          transition: all 0.2s ease;
          letter-spacing: 0.01em;
        }

        .ft-admin-pill:hover {
          background: rgba(255, 255, 255, 0.09);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.22);
          transform: translateY(-1px);
        }

        .ft-back-to-top {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #d1c5b8;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ft-back-to-top:hover {
          background: #FF7A29;
          border-color: #FF7A29;
          color: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(255, 122, 41, 0.35);
        }

        .fl { color: #fff; text-decoration: none; }
        .fl:hover { text-decoration: underline; }

        @media (max-width: 991px) {
          nav.pn {
            top: 8px;
            width: calc(100% - 20px);
            margin: 8px auto 0;
            height: 56px;
            padding: 0 8px 0 14px;
            border-radius: 99px;
            box-sizing: border-box;
          }
          nav.pn .logo img {
            height: 26px;
            max-height: 28px;
          }
          #menu {
            display: none !important;
          }
          .mobile-menu-toggle {
            display: flex !important;
          }
          .desktop-only-btn {
            display: none !important;
          }
          .mobile-only-btn {
            display: inline-flex !important;
            padding: 8px 14px !important;
            font-size: 0.82rem !important;
            border-radius: 99px !important;
          }
        }

        @media (min-width: 992px) {
          .mobile-menu-toggle {
            display: none !important;
          }
          .mobile-only-btn {
            display: none !important;
          }
          .desktop-only-btn {
            display: inline-flex !important;
          }
          .mobile-nav-backdrop,
          .mobile-nav-drawer {
            display: none !important;
          }
        }

        @media (max-width: 860px) {
          .hero .wrap, .cmp, .lang { grid-template-columns: 1fr; }
          .fg { grid-template-columns: 1fr 1fr; gap: 36px; }
          .fb { flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 20px; }
          .fb-left, .fb-center, .fb-right { justify-content: center; }
          .bc, .bc.w { grid-column: span 6; }
          .stats { grid-template-columns: 1fr; }
          section { padding: 64px 0; }
          .band, .fin { margin: 0 12px; }
          footer.ft { padding-bottom: 40px; }
        }

        @media (max-width: 600px) {
          .fg { grid-template-columns: 1fr; gap: 32px; }
          .ft-top-banner { flex-direction: column; align-items: flex-start; gap: 14px; }
          .fb-left { flex-direction: column; gap: 4px; }
        }
      `}</style>

      {/* SVG Definitions */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <symbol id="gp" viewBox="0 0 24 24">
            <path fill="#00A0FF" d="M3.5 2.5 13 12l-9.5 9.5z" />
            <path fill="#00E676" d="M3.5 2.5 13 12l3.4-2.3z" />
            <path fill="#FF3A44" d="M3.5 21.5 13 12l3.4 2.3z" />
            <path fill="#FFD500" d="M16.4 9.7 20.5 12l-4.1 2.3L13 12z" />
          </symbol>
          <symbol id="ap" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
          </symbol>
          <symbol id="i-coffee" viewBox="0 0 256 256">
            <g fill="currentColor">
              <path d="M208,88v48a88,88,0,0,1-51.3,80H83.3A88,88,0,0,1,32,136V88Z" opacity="0.2" />
              <path d="M80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,120,64Zm32,0a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,152,64Zm96,56v8a40,40,0,0,1-37.51,39.91,96.59,96.59,0,0,1-27,40.09H208a8,8,0,0,1,0,16H32a8,8,0,0,1,0-16H56.54A96.3,96.3,0,0,1,24,136V88a8,8,0,0,1,8-8H208A40,40,0,0,1,248,120ZM200,96H40v40a80.27,80.27,0,0,0,45.12,72h69.76A80.27,80.27,0,0,0,200,136Zm32,24a24,24,0,0,0-16-22.62V136a95.78,95.78,0,0,1-1.2,15A24,24,0,0,0,232,128Z" />
            </g>
          </symbol>
          <symbol id="i-tea-bag" viewBox="0 0 256 256">
            <g fill="currentColor">
              <path d="M160,122.22V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V122.22a8,8,0,0,1,1.14-4.12L69.67,83.88A8,8,0,0,1,76.53,80h54.94a8,8,0,0,1,6.86,3.88l20.53,34.22A8,8,0,0,1,160,122.22Z" opacity="0.2" />
              <path d="M224,160a16,16,0,0,1-16-16V64A56,56,0,0,0,96,64v8H76.53a16.09,16.09,0,0,0-13.72,7.77L42.28,114A16.06,16.06,0,0,0,40,122.22V216a16,16,0,0,0,16,16h96a16,16,0,0,0,16-16V122.22a16.06,16.06,0,0,0-2.28-8.24L145.19,79.77A16.09,16.09,0,0,0,131.47,72H112V64a40,40,0,0,1,80,0v80a32,32,0,0,0,32,32,8,8,0,0,0,0-16ZM131.47,88,152,122.22V216H56V122.22L76.53,88H96v48a8,8,0,0,0,16,0V88Z" />
            </g>
          </symbol>
          <symbol id="i-coffee-bean" viewBox="0 0 256 256">
            <g fill="currentColor">
              <path d="M183.79,183.79c-43.14,43.14-103.09,53.14-133.9,22.32S29.07,115.35,72.21,72.21,175.3,19.07,206.11,49.89,226.93,140.65,183.79,183.79Z" opacity="0.2" />
              <path d="M211.75,44.25C195,27.47,170.37,20.79,142.46,25.44c-26.91,4.49-53.87,19.09-75.9,41.12s-36.63,49-41.12,75.9c-4.65,27.91,2,52.51,18.81,69.29C57.54,225.05,75.75,232,96.62,232a103.66,103.66,0,0,0,16.92-1.44c26.91-4.49,53.87-19.09,75.9-41.12s36.63-49,41.12-75.9C235.21,85.63,228.53,61,211.75,44.25ZM77.87,77.87C102.56,53.19,133,39.93,159.15,39.93a62.26,62.26,0,0,1,29,6.67A108.48,108.48,0,0,0,157.1,63.54c-19.2,15.16-31.63,36.32-36.94,62.89-9.72,48.58-44.7,65.18-67.48,70.84C28.71,168.76,39.4,116.35,77.87,77.87ZM178.13,178.13c-34.69,34.68-80.71,46.78-110.32,31.27A108.72,108.72,0,0,0,98.9,192.46c19.2-15.16,31.63-36.32,36.94-62.89,9.72-48.58,44.7-65.18,67.48-70.84C227.29,87.24,216.6,139.65,178.13,178.13Z" />
            </g>
          </symbol>
          <symbol id="i-orange-slice" viewBox="0 0 256 256">
            <g fill="currentColor">
              <path d="M216,88A88,88,0,0,1,40,88Z" opacity="0.2" />
              <path d="M248,80H8a8,8,0,0,0-8,8,128,128,0,0,0,256,0A8,8,0,0,0,248,80ZM77.4,149.91l42.6-42.6V167.6A79.59,79.59,0,0,1,77.4,149.91ZM66.09,138.6A79.59,79.59,0,0,1,48.4,96h60.29ZM136,107.31l42.6,42.6A79.59,79.59,0,0,1,136,167.6Zm53.91,31.29L147.31,96H207.6A79.59,79.59,0,0,1,189.91,138.6ZM128,200A112.15,112.15,0,0,1,16.28,96H32.34a96,96,0,0,0,191.32,0h16.06A112.15,112.15,0,0,1,128,200Z" />
            </g>
          </symbol>
          <symbol id="i-pint-glass" viewBox="0 0 256 256">
            <g fill="currentColor">
              <path d="M195.2,72,176.85,225A8,8,0,0,1,168.9,232H87.1A8,8,0,0,1,79.15,225L60.8,72Z" opacity="0.2" />
              <path d="M206,26.69A8,8,0,0,0,200,24H56a8,8,0,0,0-7.94,9l23.15,193A16,16,0,0,0,87.1,240h81.8a16,16,0,0,0,15.89-14.09L207.94,33A8,8,0,0,0,206,26.69ZM191,40,188.1,64H67.9L65,40ZM168.9,224H87.1L69.82,80H186.18Z" />
            </g>
          </symbol>
        </defs>
      </svg>

      {/* Progress Bar */}
      <div id="pg"></div>

      {/* Navigation Header */}
      <nav className="pn">
        <a className="logo" href="#top" title="Counter 365 Home" onClick={(e) => handleNavClick(e, 'top')}>
          <img src="/counter365_brand_light.png" alt="Counter 365" style={{ height: '30px', width: 'auto', objectFit: 'contain', display: 'block' }} />
        </a>

        {/* Center Menu Links (Integrated inside Navbar for zero overlap) */}
        <ul id="menu">
          <li>
            <a href="#top" onClick={(e) => handleNavClick(e, 'top')}>
              <b>Home</b>
              <u>Home</u>
            </a>
          </li>
          <li>
            <a href="#why" onClick={(e) => handleNavClick(e, 'why')}>
              <b>Why Counter 365</b>
              <u>Why</u>
            </a>
          </li>
          <li>
            <a href="#features" onClick={(e) => handleNavClick(e, 'features')}>
              <b>Features</b>
              <u>Features</u>
            </a>
          </li>
          <li>
            <a href="#who" onClick={(e) => handleNavClick(e, 'who')}>
              <b>Who it’s for</b>
              <u>Who</u>
            </a>
          </li>
          <li>
            <a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')}>
              <b>Pricing</b>
              <u>Pricing</u>
            </a>
          </li>
        </ul>

        <div className="nav-actions">
          {/* Mobile compact action */}
          <button className="btn mobile-only-btn" onClick={() => navigate('/login')}>
            Start free
          </button>

          {/* Desktop primary action */}
          <button className="btn desktop-only-btn" onClick={() => navigate('/login')}>
            Get started
          </button>

          {/* Mobile Hamburger / Close Toggle */}
          <button
            className={`mobile-menu-toggle ${mobileMenuOpen ? 'is-active' : ''}`}
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X size={19} strokeWidth={2.4} />
            ) : (
              <Menu size={19} strokeWidth={2.4} />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Corner Menu */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-nav-backdrop" onClick={() => setMobileMenuOpen(false)} />
          <aside className="mobile-nav-drawer" role="dialog" aria-modal="true" aria-label="Navigation Menu">
            <div className="mobile-drawer-header">
              <span className="mobile-drawer-title">
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF5A00', display: 'inline-block' }} />
                Counter365 Menu
              </span>
              <button className="mobile-drawer-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
                <X size={15} strokeWidth={2.4} />
              </button>
            </div>

            <ul className="mobile-nav-list">
              <li>
                <a href="#top" className="mobile-nav-item" onClick={(e) => handleNavClick(e, 'top')}>
                  <span className="mobile-nav-icon">
                    <Home size={16} strokeWidth={2.2} />
                  </span>
                  <div className="mobile-nav-text">
                    <span className="mobile-nav-label">Home</span>
                    <span className="mobile-nav-desc">Overview & live interactive demo</span>
                  </div>
                  <span className="mobile-nav-arrow">
                    <ChevronRight size={14} strokeWidth={2.4} />
                  </span>
                </a>
              </li>
              <li>
                <a href="#why" className="mobile-nav-item" onClick={(e) => handleNavClick(e, 'why')}>
                  <span className="mobile-nav-icon">
                    <Zap size={16} strokeWidth={2.2} />
                  </span>
                  <div className="mobile-nav-text">
                    <span className="mobile-nav-label">Why Counter365</span>
                    <span className="mobile-nav-desc">1-tap billing built for peak rush</span>
                  </div>
                  <span className="mobile-nav-arrow">
                    <ChevronRight size={14} strokeWidth={2.4} />
                  </span>
                </a>
              </li>
              <li>
                <a href="#features" className="mobile-nav-item" onClick={(e) => handleNavClick(e, 'features')}>
                  <span className="mobile-nav-icon">
                    <Sparkles size={16} strokeWidth={2.2} />
                  </span>
                  <div className="mobile-nav-text">
                    <span className="mobile-nav-label">Features</span>
                    <span className="mobile-nav-desc">KOT, Khata, Thermal Print & Reports</span>
                  </div>
                  <span className="mobile-nav-arrow">
                    <ChevronRight size={14} strokeWidth={2.4} />
                  </span>
                </a>
              </li>
              <li>
                <a href="#who" className="mobile-nav-item" onClick={(e) => handleNavClick(e, 'who')}>
                  <span className="mobile-nav-icon">
                    <Store size={16} strokeWidth={2.2} />
                  </span>
                  <div className="mobile-nav-text">
                    <span className="mobile-nav-label">Who It Is For</span>
                    <span className="mobile-nav-desc">Tea stalls, cafés, bakeries & food courts</span>
                  </div>
                  <span className="mobile-nav-arrow">
                    <ChevronRight size={14} strokeWidth={2.4} />
                  </span>
                </a>
              </li>
              <li>
                <a href="#pricing" className="mobile-nav-item" onClick={(e) => handleNavClick(e, 'pricing')}>
                  <span className="mobile-nav-icon">
                    <Tag size={16} strokeWidth={2.2} />
                  </span>
                  <div className="mobile-nav-text">
                    <span className="mobile-nav-label">Pricing Plans</span>
                    <span className="mobile-nav-desc">Starting at ₹833/month · Free 100 bills</span>
                  </div>
                  <span className="mobile-nav-arrow">
                    <ChevronRight size={14} strokeWidth={2.4} />
                  </span>
                </a>
              </li>
            </ul>

            <div className="mobile-drawer-cta">
              <button
                className="mobile-primary-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                aria-label="Launch Counter365 Web"
              >
                <div className="mobile-btn-content">
                  <Laptop size={16} strokeWidth={2.2} />
                  <span>Launch Counter365 Web</span>
                </div>
                <ArrowRight size={15} strokeWidth={2.4} />
              </button>
              <div className="mobile-sub-actions">
                <span>Free 100 bills included</span>
                <a
                  href="https://play.google.com/store/search?q=Counter%20365&c=apps"
                  target="_blank"
                  rel="noreferrer"
                  className="mobile-sub-link"
                >
                  Android App ↗
                </a>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Marquee Category Strip */}
      <div className="mq">
        <div id="m1">
          {[
            { name: 'Tea stalls', icon: '🫖' },
            { name: 'Cafés', icon: '☕' },
            { name: 'Juice shops', icon: '🧃' },
            { name: 'Bakeries', icon: '🥐' },
            { name: 'Restaurants', icon: '🍽️' },
            { name: 'Snack counters', icon: '🥟' },
            { name: 'Sweet shops', icon: '🍬' },
            { name: 'Food courts', icon: '🍱' },
            { name: 'Tea stalls', icon: '🫖' },
            { name: 'Cafés', icon: '☕' },
            { name: 'Juice shops', icon: '🧃' },
            { name: 'Bakeries', icon: '🥐' },
            { name: 'Restaurants', icon: '🍽️' },
            { name: 'Snack counters', icon: '🥟' },
            { name: 'Sweet shops', icon: '🍬' },
            { name: 'Food courts', icon: '🍱' },
          ].map((cat, idx) => (
            <span key={idx} className="mq-pill">
              <i className="mq-icon">{cat.icon}</i>
              {cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <header className="hero" id="top">
        <div className="big">365</div>
        <div className="wrap">
          <div>
            <span className="pill">
              <b></b>Built for counters that never sleep
            </span>
            <h1>
              <span>Bill a customer in </span>
              <span className="w g">one tap.</span>
            </h1>
            <p className="lead">
              Counter 365 is the fastest billing app for tea stalls, cafés, juice shops and restaurants. Tap for full, hold for half, and hand over the bill before the chai cools.
            </p>
            <div className="cta">
              <a className="store" href="https://play.google.com/store/search?q=Counter%20365&c=apps" target="_blank" rel="noreferrer">
                <svg>
                  <use href="#gp" />
                </svg>
                <span>
                  <small style={{ color: 'rgba(255, 255, 255, 0.85)' }}>GET IT ON</small>
                  <b style={{ color: '#FFFFFF' }}>Google Play</b>
                </span>
              </a>
              <a className="store" href="#">
                <svg>
                  <use href="#ap" />
                </svg>
                <span>
                  <small style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Download on the</small>
                  <b style={{ color: '#FFFFFF' }}>App Store</b>
                </span>
              </a>
            </div>
            <div className="trust">
              <span>Works on your phone & web browser</span>
              <span>No training needed</span>
              <span>Made for ₹ shops</span>
            </div>
          </div>

          {/* Interactive Live Demo */}
          <div className="demo">
            <div className="spin">
              <svg viewBox="0 0 120 120">
                <defs>
                  <path id="cp" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
                </defs>
                <text>
                  <textPath href="#cp" textLength="284" lengthAdjust="spacing">
                    TAP = FULL ✦ HOLD = HALF ✦ [–] = MINUS ✦{' '}
                  </textPath>
                </text>
              </svg>
              <img
                src="/counter365_icon_dark.png"
                alt="Counter 365"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                }}
              />
            </div>
            <div className="dh">
              <span className="live">Live demo · try it</span>
              <span>Tap = full · Hold = half</span>
            </div>

            <div className="ig">
              {demoItems.map((item, i) => (
                <button
                  key={i}
                  className="it"
                  onClick={(e) => {
                    handleAddItem(i, 2);
                    triggerFly(e.currentTarget);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleAddItem(i, 1);
                    triggerFly(e.currentTarget);
                  }}
                  title="Tap to add Full · Hold or Right-click for ½ Half"
                >
                  <div className="it-img-wrap">
                    <img src={item.image} alt={item.name} className="it-photo" loading="eager" />
                    <span className="it-price-tag">{formatRupee(item.price)}</span>
                  </div>
                  <b className="it-title">{item.name}</b>
                  <span className="it-sub">Tap full · Hold ½</span>
                </button>
              ))}
            </div>

            {/* Bill Receipt Component */}
            <div className={`rc ${receiptState}`}>
              <div className="hd">
                ELITE TEA STALL
                <br />
                Bill #0042
              </div>
              <div>
                {quantities.some(q => q > 0) ? (
                  quantities.map((count, i) => {
                    if (!count) return null;
                    const amount = (demoItems[i].price * count) / 2;
                    return (
                      <div className="rr" key={i}>
                        <span>
                          {qtyString(count)} × {demoItems[i].name}
                        </span>
                        <span>
                          {formatRupee(amount)}
                          <button
                            className="mn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(i);
                            }}
                          >
                            –
                          </button>
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="rr" style={{ opacity: 0.5 }}>
                    Tap an item to start a bill
                  </div>
                )}
              </div>
              <div className="tt">
                <span>TOTAL</span>
                <b id="tot">{formatRupee(shownTotal)}</b>
              </div>
              <div className="stamp">PAID</div>
            </div>

            <button className="btn pr" onClick={handlePrintDemo}>
              Print bill
            </button>
          </div>
        </div>
      </header>

      {/* Section: Why Counter 365 */}
      <section id="why">
        <div className="wrap">
          <span className="ey rv">Why Counter 365</span>
          <h2 className="rv">Goodbye notebook and calculator.</h2>
          <div className="cmp">
            <div className="old rv">
              <h3>The old counter</h3>
              <ul style={{ padding: 0 }}>
                <li>Adding totals in your head during the rush</li>
                <li>Half portions and mistakes get messy</li>
                <li>No idea which items really sell</li>
                <li>Slow lines at the busiest hour</li>
              </ul>
            </div>
            <div className="new rv">
              <h3>With Counter 365</h3>
              <ul style={{ padding: 0 }}>
                <li>The total updates the moment you tap</li>
                <li>Hold for half, [–] to fix a mistake</li>
                <li>Mostly Used items rise to the top</li>
                <li>Next customer in one tap with New Bill</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Features Bento Grid */}
      <section id="features" style={{ background: 'var(--bg2)' }}>
        <div className="wrap">
          <span className="ey rv">Features</span>
          <h2 className="rv">Made for one hand on the cup.</h2>
          <p className="lead rv">Every screen is built for speed at the counter.</p>
          <div className="bento">
            <div className="bc w rv">
              <h3>Tap, hold, done</h3>
              <p>One gesture for every portion size.</p>
              <div className="gs">
                <div>
                  <b>Tap</b>Full
                </div>
                <div>
                  <b>Hold</b>Half
                </div>
                <div>
                  <b>[–]</b>Minus
                </div>
              </div>
            </div>
            <div className="bc w rv">
              <h3>Mostly Used rises to the top</h3>
              <p>Your best sellers are always within thumb reach.</p>
              <div className="mu">
                <div className="ma">
                  <span>Hot Coffee</span>🔥
                </div>
                <div className="mb">
                  <span>Super Tea Full</span>
                </div>
                <div className="mc">
                  <span>Black Tea</span>
                </div>
              </div>
            </div>
            <div className="bc rv">
              <h3>Know what sells</h3>
              <p>Your day, at a glance.</p>
              <div className="bars">
                <i style={{ height: '40%' }}></i>
                <i style={{ height: '70%' }}></i>
                <i style={{ height: '50%' }}></i>
                <i style={{ height: '90%' }}></i>
                <i style={{ height: '65%' }}></i>
              </div>
            </div>
            <div className="bc rv">
              <h3>Instant search</h3>
              <p>Two letters and it’s there.</p>
              <div className="sb">
                <span className="ty">Kesar</span>
              </div>
              <div className="rs">Kesar Tea · ₹40</div>
            </div>
            <div className="bc rv">
              <h3>Smart categories</h3>
              <p>Big menus stay tidy.</p>
              <div className="cs">
                <span>All</span>
                <span>Mostly Used</span>
                <span>Tea/Coffee</span>
                <span>Juice</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Who it's for */}
      <section id="who">
        <div className="band rv">
          <span className="ey">Made for every counter</span>
          <h2>From a corner chai stall to a full café.</h2>
          <div className="stats">
            <div>
              <b data-n="3">3</b>
              <span>gestures to learn: tap, hold, minus</span>
            </div>
            <div>
              <b data-n="1">1</b>
              <span>tap to add a full item</span>
            </div>
            <div>
              <b data-n="365">365</b>
              <span>days a year, rain or shine</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Languages */}
      <section id="lang">
        <div className="wrap lang">
          <div>
            <span className="ey rv">Languages</span>
            <h2 className="rv">Speaks your customers’ language.</h2>
            <p className="lead rv">
              Show items and bills in English, Tamil or Hindi, so every customer and every helper feels at home.
            </p>
            <div className="tabs rv">
              {(['English', 'தமிழ்', 'हिन्दी'] as const).map(lang => (
                <button
                  key={lang}
                  className={`tab ${selectedLang === lang ? 'active' : ''}`}
                  onClick={() => setSelectedLang(lang)}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
          <div className="paper rv">
            {languageReceiptData[selectedLang].slice(0, 3).map((row, idx) => (
              <div className="r" key={idx}>
                <span>{row[0]}</span>
                <b>{row[1]}</b>
              </div>
            ))}
            <div className="t">
              <span>{languageReceiptData[selectedLang][3]}</span>
              <span>₹90</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Pricing */}
      <section id="pricing" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <span className="ey">PLANS & PRICING</span>
          <h2>Simple, transparent counter pricing.</h2>
          <p className="lead" style={{ maxWidth: '640px' }}>
            No hidden setup fees or surprise charges. Pick the duration that fits your business scale. All prices shown below exclude GST.
          </p>

          <div className="pricing-grid">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`p-card ${plan.isPopular ? 'featured' : ''}`}
              >
                {plan.isPopular && <div className="p-badge">MOST POPULAR · SAVE ₹500</div>}
                {plan.isBestValue && <div className="p-badge" style={{ background: '#1c1917' }}>BEST VALUE · SAVE ₹2,000</div>}

                <div className="p-dur">{plan.duration}</div>
                <div className="p-sub">{plan.sub}</div>

                <div className="p-price-wrap">
                  {plan.originalPrice && (
                    <div className="p-orig">₹{plan.originalPrice.toLocaleString('en-IN')}</div>
                  )}
                  <div className="p-val">
                    ₹{plan.price.toLocaleString('en-IN')}
                    <span> / {plan.duration.toLowerCase()}</span>
                  </div>
                  <div>
                    <span className="p-tax">Excl. GST (18% tax added at checkout)</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--mute)' }}>
                    {plan.ratePerMonth}
                  </div>
                </div>

                <ul className="p-feats">
                  {plan.features.map((f, idx) => (
                    <li key={idx}>
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className="p-cta"
                  onClick={() => setSelectedPlanModal(plan)}
                >
                  Select {plan.duration} Plan →
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '13px', color: 'var(--mute)' }}>
            Note: All plan prices shown above are excluding GST. Applicable 18% GST (CGST 9% + SGST 9%) will be calculated upon selecting your plan.
          </div>
        </div>
      </section>

      {/* Section: Call To Action */}
      <section id="get" style={{ paddingTop: 0 }}>
        <div className="fin rv">
          <div className="cup">
            <div className="steam">
              <i></i>
              <i></i>
              <i></i>
            </div>
            <div className="cup-rounder">
              <svg viewBox="0 0 136 136" className="cup-spin-svg">
                <defs>
                  <path id="cup-text-path" d="M68,68 m-51,0 a51,51 0 1,1 102,0 a51,51 0 1,1 -102,0" />
                </defs>
                <text>
                  <textPath href="#cup-text-path" textLength="316" lengthAdjust="spacing">
                    COUNTER 365 ✦ SMART BILLING ✦ FAST POS ✦{' '}
                  </textPath>
                </text>
              </svg>
              <div className="cup-core">
                <img
                  src="/counter365_icon.png"
                  alt="Counter 365"
                />
              </div>
            </div>
          </div>
          <h2>Make every rush hour feel easy.</h2>
          <p className="lead">Open Counter 365 and send your first bill today.</p>
          <div className="cta">
            <a className="store" href="https://play.google.com/store/search?q=Counter%20365&c=apps" target="_blank" rel="noreferrer">
              <svg>
                <use href="#gp" />
              </svg>
              <span>
                <small style={{ color: 'rgba(255, 255, 255, 0.85)' }}>GET IT ON</small>
                <b style={{ color: '#FFFFFF' }}>Google Play</b>
              </span>
            </a>
            <a className="store" href="#">
              <svg>
                <use href="#ap" />
              </svg>
              <span>
                <small style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Download on the</small>
                <b style={{ color: '#FFFFFF' }}>App Store</b>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="ft">
        <div className="wrap">
          {/* 4-Column Grid */}
          <div className="fg">
            {/* Col 1: Brand & Stores */}
            <div>
              <a className="logo" href="#top" onClick={(e) => handleNavClick(e, 'top')}>
                <img src="/counter365_logo_white.png" alt="Counter 365" style={{ height: '30px', width: 'auto', objectFit: 'contain', display: 'block' }} />
              </a>
              <p style={{ margin: '8px 0 12px', maxWidth: '34ch', lineHeight: 1.5, color: '#a3988b', fontSize: '0.86rem' }}>
                Effortless 3-second billing, real-time inventory, and khata dues tracking for restaurants, juice bars, tea counters & retail outlets.
              </p>
              <div className="stores" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', maxWidth: '330px' }}>
                <a
                  className="store"
                  href="https://play.google.com/store/search?q=Counter%20365&c=apps"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: '1 1 145px',
                    width: '145px',
                    height: '46px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    boxSizing: 'border-box',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <svg style={{ width: '22px', height: '22px', flexShrink: 0 }}>
                    <use href="#gp" />
                  </svg>
                  <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.1 }}>
                    <small style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '9px', whiteSpace: 'nowrap' }}>GET IT ON</small>
                    <b style={{ color: '#FFFFFF', fontSize: '0.92rem', whiteSpace: 'nowrap' }}>Google Play</b>
                  </span>
                </a>
                <a
                  className="store"
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  title="Coming soon to App Store"
                  style={{
                    flex: '1 1 145px',
                    width: '145px',
                    height: '46px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    boxSizing: 'border-box',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <svg style={{ width: '22px', height: '22px', flexShrink: 0 }}>
                    <use href="#ap" />
                  </svg>
                  <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.1 }}>
                    <small style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '9px', whiteSpace: 'nowrap' }}>Download on the</small>
                    <b style={{ color: '#FFFFFF', fontSize: '0.92rem', whiteSpace: 'nowrap' }}>App Store</b>
                  </span>
                </a>
              </div>
            </div>

            {/* Col 2: Navigation */}
            <div>
              <h4>Explore</h4>
              <ul className="fg-links">
                <li>
                  <a href="#why" onClick={(e) => handleNavClick(e, 'why')}>
                    Why Counter 365
                  </a>
                </li>
                <li>
                  <a href="#features" onClick={(e) => handleNavClick(e, 'features')}>
                    Features & Hardware
                  </a>
                </li>
                <li>
                  <a href="#who" onClick={(e) => handleNavClick(e, 'who')}>
                    Who It Is For
                  </a>
                </li>
                <li>
                  <a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')}>
                    Pricing & Plans
                  </a>
                </li>
                <li>
                  <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
                    Start Free Trial
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Contact & Support */}
            <div>
              <h4>Direct Contact</h4>
              <div className="ft-contact-card">
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#8f8578', display: 'block', marginBottom: '2px' }}>Demo & Sales Hotline</span>
                  <a href="tel:+918870500106" className="ft-contact-phone">
                    +91 88705 00106
                  </a>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <a
                    className="ft-social-link"
                    href="https://wa.me/918870500106?text=Hi%20Counter%20365%2C%20I%20would%20like%20to%20request%20a%20free%20demo%20call."
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path
                        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2Z"
                        fill="#25D366"
                      />
                      <path
                        d="M17.5 14.67C17.2 14.52 15.73 13.8 15.46 13.7C15.19 13.6 15 13.55 14.8 13.85C14.6 14.15 14.04 14.82 13.87 15.01C13.7 15.2 13.53 15.22 13.23 15.07C12.93 14.92 11.98 14.61 10.85 13.6C9.97 12.82 9.38 11.85 9.21 11.55C9.04 11.25 9.19 11.09 9.34 10.94C9.48 10.8 9.65 10.57 9.8 10.4C9.95 10.23 10 10.1 10.1 9.9C10.2 9.7 10.15 9.53 10.07 9.38C10 9.23 9.4 7.76 9.15 7.16C8.91 6.58 8.67 6.66 8.49 6.65C8.32 6.64 8.12 6.64 7.92 6.64C7.72 6.64 7.4 6.71 7.13 7.01C6.86 7.31 6.1 8.02 6.1 9.47C6.1 10.92 7.15 12.32 7.3 12.52C7.45 12.72 9.38 15.7 12.33 16.97C13.03 17.27 13.58 17.45 14.01 17.59C14.71 17.81 15.35 17.78 15.85 17.7C16.41 17.62 17.58 17 17.82 16.32C18.06 15.65 18.06 15.07 17.99 14.95C17.92 14.82 17.77 14.75 17.5 14.67Z"
                        fill="#FFFFFF"
                      />
                    </svg>
                    <span>WhatsApp Demo</span>
                  </a>
                  <a
                    className="ft-social-link"
                    href="https://instagram.com/stylefleet"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <defs>
                        <linearGradient id="ft-ig-grad" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#f09433" />
                          <stop offset="25%" stopColor="#e6683c" />
                          <stop offset="50%" stopColor="#dc2743" />
                          <stop offset="75%" stopColor="#cc2366" />
                          <stop offset="100%" stopColor="#bc1888" />
                        </linearGradient>
                      </defs>
                      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="url(#ft-ig-grad)" strokeWidth="2" />
                      <circle cx="12" cy="12" r="4.2" stroke="url(#ft-ig-grad)" strokeWidth="2" />
                      <circle cx="17.5" cy="6.5" r="1.3" fill="url(#ft-ig-grad)" />
                    </svg>
                    <span>Instagram</span>
                  </a>
                </div>
                <p className="ft-timing-note">
                  Operating Hours: Mon – Sat<br />
                  9:00 AM – 8:00 PM IST
                </p>
              </div>
            </div>

            {/* Col 4: Legal */}
            <div>
              <h4>Legal</h4>
              <ul className="fg-links">
                <li>
                  <a
                    href="#privacy"
                    onClick={(e) => {
                      e.preventDefault();
                      setPolicyModal('privacy');
                    }}
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#terms"
                    onClick={(e) => {
                      e.preventDefault();
                      setPolicyModal('terms');
                    }}
                  >
                    Terms & Conditions
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Watermark Logo Silhouette */}
          <div className="fbig" aria-hidden="true">
            <img
              src="/counter365_logo_white.png"
              alt="Counter 365"
            />
          </div>

          {/* Bottom Bar: Left (Copyright + Powered by Tecstellar below it) | Right (Back to top) */}
          <div className="fb">
            <div className="fb-left">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>© 2026 Counter 365.</span>
                <span style={{ opacity: 0.35 }}>·</span>
                <span>Made with ☕ for counters everywhere</span>
              </div>

              {/* Powered by Tecstellar Container (Compact, positioned below 2026 Counter 365) */}
              <div className="ft-powered-block" style={{ marginTop: '4px' }}>
                <span className="ft-powered-txt">Powered by</span>
                <a
                  href="https://tecstellar.com"
                  target="_blank"
                  rel="noreferrer"
                  className="ft-tecstellar-chip"
                  title="Tecstellar Technologies — Building Next-Gen Software"
                >
                  <img
                    src="/tecstellar_logo.png"
                    alt="Tecstellar"
                    className="ft-tecstellar-logo-img"
                  />
                  <svg
                    className="ft-tecstellar-arrow"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="fb-right">
              <a
                className="ft-back-to-top"
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                title="Back to top"
                aria-label="Back to top"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Checkout / Plan Details Modal with 18% GST Split-up */}
      {selectedPlanModal && (
        <div
          className="checkout-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPlanModal(null);
          }}
        >
          <div className="checkout-modal">
            {/* Close Button */}
            <button
              className="checkout-close"
              onClick={() => setSelectedPlanModal(null)}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Shop Brand Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <img
                src="/counter365_mark.png"
                alt="Counter365 Logo"
                style={{ width: '40px', height: '40px', objectFit: 'contain' }}
              />
              <div>
                <b style={{ font: '700 18px var(--font-head)', display: 'block', color: 'var(--ink)' }}>
                  {selectedPlanModal.duration} Pro License
                </b>
                <small style={{ color: 'var(--mute)', fontSize: '12.5px' }}>
                  Counter 365 Cloud Point of Sale
                </small>
              </div>
            </div>

            {/* Tax Info Alert */}
            <div
              style={{
                background: '#fff8f2',
                border: '1px solid #ffd8c2',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '12px',
                color: '#9a3412',
                lineHeight: 1.4,
                marginBottom: '16px',
              }}
            >
              <b>GST Split-up Breakdown:</b> Applicable 18% GST (CGST 9% + SGST 9%) calculated below on the base plan price.
            </div>

            {/* Receipt Summary Slip */}
            <div className="checkout-slip">
              <div className="row">
                <span>Plan ({selectedPlanModal.duration})</span>
                <b>₹{selectedPlanModal.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
              </div>

              <div className="row tax">
                <span>CGST (9%)</span>
                <b>+ ₹{(selectedPlanModal.price * 0.09).toFixed(2)}</b>
              </div>

              <div className="row tax">
                <span>SGST (9%)</span>
                <b>+ ₹{(selectedPlanModal.price * 0.09).toFixed(2)}</b>
              </div>

              <div className="row" style={{ fontSize: '12.5px', color: '#78716c' }}>
                <span>Total Tax (18%)</span>
                <span>₹{(selectedPlanModal.price * 0.18).toFixed(2)}</span>
              </div>

              <div className="row total">
                <div>
                  <span style={{ display: 'block', fontWeight: 700, color: 'var(--ink)' }}>Final Total Amount</span>
                  <small style={{ fontSize: '11.5px', color: 'var(--mute)' }}>Incl. 18% GST</small>
                </div>
                <b>₹{(selectedPlanModal.price * 1.18).toFixed(2)}</b>
              </div>
            </div>

            {/* Call to action */}
            <button
              className="p-cta"
              style={{
                background: 'var(--o)',
                color: '#fff',
                fontSize: '15px',
                padding: '15px 20px',
                boxShadow: '0 10px 24px -6px rgba(255, 95, 0, 0.5)',
                marginBottom: '12px',
              }}
              onClick={() => {
                navigate('/login?plan=' + selectedPlanModal.id);
              }}
            >
              Proceed to Sign In & Pay · ₹{(selectedPlanModal.price * 1.18).toFixed(2)}
            </button>

            <div style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--mute)' }}>
              🔒 256-bit Encrypted Checkout · Instant Cloud Counter Activation · GST ITC Invoice Included
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy & Terms of Service Modal */}
      {policyModal && (
        <div
          className="checkout-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPolicyModal(null);
          }}
        >
          <div className="policy-modal">
            <button
              className="checkout-close"
              onClick={() => setPolicyModal(null)}
              aria-label="Close"
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, borderBottom: '1px solid #f4efea', paddingBottom: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#fff3ea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #fed7aa',
                  flexShrink: 0,
                }}
              >
                <img src="/counter365_icon.png" alt="Counter 365" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              </div>
              <div>
                <h3 style={{ font: '800 20px var(--font-head)', margin: 0, color: 'var(--ink)' }}>
                  {policyModal === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
                </h3>
                <small style={{ color: 'var(--mute)', fontSize: '12px' }}>
                  Counter 365 · Powered by Tecstellar · Effective 2026
                </small>
              </div>
            </div>

            <div className="policy-body">
              {policyModal === 'privacy' ? (
                <>
                  <h5>1. Overview & Commitment</h5>
                  <p>
                    Counter 365, developed and operated by <b>Tecstellar</b> ("we", "us", "our"), provides fast point-of-sale, billing, and counter management solutions for restaurants, cafés, bakeries, juice stalls, and quick-service food businesses. We treat your shop data, financial records, and customer relationships with the highest security standards.
                  </p>

                  <h5>2. Data We Collect</h5>
                  <ul>
                    <li><b>Shop Information:</b> Business name, branch details, tax / GSTIN registration, contact number, and counter configuration.</li>
                    <li><b>Catalog & Inventory:</b> Menu items, categories, pricing, tax rates, and modifier setups.</li>
                    <li><b>Transaction & Due Records:</b> Order history, timestamped receipts, payment modes, and customer due balances entered by your staff.</li>
                    <li><b>Customer Contact Info:</b> Phone numbers and names voluntarily entered at checkout to deliver digital WhatsApp / SMS receipts and track credit balances.</li>
                  </ul>

                  <h5>3. How Your Data Is Used</h5>
                  <ul>
                    <li>To compute bills accurately, format thermal receipts, and sync transactions in real time between your mobile devices and web terminals.</li>
                    <li>To maintain persistent sales analytics, shift totals, and customer balance books.</li>
                    <li>We <b>never</b> sell, rent, or trade your data or your customers' contact numbers to third-party advertisers.</li>
                  </ul>

                  <h5>4. Cloud Security & Storage</h5>
                  <p>
                    All communication between your counter terminals and Counter 365 cloud servers is secured via TLS 1.3 with 256-bit encryption. Offline data is stored in tamper-safe local browser storage and synchronizes automatically upon reconnecting to the internet.
                  </p>

                  <h5>5. Data Control & Deletion</h5>
                  <p>
                    You retain total ownership of your commercial data. You may export sales summaries or request permanent deletion of your account and related database records at any time by contacting our support desk.
                  </p>

                  <h5>6. Contact Our Privacy Team</h5>
                  <p>
                    If you have questions regarding privacy or data handling, reach out to us at{' '}
                    <a href="mailto:support@tecstellar.com" style={{ color: 'var(--o)', fontWeight: 600 }}>
                      support@tecstellar.com
                    </a>{' '}
                    or call <b>+91 88705 00106</b>.
                  </p>
                </>
              ) : (
                <>
                  <h5>1. Agreement to Terms</h5>
                  <p>
                    By registering, accessing, or subscribing to Counter 365 (via web or mobile applications), you agree to be bound by these Terms and Conditions provided by <b>Tecstellar</b>. If you do not agree to these terms, please do not use the software.
                  </p>

                  <h5>2. License & Service Scope</h5>
                  <p>
                    Tecstellar grants you a non-exclusive, non-transferable subscription license to use Counter 365 for your commercial billing and counter operations. Features, device limits, and reporting depth correspond to your active subscription plan (1 Month, 6 Months, or 1 Year).
                  </p>

                  <h5>3. Merchant Responsibilities</h5>
                  <ul>
                    <li>You are solely responsible for ensuring the accuracy of food items, prices, discounts, and GST percentages configured in your system.</li>
                    <li>You agree to maintain the confidentiality of your login PINs and one-time passwords (OTP).</li>
                    <li>You warrant that all transactions billed through Counter 365 comply with applicable local commerce and taxation laws.</li>
                  </ul>

                  <h5>4. Subscription, Pricing & Taxes</h5>
                  <p>
                    Subscription fees are prepaid according to the chosen billing cycle. All listed plan prices are subject to statutory Indian Goods and Services Tax (18% GST). Upon payment, you receive a valid GST tax invoice for input tax credit (ITC) claims.
                  </p>

                  <h5>5. Service Availability & Offline Capability</h5>
                  <p>
                    Counter 365 is designed with offline-first billing so your counters never halt during internet drops. While Tecstellar targets 99.9% cloud synchronization uptime, we are not liable for business interruptions caused by hardware failure, network outages, or device-level issues.
                  </p>

                  <h5>6. Governing Law & Support</h5>
                  <p>
                    These terms are governed by the laws of India. For support, customization, or billing inquiries, contact Tecstellar via WhatsApp / phone at <b>+91 88705 00106</b> or email <b>support@tecstellar.com</b>.
                  </p>
                </>
              )}
            </div>

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #f4efea', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPolicyModal(null)}
                style={{
                  background: 'var(--o)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '99px',
                  padding: '10px 24px',
                  font: '700 13.5px var(--sans)',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(255, 90, 0, 0.25)',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
