# Ubuntu School Network

A modern, comprehensive school management system built with React, TypeScript, and Firebase. Ubuntu School Network embodies the philosophy of "I am because we are" - connecting students, teachers, parents, and administrators in a collaborative educational community.

## Features

- **Student Management** - Track student information, grades, and progress
- **Teacher Tools** - Assignment management, grade tracking, and class organization
- **Parent Portal** - View student progress and communicate with teachers
- **Administrative Dashboard** - Comprehensive school oversight and reporting
- **Multi-language Support** - Available in English and Afrikaans
- **Real-time Updates** - Live data synchronization across all users
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile

## Tech Stack

- **Frontend:** React 19, TypeScript, Mantine UI
- **Backend:** Firebase (Firestore, Authentication, Functions)
- **Deployment:** Firebase Hosting (Production), GitHub Pages (Testing)
- **Build Tool:** Vite
- **Internationalization:** i18next

## Getting Started

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    "react-x": reactX,
    "react-dom": reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs["recommended-typescript"].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```
