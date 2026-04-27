import { defineConfig, loadEnv } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

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
	};
});
