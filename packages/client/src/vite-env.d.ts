interface ImportMetaEnv {
	readonly VITE_APP_HASH: string;
	readonly VITE_APP_VERSION: string;
	readonly VITE_APP_LAST_COMMIT_LINK: string;

	readonly VITE_GIT_BASE: string;
	readonly VITE_API_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
