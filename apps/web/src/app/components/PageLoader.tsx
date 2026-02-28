export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      {/* Animated spinner */}
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-[#3a3d42]" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#e2b714]" />
      </div>
      <p className="text-xs tracking-widest text-[#646669]">loading</p>
    </div>
  );
}
