import { useEffect, useRef, useState } from "react";

const features = [
  {
    icon: "⚡",
    title: "Real-time Racing",
    description: "Timed modes from 15s to custom durations — push your limits every race.",
    gradient: "from-amber-500/10 to-orange-500/10",
    borderGlow: "hover:border-amber-500/30"
  },
  {
    icon: "🏆",
    title: "Leaderboards",
    description: "Compete globally, track your seasonal rank, and watch yourself climb.",
    gradient: "from-yellow-500/10 to-amber-500/10",
    borderGlow: "hover:border-yellow-500/30"
  },
  {
    icon: "👥",
    title: "Multiplayer",
    description: "Create rooms, invite friends, and race head-to-head in real time.",
    gradient: "from-blue-500/10 to-cyan-500/10",
    borderGlow: "hover:border-blue-500/30"
  },
  {
    icon: "📊",
    title: "Detailed Stats",
    description: "WPM, accuracy, personal bests by mode — every keystroke tracked.",
    gradient: "from-emerald-500/10 to-teal-500/10",
    borderGlow: "hover:border-emerald-500/30"
  },
  {
    icon: "🛡️",
    title: "Anti-Cheat",
    description: "Fair play enforced with automated detection — no copy-pasting allowed.",
    gradient: "from-red-500/10 to-rose-500/10",
    borderGlow: "hover:border-red-500/30"
  },
  {
    icon: "🎯",
    title: "Ranked Matches",
    description: "Elo-based matchmaking — climb the competitive ladder and earn your tier.",
    gradient: "from-purple-500/10 to-violet-500/10",
    borderGlow: "hover:border-purple-500/30"
  }
];

function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.15) {
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

export function FeaturesGrid() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef);

  return (
    <section ref={sectionRef} className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#e2b714]">
            Features
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#d1d0c5] sm:text-4xl">
            Everything you need to{" "}
            <span className="text-[#e2b714]">dominate</span>
          </h2>
          <p className="mt-4 text-sm text-[#646669] sm:text-base">
            Built for competitive typists who want more than just a test.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <div
              key={feature.title}
              className={`group relative overflow-hidden rounded-2xl border border-[#3b3f47]/50 bg-gradient-to-br ${feature.gradient} p-6 transition-all duration-300 ${feature.borderGlow} hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-8 ${
                inView
                  ? "translate-y-0 opacity-100"
                  : "translate-y-6 opacity-0"
              }`}
              style={{
                transitionDelay: inView ? `${idx * 80}ms` : "0ms"
              }}
            >
              {/* Glow effect on hover */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#e2b714]/[0.04] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative">
                <span className="mb-4 inline-block text-3xl">{feature.icon}</span>
                <h3 className="mb-2 font-display text-lg font-semibold text-[#d1d0c5]">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#9ba3af]">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
