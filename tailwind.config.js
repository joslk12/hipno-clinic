/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--oc-bg)',
        surface: 'var(--oc-surface)',
        'surface-alt': 'var(--oc-surface-alt)',
        text: 'var(--oc-text)',
        'text-muted': 'var(--oc-text-muted)',
        accent: 'var(--oc-accent)',
        'accent-satin': 'var(--oc-accent-satin)',
        gold: 'var(--oc-gold)',
        border: 'var(--oc-border)',
        charcoal: '#1a1a1a',
        'soft-charcoal': '#252525',
        ivory: '#f9f9f9',
        muted: '#a0a0a0'
      },
      fontFamily: {
        display: ['Cinzel', 'Cormorant Garamond', 'Georgia', 'serif'],
        accent: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Montserrat', 'Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        gold: 'var(--oc-shadow-gold)'
      }
    },
  },
  plugins: [],
}

