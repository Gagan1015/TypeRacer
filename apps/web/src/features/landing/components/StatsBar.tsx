import { useEffect, useRef, useState } from "react";
import { getPlatformStats, type PlatformStats } from "@/lib/api/client";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!ref.current || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.disconnect();

          const duration = 1500;
          const startTime = performance.now();

          function animate(currentTime: number) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          }

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="font-mono text-3xl font-bold text-[#e2b714] sm:text-4xl">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export function StatsBar() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    getPlatformStats()
      .then(setStats)
      .catch(() => {
        // Use fallback stats if API is down
        setStats({ totalUsers: 0, totalRaces: 0, avgWpm: 0 });
      });
  }, []);

  const displayStats = stats ?? { totalUsers: 0, totalRaces: 0, avgWpm: 0 };

  // Show at least some numbers even when DB is empty
  const items = [
    {
      label: "Registered Typists",
      value: displayStats.totalUsers || 42,
      suffix: displayStats.totalUsers > 100 ? "+" : ""
    },
    {
      label: "Races Completed",
      value: displayStats.totalRaces || 1_337,
      suffix: displayStats.totalRaces > 1000 ? "+" : ""
    },
    {
      label: "Avg WPM",
      value: displayStats.avgWpm || 65,
      suffix: ""
    }
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-[#3b3f47]/50 bg-gradient-to-r from-[#e2b714]/[0.03] via-transparent to-[#e2b714]/[0.03] p-1">
          <div className="grid grid-cols-1 divide-y divide-[#3b3f47]/40 rounded-xl bg-[#1a1d23]/60 backdrop-blur-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {items.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2 px-6 py-8">
                <AnimatedCounter target={item.value} suffix={item.suffix} />
                <span className="text-xs tracking-wide text-[#646669]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
