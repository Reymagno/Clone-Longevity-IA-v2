import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#050e1a',
        card: '#0a1628',
        accent: '#00e5a0',
        warning: '#f5a623',
        danger: '#ff4d6d',
        info: '#38bdf8',
        border: '#1a2d4a',
        muted: '#1e3a5f',
        'muted-foreground': '#64748b',
        foreground: '#e2e8f0',
        'card-foreground': '#f8fafc',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-gradient': 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)',
        'accent-gradient': 'linear-gradient(135deg, #00e5a0 0%, #00b8d9 100%)',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'accent': '0 0 20px rgba(0,229,160,0.3)',
        'danger': '0 0 20px rgba(255,77,109,0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config
