import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

function useInView(ref: React.RefObject<HTMLElement | null>, options?: { once?: boolean; margin?: string }) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          if (options?.once) observer.disconnect();
        } else if (!options?.once) {
          setInView(false);
        }
      },
      { threshold: 0.15, rootMargin: options?.margin ?? "0px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options?.once, options?.margin]);

  return inView;
}

/* ── SVG Icon Components ── */

function IconRacing({ color }: { color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function IconLeaderboard({ color }: { color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function IconMultiplayer({ color }: { color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconStats({ color }: { color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}

function IconShield({ color }: { color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconTarget({ color }: { color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

/* ── Feature data ── */

const features = [
  {
    Icon: IconRacing,
    title: "Real-time Racing",
    description: "Timed modes from 15s to custom durations — push your limits every race.",
    gradient: "from-amber-500/12 to-orange-500/8",
    iconBg: "bg-amber-500/10",
    accentColor: "#f59e0b",
    micro: "speed" as const
  },
  {
    Icon: IconLeaderboard,
    title: "Leaderboards",
    description: "Compete globally, track your seasonal rank, and watch yourself climb.",
    gradient: "from-yellow-500/12 to-amber-500/8",
    iconBg: "bg-yellow-500/10",
    accentColor: "#eab308",
    micro: "trophy" as const
  },
  {
    Icon: IconMultiplayer,
    title: "Multiplayer",
    description: "Create rooms, invite friends, and race head-to-head in real time.",
    gradient: "from-blue-500/12 to-cyan-500/8",
    iconBg: "bg-blue-500/10",
    accentColor: "#3b82f6",
    micro: "pulse" as const
  },
  {
    Icon: IconStats,
    title: "Detailed Stats",
    description: "WPM, accuracy, personal bests by mode — every keystroke tracked.",
    gradient: "from-emerald-500/12 to-teal-500/8",
    iconBg: "bg-emerald-500/10",
    accentColor: "#10b981",
    micro: "bars" as const
  },
  {
    Icon: IconShield,
    title: "Anti-Cheat",
    description: "Fair play enforced with automated detection — no copy-pasting allowed.",
    gradient: "from-sky-500/12 to-blue-500/8",
    iconBg: "bg-sky-500/10",
    accentColor: "#0ea5e9",
    micro: "shield" as const
  },
  {
    Icon: IconTarget,
    title: "Ranked Matches",
    description: "Elo-based matchmaking — climb the competitive ladder and earn your tier.",
    gradient: "from-purple-500/12 to-violet-500/8",
    iconBg: "bg-purple-500/10",
    accentColor: "#a855f7",
    micro: "target" as const
  }
];

/* ── Micro-interaction components ── */

function SpeedMicro({ color }: { color: string }) {
  return (
    <div className="flex items-end gap-[3px]">
      {[0.6, 1, 0.8, 0.5, 0.9, 0.7, 1, 0.6].map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{ backgroundColor: color, opacity: 0.6 }}
          animate={{
            height: [h * 16, ((h + 0.4) % 1) * 16 + 4, h * 16],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

function TrophyMicro({ color }: { color: string }) {
  return (
    <div className="flex items-end gap-1">
      {[40, 65, 100].map((h, i) => (
        <motion.div
          key={i}
          className="w-3 rounded-t"
          style={{ backgroundColor: color, opacity: i === 2 ? 0.7 : 0.35 }}
          initial={{ height: 0 }}
          whileInView={{ height: h * 0.24 }}
          transition={{ duration: 0.6, delay: 0.3 + i * 0.15, ease: "easeOut" }}
          viewport={{ once: true }}
        />
      ))}
    </div>
  );
}

function PulseMicro({ color }: { color: string }) {
  return (
    <div className="relative flex items-center justify-center">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ border: `1.5px solid ${color}` }}
          animate={{
            width: [8, 28],
            height: [8, 28],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut"
          }}
        />
      ))}
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color, opacity: 0.8 }} />
    </div>
  );
}

function BarsMicro({ color }: { color: string }) {
  return (
    <div className="flex items-end gap-1">
      {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-sm"
          style={{ backgroundColor: color }}
          initial={{ height: 0, opacity: 0 }}
          whileInView={{ height: h * 20, opacity: 0.6 }}
          transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease: "easeOut" }}
          viewport={{ once: true }}
        />
      ))}
    </div>
  );
}

function ShieldMicro({ color }: { color: string }) {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
        <motion.path
          d="M11 1L2 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L11 1z"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          viewport={{ once: true }}
        />
        <motion.path
          d="M7.5 12L10 14.5L15 9.5"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
          viewport={{ once: true }}
        />
      </svg>
    </motion.div>
  );
}

function TargetMicro({ color }: { color: string }) {
  return (
    <div className="relative flex items-center justify-center">
      {[20, 14, 8].map((size, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{ borderColor: color, width: size, height: size, opacity: 0.3 + i * 0.15 }}
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 + i * 0.15, ease: "backOut" }}
          viewport={{ once: true }}
        />
      ))}
      <motion.div
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.8, type: "spring", stiffness: 300 }}
        viewport={{ once: true }}
      />
    </div>
  );
}

