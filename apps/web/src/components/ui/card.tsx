import type { PropsWithChildren } from "react";
import { clsx } from "clsx";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={clsx(
        "clip-lane rounded-2xl border border-[#3a3e46] bg-[#20242b]/95 p-5 shadow-[0_16px_45px_rgba(0,0,0,0.3)] backdrop-blur-sm transition duration-normal",
        className
      )}
    >
      {children}
    </div>
  );
}
