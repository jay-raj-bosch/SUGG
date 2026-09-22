/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL?: string;
	readonly VITE_AZURE_TRANSLATOR_KEY?: string;
	readonly VITE_AZURE_TRANSLATOR_REGION?: string;
	readonly VITE_AZURE_TRANSLATOR_ENDPOINT?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
