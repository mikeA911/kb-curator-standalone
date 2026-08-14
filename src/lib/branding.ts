// Single source of truth for the app logo. The header (both authenticated
// and public) and the browser tab icon (see src/app/layout.tsx) all import
// this instead of hardcoding the path separately -- swap the referenced
// file, or repoint this constant at a new one, and every usage updates
// together.
export const LOGO_PATH = '/images/Logo1.jpg'
