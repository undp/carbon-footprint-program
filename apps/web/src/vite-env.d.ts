/// <reference types="vite/client" />

declare module "*.svg" {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AZURE_FRONT_CLIENT_ID?: string;
  readonly VITE_AZURE_AUTH_AUTHORITY?: string;
  readonly VITE_AZURE_SING_IN_REDIRECT_URI?: string;
  readonly VITE_AZURE_API_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
