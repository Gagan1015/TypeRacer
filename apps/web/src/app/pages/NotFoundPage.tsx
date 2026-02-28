import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";

export function NotFoundPage() {
  useDocumentTitle("Page Not Found");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-8xl font-light text-[#e2b714]">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-[#d1d0c5]">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-[#646669]">
        The page you're looking for doesn't exist or has been moved. Let's get you back on track.
      </p>
      <div className="mt-8 flex items-center gap-4">
        <Link
          to="/"
          className="rounded-xl bg-[#e2b714]/15 px-6 py-2.5 text-sm font-medium text-[#e2b714] transition-colors hover:bg-[#e2b714]/25"
        >
          Go Home
        </Link>
        <button
          onClick={() => window.history.back()}
          className="rounded-xl border border-[#3a3d42] px-6 py-2.5 text-sm text-[#9ba3af] transition-colors hover:border-[#646669] hover:text-[#d1d0c5]"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
