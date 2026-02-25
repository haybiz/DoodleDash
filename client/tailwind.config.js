/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0f172a',    // bg-slate-900
        'brand-panel': '#1e293b',   // bg-slate-800
        'brand-accent': '#6366f1',  // bg-indigo-500
        'brand-accent-hover': '#4f46e5',
      }
    },
  },
  plugins: [],
}
