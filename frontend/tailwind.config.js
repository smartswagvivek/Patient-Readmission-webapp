/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        medical: {
          ice: "#F7F9FC",
          surface: "#E6F4FF",
          primary: "#2F80ED",
          "primary-dark": "#1E67C5",
        },
      },
      boxShadow: {
        soft: "0 12px 30px rgba(31, 87, 161, 0.12)",
        card: "0 18px 44px rgba(31, 87, 161, 0.18)",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Segoe UI"', "sans-serif"],
        display: ['"Outfit"', '"Segoe UI"', "sans-serif"],
      },
      keyframes: {
        "page-enter": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "page-enter": "page-enter 400ms ease-out",
      },
    },
  },
  plugins: [],
};
