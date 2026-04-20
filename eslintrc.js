module.exports = {
  root: true,

  env: {
    browser: true,
    es2021: true,
    node: true,
  },

  parser: "@typescript-eslint/parser",

  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },

  plugins: ["@typescript-eslint", "react", "react-hooks"],

  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],

  settings: {
    react: {
      version: "detect",
    },
  },

  rules: {
    "no-unused-vars": "warn",
    "react/react-in-jsx-scope": "off", // Vite doesn't need React import
    "@typescript-eslint/no-unused-vars": ["warn"],
  },
};