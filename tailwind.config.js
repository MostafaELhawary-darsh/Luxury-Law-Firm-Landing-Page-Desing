/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: {
          DEFAULT: '#0B132B',
          light: '#1C2545',
          deep: '#060B1A',
        },
        charcoal: {
          DEFAULT: '#1A1A1A',
          light: '#2A2A2A',
        },
        cream: {
          DEFAULT: '#F8F9FA',
          dark: '#EEF0F2',
        },
        gold: {
          DEFAULT: '#C5A059',
          light: '#D4AF37',
          dark: '#B8941F',
          pale: '#E8D9B0',
        },
        ink: '#2C3E50',
        locc: {
          bg: '#080B11',
          surface: '#0F141F',
          border: '#1E2638',
          hover: '#182030',
          gold: {
            DEFAULT: '#D4AF37',
            light: '#E2B857',
            dim: 'rgba(212, 175, 55, 0.15)',
          },
          cyan: {
            DEFAULT: '#00D8F6',
            dim: 'rgba(0, 216, 246, 0.15)',
          },
          critical: {
            DEFAULT: '#FF2A5F',
            glow: 'rgba(255, 42, 95, 0.4)',
            dim: 'rgba(255, 42, 95, 0.12)',
          },
          warning: {
            DEFAULT: '#FFB020',
            glow: 'rgba(255, 176, 32, 0.35)',
            dim: 'rgba(255, 176, 32, 0.12)',
          },
          success: {
            DEFAULT: '#00E5A3',
            glow: 'rgba(0, 229, 163, 0.35)',
            dim: 'rgba(0, 229, 163, 0.12)',
          },
        },
      },
      fontFamily: {
        heading: ['Cairo', 'sans-serif'],
        body: ['Tajawal', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-critical': '0 0 20px -3px rgba(255, 42, 95, 0.5)',
        'glow-warning': '0 0 20px -3px rgba(255, 176, 32, 0.4)',
        'glow-success': '0 0 20px -3px rgba(0, 229, 163, 0.4)',
        'glow-cyan': '0 0 20px -3px rgba(0, 216, 246, 0.4)',
        'glow-gold': '0 0 15px -3px rgba(212, 175, 55, 0.3)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 1s ease-out forwards',
        'fade-in': 'fadeIn 1.2s ease-out forwards',
        'ken-burns': 'kenBurns 25s ease-out forwards',
        'scroll-indicator': 'scrollIndicator 2s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'sweep 4s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        kenBurns: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.15)' },
        },
        scrollIndicator: {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.3' },
          '50%': { transform: 'translateY(10px)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      transitionTimingFunction: {
        'luxury': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
