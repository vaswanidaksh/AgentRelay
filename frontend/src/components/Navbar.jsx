import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSectionClick = (e, sectionId) => {
    e.preventDefault();
    setMobileOpen(false);

    if (location.pathname === '/') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/', { state: { scrollTo: sectionId } });
    }
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'glass-dark border-b border-white/[0.06] shadow-[0_1px_30px_rgba(0,0,0,0.5)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group select-none">
          <div className="relative w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-base shadow-inner group-hover:border-white/20 group-hover:bg-white/[0.09] transition-all duration-250">
            🔗
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_70%)]" />
          </div>
          <span className="font-semibold text-base tracking-tight text-white/90 group-hover:text-white transition-colors">
            AgentRelay
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7 text-[13px] font-medium text-white/40">
          {[
            { label: 'Features', id: 'features' },
            { label: 'Agents', id: 'agents' },
            { label: 'Security', id: 'security' },
          ].map(({ label, id }) => (
            <a
              key={label}
              href={`#${id}`}
              onClick={(e) => handleSectionClick(e, id)}
              className="hover:text-white/85 transition-colors duration-200 tracking-[0.01em] cursor-pointer"
            >
              {label}
            </a>
          ))}
          <Link
            to="/docs"
            className={`transition-colors duration-200 tracking-[0.01em] ${
              location.pathname === '/docs' || location.pathname === '/install'
                ? 'text-white font-semibold'
                : 'hover:text-white/85'
            }`}
          >
            Docs
          </Link>
        </nav>

        {/* Right CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="text-[13px] font-medium text-white/50 hover:text-white/85 transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="text-[13px] font-medium text-white/35 hover:text-white/70 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-[13px] font-medium text-white/45 hover:text-white/80 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/dashboard"
                className="btn-shimmer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-white text-black hover:bg-white/90 transition-colors duration-200 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              >
                Get started
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-white/50 hover:text-white/90 transition-colors cursor-pointer"
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass-dark border-t border-white/[0.06] px-5 py-5 space-y-4">
          {[
            { label: 'Features', id: 'features' },
            { label: 'Agents', id: 'agents' },
            { label: 'Security', id: 'security' },
          ].map(({ label, id }) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => handleSectionClick(e, id)}
              className="block text-sm text-white/55 hover:text-white/90 transition-colors cursor-pointer"
            >
              {label}
            </a>
          ))}
          <Link
            to="/docs"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-white/55 hover:text-white/90 transition-colors"
          >
            Docs
          </Link>
          <Link
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="block w-full text-center mt-4 py-2.5 rounded-lg bg-white text-black text-sm font-semibold"
          >
            Get started
          </Link>
        </div>
      )}
    </header>
  );
}
