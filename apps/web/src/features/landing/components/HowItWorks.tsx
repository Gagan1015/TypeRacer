import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Create an account",
    description: "Sign up with email or use Google / GitHub OAuth — it takes 10 seconds.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    )
  },
  {
    number: "02",
    title: "Choose your mode",
    description: "Pick timed races (15s–120s), fixed-length passages, or ranked matches.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )
  },
  {
    number: "03",
    title: "Climb the ranks",
    description: "Track your WPM over time, crush personal bests, and rise on leaderboards.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    )
  }
];

function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.2) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return inView;
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef);

  return (
    <section ref={sectionRef} className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#e2b714]">
            How it works
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#d1d0c5] sm:text-4xl">
            Ready to race in{" "}
            <span className="text-[#e2b714]">3 steps</span>
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, idx) => (
            <div
              key={step.number}
              className={`relative transition-all duration-500 ${
                inView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: inView ? `${idx * 150}ms` : "0ms" }}
            >
              {/* Connector line (desktop only) */}
              {idx < steps.length - 1 && (
                <div className="pointer-events-none absolute right-0 top-12 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-[#3b3f47] to-transparent md:block" />
              )}

              <div className="group relative flex flex-col items-center text-center">
                {/* Icon circle */}
                <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#3b3f47]/60 bg-[#2c2e33]/50 text-[#e2b714] transition-all duration-300 group-hover:border-[#e2b714]/30 group-hover:shadow-[0_0_30px_rgba(226,183,20,0.08)]">
                  {step.icon}
                  {/* Step number badge */}
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#e2b714] font-mono text-[10px] font-bold text-[#1e2228]">
                    {step.number}
                  </span>
                </div>

                <h3 className="mb-2 font-display text-lg font-semibold text-[#d1d0c5]">
                  {step.title}
                </h3>
                <p className="max-w-xs text-sm leading-relaxed text-[#9ba3af]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
