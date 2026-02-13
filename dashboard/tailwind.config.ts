import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                surface: {
                    50: "#ffffff",
                    100: "#f8f9fc",
                    200: "#f1f3f8",
                    300: "#e5e8f0",
                    400: "#d1d5e0",
                    500: "#9ca3b4",
                },
                accent: {
                    purple: "#7c3aed",
                    blue: "#2563eb",
                    teal: "#0d9488",
                    pink: "#db2777",
                    orange: "#ea580c",
                },
                glass: {
                    light: "rgba(255, 255, 255, 0.7)",
                    medium: "rgba(255, 255, 255, 0.85)",
                    heavy: "rgba(255, 255, 255, 0.95)",
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            backdropBlur: {
                xs: "2px",
            },
            animation: {
                "fade-in": "fadeIn 0.5s ease-out",
                "slide-up": "slideUp 0.5s ease-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                shimmer: "shimmer 2s linear infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
