/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_TWOFACTOR_API_KEY: string;
  readonly VITE_TWOFACTOR_TEMPLATE_NAME: string;
  readonly VITE_PAYU_ENV: string;
  readonly VITE_PAYU_MERCHANT_ID: string;
  readonly VITE_PAYU_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