const microComponents: Record<string, React.FC<{ color: string }>> = {
  speed: SpeedMicro,
  trophy: TrophyMicro,
  pulse: PulseMicro,
  bars: BarsMicro,
  shield: ShieldMicro,
  target: TargetMicro
};

/* ── Feature card ── */

function FeatureCard({
  feature,
  index
}: {
  feature: (typeof features)[number];
  index: number;
}) {
  const MicroComponent = microComponents[feature.micro];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1]
      }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className="group relative"
    >
      <div
        className={`relative overflow-hidden rounded-2xl border border-[#3b3f47]/50 bg-gradient-to-br ${feature.gradient} p-6 transition-all duration-300 sm:p-8`}
        style={{
          boxShadow: "0 2px 20px rgba(0,0,0,0.15)"
        }}
      >
        {/* Hover glow */}
        <motion.div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
          style={{ backgroundColor: feature.accentColor }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 0.06 }}
        />

        {/* Accent line on top */}
        <motion.div
          className="absolute left-0 top-0 h-[2px] rounded-full"
          style={{ backgroundColor: feature.accentColor }}
          initial={{ width: 0, opacity: 0 }}
          whileInView={{ width: "40%", opacity: 0.5 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: "easeOut" }}
        />

        {/* Content */}
        <div className="relative">
          {/* Icon + micro-interaction row */}
          <div className="mb-5 flex items-center justify-between">
            <motion.div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${feature.iconBg}`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <feature.Icon color={feature.accentColor} />
            </motion.div>

            {/* Micro-interaction */}
            <div className="h-6 w-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {MicroComponent ? <MicroComponent color={feature.accentColor} /> : null}
            </div>
          </div>

          <h3 className="mb-2 font-display text-lg font-semibold text-[#d1d0c5] transition-colors duration-200 group-hover:text-white">
            {feature.title}
          </h3>
          <p className="text-sm leading-relaxed text-[#9ba3af]">
            {feature.description}
          </p>

          {/* Bottom shine line */}
          <motion.div
            className="absolute -bottom-4 left-0 h-px"
            style={{ background: `linear-gradient(90deg, ${feature.accentColor}00, ${feature.accentColor}40, ${feature.accentColor}00)` }}
            initial={{ width: 0, opacity: 0 }}
            whileInView={{ width: "100%", opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.6 + index * 0.1, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main component ── */

export function FeaturesGrid() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-20">
          <motion.p
            className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#e2b714]"
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            Features
          </motion.p>
          <motion.h2
            className="font-display text-3xl font-bold tracking-tight text-[#d1d0c5] sm:text-4xl"
            initial={{ opacity: 0, y: 15 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Everything you need to{" "}
            <span className="text-[#e2b714]">dominate</span>
          </motion.h2>
          <motion.p
            className="mt-4 text-sm text-[#646669] sm:text-base"
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Built for competitive typists who want more than just a test.
          </motion.p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={idx}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
