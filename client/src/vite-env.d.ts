/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'true' for the login-first CRM deployment profile used on crm.omnidevelopment.co.uk. */
  readonly VITE_CRM_ONLY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
