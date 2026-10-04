import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  const cols = [
    {
      heading: 'Product',
      links: ['Features', 'Supported Agents', 'Security', 'Changelog'],
    },
    {
      heading: 'Docs',
      links: ['Install Guide', 'CLI Reference', 'API & Sockets', 'SDK'],
    },
    {
      heading: 'Company',
      links: ['About', 'Blog', 'Careers', 'Y Combinator ↗'],
    },
    {
      heading: 'Legal',
      links: ['Privacy Policy', 'Terms of Service', 'Security', 'Cookies'],
    },
  ];

  return (
    <footer className="border-t border-white/[0.05] bg-[#0A0A0A] py-16 px-5">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand col */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2.5 group mb-4">
              <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.09] flex items-center justify-center text-sm">
                🔗
              </div>
              <span className="font-semibold text-sm text-white/70 group-hover:text-white/90 transition-colors">
                AgentRelay
              </span>
            </Link>
            <p className="text-xs text-white/22 leading-relaxed mt-1 max-w-[160px]">
              Everyone's AI coding sessions, in one shared drive.
            </p>
          </div>

          {/* Link columns */}
          {cols.map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-white/22 mb-4">
                {heading}
              </h4>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors duration-150">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/20">
          <span>© {year} AgentRelay Inc. All rights reserved.</span>
          <div className="flex items-center gap-5">
            {['X (Twitter)', 'GitHub', 'LinkedIn'].map((s) => (
              <a key={s} href="#" className="hover:text-white/50 transition-colors">
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
