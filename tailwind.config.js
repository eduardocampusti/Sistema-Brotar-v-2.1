/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./layouts/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      headline: ['Manrope', '"Plus Jakarta Sans"', 'sans-serif'],
      body: ['"Plus Jakarta Sans"', 'sans-serif'],
    },
    extend: {
      borderRadius: {
        stitch: '1rem',
        'stitch-lg': '2rem',
        'stitch-xl': '3rem',
      },
      colors: {
        /** Tokens do Stitch — `projects/2943493648880348875` (uso: `bg-sanctuary-*`, `text-sanctuary-*`) */
        sanctuary: {
          background: '#f8fafc',
          onBackground: '#2f3430',
          surface: '#f8fafc',
          onSurface: '#2f3430',
          onSurfaceVariant: '#5b605d',
          surfaceContainerLow: '#f1f5f9',
          surfaceContainer: '#e8edf2',
          surfaceContainerHigh: '#e2e8f0',
          surfaceContainerHighest: '#d1d9e4',
          surfaceContainerLowest: '#ffffff',
          surfaceVariant: '#e2e8f0',
          primary: '#2d6a4f',
          primaryDim: '#1f5e44',
          primaryContainer: '#b1f0ce',
          onPrimary: '#e6ffee',
          onPrimaryContainer: '#1d5c42',
          secondary: '#216299',
          secondaryDim: '#0b568c',
          secondaryContainer: '#d0e4ff',
          onSecondary: '#f7f9ff',
          onSecondaryContainer: '#07558b',
          tertiary: '#615f55',
          tertiaryContainer: '#f5f1e3',
          onTertiary: '#fdf9eb',
          onTertiaryContainer: '#5c5a50',
          outline: '#777c78',
          outlineVariant: '#afb3af',
          error: '#a73b21',
          errorContainer: '#fd795a',
          onError: '#fff7f6',
        },
        primary: {
          /** Cor sólida do Stitch para `bg-primary` / `text-primary` onde usado sem escala */
          DEFAULT: '#2d6a4f',
          dim: '#1f5e44',
          container: '#b1f0ce',
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          950: 'var(--color-primary-950)',
        },
        /** Stitch / edu — `bg-secondary`, `bg-secondary-container`, `border-secondary/20` */
        secondary: {
          DEFAULT: '#216299',
          dim: '#0b568c',
          container: '#d0e4ff',
        },
        /** Stitch tertiary — `bg-tertiary-container`, `border-tertiary/20` */
        tertiary: {
          DEFAULT: '#615f55',
          dim: '#555349',
          container: '#f5f1e3',
        },
        /** Nomes de token iguais ao `edu/code.html` (classes com hífen) */
        background: '#f8fafc',
        'on-background': '#2f3430',
        'on-surface': '#2f3430',
        'on-surface-variant': '#5b605d',
        surface: '#f8fafc',
        'surface-bright': '#f8fafc',
        'surface-container': '#f1f5f9',
        'surface-container-low': '#f8fafc',
        'surface-container-high': '#e8edf2',
        'surface-container-highest': '#e2e8f0',
        'surface-container-lowest': '#ffffff',
        outline: '#777c78',
        'outline-variant': '#afb3af',
        'on-primary': '#e6ffee',
        'on-primary-container': '#1d5c42',
        'on-secondary': '#f7f9ff',
        'on-secondary-container': '#07558b',
        'on-tertiary-container': '#5c5a50',
        'on-tertiary': '#fdf9eb',
        psy: {
          light: '#f3e8ff',
          main: '#9333ea',
          dark: '#581c87',
          gradient: 'from-purple-500 to-indigo-600'
        },
        fono: {
          light: '#ecfeff',
          main: '#06b6d4',
          dark: '#155e75',
          gradient: 'from-cyan-400 to-blue-500'
        },
        to: {
          light: '#e0e7ff',
          main: '#4f46e5',
          dark: '#312e81',
          gradient: 'from-indigo-400 to-violet-600'
        },
        social: {
          light: '#f0f9ff',
          main: '#0ea5e9',
          dark: '#075985',
          gradient: 'from-sky-400 to-blue-600'
        },
        pp: {
          light: '#fce7f3',
          main: '#db2777',
          dark: '#831843',
          gradient: 'from-pink-400 to-rose-600'
        },
        admin: {
          light: '#f8fafc',
          main: '#334155',
          dark: '#0f172a',
          gradient: 'from-slate-700 to-slate-900'
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glow': '0 0 15px rgba(var(--color-primary-500-rgb), 0.3)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.4)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
        'premium': '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.5s ease-out forwards',
        'slideUp': 'slideUp 0.5s ease-out forwards',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.02)' },
        }
      }
    }
  },
  plugins: [
    function scrollbarHide({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      });
    },
  ],
}
