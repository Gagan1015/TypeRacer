import { Link } from "react-router-dom";
import { TypingDemo } from "./TypingDemo";

export function HeroSection() {
  return (
    <section className="relative pb-20 pt-12 sm:pb-28 sm:pt-20">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-[#e2b714]/[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e2b714]/20 bg-[#e2b714]/5 px-4 py-1.5 text-xs text-[#e2b714]">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e2b714]" />
            <span>Real-time competitive typing</span>
          </div>
        </div>

        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-5xl font-bold leading-[1.1] tracking-tight text-[#d1d0c5] sm:text-6xl lg:text-7xl">
            Type faster.{" "}
            <span className="bg-gradient-to-r from-[#e2b714] to-[#f0cd4d] bg-clip-text text-transparent">
              Race smarter.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[#d1d0c5]/80 sm:text-lg">
            Compete in real-time typing races, track your WPM, climb global
            leaderboards, and prove you're the fastest typist.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            to="/signup"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#e2b714] to-[#d4a50f] px-8 py-3.5 text-sm font-semibold text-[#1e2228] shadow-[0_4px_24px_rgba(226,183,20,0.3)] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(226,183,20,0.4)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Start Racing
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </Link>
          <Link
            to="/leaderboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#3b3f47] bg-[#2c2e33]/50 px-8 py-3.5 text-sm font-medium text-[#d1d0c5] backdrop-blur-sm transition-all duration-200 hover:border-[#e2b714]/30 hover:bg-[#2c2e33]/80"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 8 7 8m10 1h1.5a2.5 2.5 0 0 0 0-5C17 4 17 8 17 8M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22m7-7.34V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            View Leaderboard
          </Link>
        </div>

        {/* Typing Demo */}
        <div className="mx-auto mt-16 max-w-3xl sm:mt-20">
          <TypingDemo />
        </div>
      </div>
    </section>
  );
}
