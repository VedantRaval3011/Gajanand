// Allow side-effect imports of plain CSS files (e.g. third-party stylesheets
// like 'react-datepicker/dist/react-datepicker.css'). Next.js bundles these,
// but TypeScript needs a module declaration to satisfy the type checker.
declare module "*.css";
