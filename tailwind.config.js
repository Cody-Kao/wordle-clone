/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "890px",
        // => @media (min-width: 890px) { ... }
        xxs: "500px",
      },
    },
  },
  plugins: [],
};
