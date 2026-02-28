import { useState, useEffect, useRef } from "react";

const sentences = [
  "The quick brown fox jumps over the lazy dog near the riverbank.",
  "Programming is the art of telling another human what one wants the computer to do.",
  "Speed and accuracy are the twin pillars of competitive typing races.",
  "Every expert was once a beginner who refused to give up on their dreams."
];

export function TypingDemo() {
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [wpm, setWpm] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  const currentSentence = sentences[sentenceIdx] ?? sentences[0]!;
  const typed = currentSentence.slice(0, charIdx);

  useEffect(() => {
    startTimeRef.current = Date.now();
    setCharIdx(0);
    setWpm(0);
  }, [sentenceIdx]);

  useEffect(() => {
    if (charIdx >= currentSentence.length) {
      // Wait then move to next sentence
      const timeout = setTimeout(() => {
        setSentenceIdx((prev) => (prev + 1) % sentences.length);
      }, 1500);
      return () => clearTimeout(timeout);
    }

    // Variable typing speed for realism
    const baseDelay = 55;
    const variation = Math.random() * 40 - 15;
    const char = currentSentence[charIdx];
    const extraDelay = char === " " ? 20 : char === "." || char === "," ? 60 : 0;

    const timeout = setTimeout(() => {
      setCharIdx((prev) => prev + 1);

      // Calculate WPM
      const elapsed = (Date.now() - startTimeRef.current) / 1000 / 60;
      if (elapsed > 0) {
        const words = (charIdx + 1) / 5;
        setWpm(Math.round(words / elapsed));
      }
    }, baseDelay + variation + extraDelay);

    return () => clearTimeout(timeout);
  }, [charIdx, currentSentence]);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[#3b3f47]/60 bg-[#1a1d23]/80 shadow-[0_8px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm">
      {/* Terminal header */}
      <div className="flex items-center justify-between border-b border-[#3b3f47]/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="font-mono text-xs text-[#646669]">typeracrer — race mode</span>
        <div className="w-14" />
      </div>

      {/* Typing area */}
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <p className="font-mono text-sm leading-relaxed tracking-wide sm:text-base">
          {currentSentence.split("").map((char, idx) => {
            let className = "text-[#4a4d52]"; // untyped
            if (idx < charIdx) {
              className = "text-[#d1d0c5]"; // typed correctly
            } else if (idx === charIdx) {
              className =
                "relative text-[#4a4d52] before:absolute before:inset-y-0 before:-left-px before:w-[2px] before:bg-[#e2b714] before:animate-pulse";
            }
            return (
              <span key={idx} className={className}>
                {char}
              </span>
            );
          })}
        </p>
      </div>

      {/* WPM Counter */}
      <div className="flex items-center justify-between border-t border-[#3b3f47]/40 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#646669]">WPM</span>
            <span className="font-mono text-xl font-bold text-[#e2b714]">{wpm}</span>
          </div>
          <div className="h-4 w-px bg-[#3b3f47]" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#646669]">ACC</span>
            <span className="font-mono text-sm text-[#28c840]">100%</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#28c840]" />
          <span className="text-xs text-[#646669]">live</span>
        </div>
      </div>
    </div>
  );
}
