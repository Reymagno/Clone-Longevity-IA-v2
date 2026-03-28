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
        'accent-warm': '#C9A84C',
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
        'glass': 'linear-gradient(135deg, rgba(10, 22, 40, 0.7) 0%, rgba(13, 30, 56, 0.5) 100%)',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(0,229,160,0.05)',
        'accent': '0 0 20px rgba(0,229,160,0.3)',
        'accent-lg': '0 0 40px rgba(0,229,160,0.2), 0 8px 32px rgba(0,0,0,0.4)',
        'danger': '0 0 20px rgba(255,77,109,0.3)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
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
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config
