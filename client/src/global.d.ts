// global.d.ts
declare global {
  interface Window {
    gapi: any; // You can use 'any' or define a more specific type if needed
  }
}

export {}; // This makes the file a module and avoids "duplicate identifier" errors
