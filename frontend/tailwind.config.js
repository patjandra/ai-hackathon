/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Clean clinical light: cool neutrals (slate family) + white surfaces.
        cream: '#f8fafc', // app background (slate-50)
        sand: '#f1f5f9', // chip / inset background (slate-100)
        clay: '#e2e8f0', // borders (slate-200)
        ink: {
          900: '#0f172a', // slate-900
          700: '#334155', // slate-700
          500: '#64748b', // slate-500
          400: '#94a3b8', // slate-400
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,0.04), 0 6px 20px rgba(15,23,42,0.06)',
        lift: '0 10px 40px rgba(15,23,42,0.10)',
        glow: '0 0 0 6px rgba(99,102,241,0.10)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'soft-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.04)', opacity: '0.92' },
        },
        'ring-pulse': {
          '0%': { boxShadow: '0 0 0 0 rgba(99,102,241,0.35)' },
          '70%': { boxShadow: '0 0 0 22px rgba(99,102,241,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'soft-pulse': 'soft-pulse 2s ease-in-out infinite',
        'ring-pulse': 'ring-pulse 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
