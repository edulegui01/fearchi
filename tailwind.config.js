/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '10%': { transform: 'scale(1.05)' },
          '20%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.05)' },
          '40%': { transform: 'scale(1)' },
        },
      },
      animation: {
        heartbeat: 'heartbeat 2s ease-in-out infinite',
      },
      colors: {
        /**
         * Naranja de POSsible market.
         *
         * El 500 es el naranja exacto del logo (#f39854, muestreado del PNG);
         * el resto de la escala mantiene ese tono (H 26deg) y solo mueve
         * luminosidad y saturacion, asi que la marca no se desarma en ningun
         * componente.
         *
         * El 600 y el 700 son mas profundos que el logo a proposito. La app
         * pinta 90 superficies con `primary-600` y casi todas llevan texto
         * blanco encima: sobre el naranja del logo ese texto queda en 2.2:1 y
         * no se lee de parado frente a la terminal. Con #da711f sube a 3.3:1 y
         * con el 700 a 5.1:1. El logo se sigue viendo en su color porque va
         * sobre blanco, no sobre un boton.
         */
        primary: {
          50: '#fff6ef',
          100: '#ffe9d8',
          200: '#fdd2af',
          300: '#f9b583',
          400: '#f6a970',
          500: '#f39854',
          600: '#da711f',
          700: '#ae5416',
          800: '#8a4211',
          900: '#723816',
          950: '#3f1c07',
        },
        secondary: {
          50: '#ffffff',
          100: '#fefefe',
          200: '#fdfdfd',
          300: '#fcfcfc',
          400: '#fafafa',
          500: '#f8f8f8',
          600: '#f0f0f0',
          700: '#e8e8e8',
          800: '#d0d0d0',
          900: '#a8a8a8',
          950: '#808080',
        },
      },
    },
  },
  plugins: [],
}
