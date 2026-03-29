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
        background: '#0B2118',
        card: '#112F22',
        'card-elevated': '#183C2C',
        accent: '#2EAE7B',
        'accent-hover': '#38C78E',
        'accent-muted': '#1E7A56',
        'accent-warm': '#D4AF37',
        warning: '#D4A03A',
        danger: '#D4536A',
        info: '#5BA4C9',
        border: '#215440',
        muted: '#215440',
        'muted-foreground': '#6B6660',
        foreground: '#E2DFD6',
        'card-foreground': '#F5E6B8',
        'gold-100': '#F5E6B8',
        'gold-200': '#D4AF37',
        'gold-300': '#B8963A',
        'gold-400': '#9A7D3A',
        'gold-500': '#7A6330',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-gradient': 'linear-gradient(135deg, #112F22 0%, #122F23 100%)',
        'accent-gradient': 'linear-gradient(135deg, #2EAE7B 0%, #1E8A62 100%)',
        'glass': 'linear-gradient(135deg, rgba(17, 47, 34, 0.75) 0%, rgba(24, 60, 44, 0.5) 100%)',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(46,174,123,0.05)',
        'accent': '0 0 20px rgba(46,174,123,0.3)',
        'accent-lg': '0 0 40px rgba(46,174,123,0.2), 0 8px 32px rgba(0,0,0,0.4)',
        'danger': '0 0 20px rgba(212,83,106,0.3)',
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
