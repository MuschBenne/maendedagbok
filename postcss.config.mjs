/**
 * PostCSS-konfiguration: kopplar in Tailwind i CSS-bygget.
 *
 * Gör att klasser som `bg-surface` i komponenterna blir riktig CSS.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
