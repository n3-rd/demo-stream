/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUBLIC_ANT_MEDIA_URL: string;
  readonly PUBLIC_POCKETBASE_INSTANCE: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 