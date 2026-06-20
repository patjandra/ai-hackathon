/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_WS_BASE?: string;
  readonly VITE_DEMO_PATIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
