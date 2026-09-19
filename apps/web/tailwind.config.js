/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--bg-base)',
          elevated: 'var(--bg-elevated)',
          raised: 'var(--bg-raised)',
          overlay: 'var(--bg-overlay)'
        },
        fg: {
          primary: 'var(--fg-primary)',
          secondary: 'var(--fg-secondary)',
          tertiary: 'var(--fg-tertiary)',
          disabled: 'var(--fg-disabled)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)'
        },
        border: {
          default: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          accent: 'var(--border-accent)'
        },
        conf: {
          high: 'var(--conf-high)',
          'high-bg': 'var(--conf-high-bg)',
          medium: 'var(--conf-medium)',
          'medium-bg': 'var(--conf-medium-bg)',
          low: 'var(--conf-low)',
          'low-bg': 'var(--conf-low-bg)',
          none: 'var(--conf-none)',
          'none-bg': 'var(--conf-none-bg)'
        },
        danger: 'var(--danger)'
      },
      fontFamily: {
        display: 'var(--font-display)',
        mono: 'var(--font-mono)'
      }
    }
  },
  plugins: [],
}
