/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#faf8f3',
          100: '#f0ece4',
          200: '#d6d0c5',
          300: '#b8b0a3',
          400: '#8c8271',
          500: '#6f6657',
          600: '#514a3d',
          700: '#332f28',
          800: '#211f1b',
          900: '#151412',
          950: '#0b0b0a',
        },
        gold: {
          50: '#fffbf0',
          100: '#fff0be',
          200: '#f6d98a',
          300: '#f1c75b',
          400: '#e4b339',
          500: '#d29a14',
          600: '#b47a00',
          700: '#996400',
          800: '#754a00',
          900: '#5a3900',
          950: '#3d2600',
        },
        brand: {
          DEFAULT: '#996400',
          hover: '#754a00',
          strong: '#754a00',
          soft: '#fff0be',
          contrast: '#0b0b0a',
        },
        surface: {
          DEFAULT: '#fffbf0',
          raised: '#ffffff',
          muted: '#f0ece4',
        },
        text: {
          DEFAULT: '#0b0b0a',
          muted: '#514a3d',
          subtle: '#6f6657',
          inverse: '#ffffff',
        },
        border: '#d6d0c5',
        focus: '#d29a14',
        success: {
          DEFAULT: '#166534',
          soft: '#dcfce7',
        },
        warning: {
          DEFAULT: '#754a00',
          soft: '#fff0be',
        },
        danger: {
          DEFAULT: '#b42318',
          soft: '#fee4e2',
        },
      },
      borderRadius: {
        sm: '0.5rem',
        md: '0.75rem',
        card: '0.875rem',
        lg: '1rem',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 12px 32px rgb(11 11 10 / 8%)',
        focus: '0 0 0 3px rgb(228 179 57 / 35%)',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        30: '7.5rem',
      },
    },
  },
  plugins: [],
}
