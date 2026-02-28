import { HeroSection } from "../components/HeroSection";
import { FeaturesGrid } from "../components/FeaturesGrid";
import { HowItWorks } from "../components/HowItWorks";
import { StatsBar } from "../components/StatsBar";
import { Footer } from "../components/Footer";

export function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-[#3b3f47]/30 bg-[#25282f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e2b714]/50 bg-[#e2b714]/10 text-sm font-bold text-[#e2b714]">
              tr
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-[#d1d0c5] sm:text-2xl">
              typeracrer
            </span>
          </a>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-[#9ba3af] transition-colors hover:text-[#d1d0c5]"
            >
              Sign In
            </a>
            <a
              href="/signup"
              className="rounded-xl bg-[#e2b714]/15 px-5 py-2 text-sm font-semibold text-[#e2b714] transition-all hover:bg-[#e2b714]/25"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Page sections */}
      <HeroSection />

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#3b3f47]/60 to-transparent" />
      </div>

      <FeaturesGrid />

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#3b3f47]/60 to-transparent" />
      </div>

      <HowItWorks />

      <StatsBar />

      {/* Final CTA */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#d1d0c5] sm:text-4xl">
            Ready to prove your speed?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-[#9ba3af] sm:text-base">
            Join the community of competitive typists. Create a free account and
            start racing in less than a minute.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="/signup"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#e2b714] to-[#d4a50f] px-8 py-3.5 text-sm font-semibold text-[#1e2228] shadow-[0_4px_24px_rgba(226,183,20,0.3)] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(226,183,20,0.4)]"
            >
              Create Free Account
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
