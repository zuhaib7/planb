/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONSULTATION_ENDPOINT?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
