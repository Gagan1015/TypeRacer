const config = {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                display: ["Sora", "sans-serif"],
                body: ["Manrope", "sans-serif"],
                mono: ["IBM Plex Mono", "monospace"]
            },
            colors: {
                base: "var(--color-base)",
                surface: "var(--color-surface)",
                text: "var(--color-text)",
                muted: "var(--color-muted)",
                accent: "var(--color-accent)"
            },
            transitionDuration: {
                fast: "140ms",
                normal: "240ms",
                slow: "520ms"
            }
        }
    },
    plugins: []
};
export default config;
