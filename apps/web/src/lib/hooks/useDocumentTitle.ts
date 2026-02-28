import { useEffect } from "react";

const BASE_TITLE = "TypeRacrer";

/**
 * Sets the document title when the component mounts.
 * Resets to the base title on unmount.
 */
export function useDocumentTitle(title?: string) {
    useEffect(() => {
        document.title = title ? `${title} — ${BASE_TITLE}` : BASE_TITLE;

        return () => {
            document.title = BASE_TITLE;
        };
    }, [title]);
}
