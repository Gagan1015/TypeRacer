import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-[#3b3f47]/40 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div className="flex flex-col items-center sm:items-start">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e2b714]/50 bg-[#e2b714]/10 text-sm font-bold text-[#e2b714]">
                tr
              </span>
              <span className="font-display text-xl font-semibold tracking-tight text-[#d1d0c5]">
                typeracrer
              </span>
            </div>
            <p className="mt-3 max-w-xs text-center text-xs leading-relaxed text-[#646669] sm:text-left">
              The competitive typing platform for speed demons. Race, improve,
              and climb the global leaderboards.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9ba3af]">
                Platform
              </span>
              <Link to="/signup" className="text-sm text-[#646669] transition-colors hover:text-[#d1d0c5]">
                Sign Up
              </Link>
              <Link to="/login" className="text-sm text-[#646669] transition-colors hover:text-[#d1d0c5]">
                Sign In
              </Link>
              <Link to="/leaderboard" className="text-sm text-[#646669] transition-colors hover:text-[#d1d0c5]">
                Leaderboard
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9ba3af]">
                Links
              </span>
              <a
                href="https://github.com/Gagan1015"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#646669] transition-colors hover:text-[#d1d0c5]"
              >
                GitHub
              </a>
              <a
                href="https://x.com/Gagansa47600331"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#646669] transition-colors hover:text-[#d1d0c5]"
              >
                X / Twitter
              </a>
              <a
                href="https://www.linkedin.com/in/gagan-kumar1510/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#646669] transition-colors hover:text-[#d1d0c5]"
              >
                LinkedIn
              </a>
              <a
                href="https://www.gagankumar.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#646669] transition-colors hover:text-[#d1d0c5]"
              >
                Portfolio
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center gap-3 border-t border-[#3b3f47]/30 pt-8 sm:flex-row sm:justify-between">
          <p className="text-xs text-[#4a4d52]">
            © {new Date().getFullYear()} TypeRacrer. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[#4a4d52]">
            <span>Built with</span>
            <span className="text-[#646669]">React</span>
            <span>·</span>
            <span className="text-[#646669]">Node.js</span>
            <span>·</span>
            <span className="text-[#646669]">MongoDB</span>
            <span>·</span>
            <span className="text-[#646669]">Socket.IO</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
