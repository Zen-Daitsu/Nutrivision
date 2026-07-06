// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#f8f9ff',
        surface: '#f8f9ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-high': '#dce9ff',
        primary: '#006c49',
        'primary-container': '#10b981',
        'on-primary-container': '#00422b',
        secondary: '#9d4300',
        'secondary-container': '#fd761a',
        'on-surface': '#0b1c30',
        'on-surface-variant': '#3c4a42',
        'outline-variant': '#bbcabf',
        tertiary: '#5d5f5f',
      },
      spacing: {
        'base': 4,
        'xs': 8,
        'sm': 16,
        'md': 24,
        'lg': 40,
        'xl': 64,
        'gutter': 16,
        'margin-mobile': 16,
        'margin-desktop': 32,
      },
      borderRadius: {
        'sm': 4,
        'DEFAULT': 8,
        'md': 12,
        'lg': 16,
        'xl': 24,
        'full': 9999,
      },
    },
  },
  plugins: [],
}