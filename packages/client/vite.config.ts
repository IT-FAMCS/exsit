import { defineConfig, loadEnv } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import * as child from "node:child_process";

const getCommitInformation = (type: "shortHash" | "longHash" | "message") => {
	const format = type === "message" ? "%s" : type === "shortHash" ? "%h" : "%H";
	return child.execSync(`git log -1 --pretty=${format}`).toString().trim();
};

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
		preview: {
			port: Number(env.PORT),
			strictPort: true,
		},
		server: {
			port: Number(env.PORT),
			strictPort: true,
			allowedHosts: [env.HOSTNAME],
		},
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "src"),
				"@shared": path.resolve(__dirname, "../shared/src"),
			},
		},
		define: {
			"import.meta.env.VITE_APP_HASH": JSON.stringify(getCommitInformation("shortHash")),
			"import.meta.env.VITE_APP_LAST_COMMIT_LINK": JSON.stringify(
				`${env.VITE_GIT_BASE}/commit/${getCommitInformation("longHash")}`,
			),
			"import.meta.env.VITE_APP_VERSION": JSON.stringify(env.npm_package_version),
		},
	};
});
