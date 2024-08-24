import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	preview: { host: "127.0.0.1", port: 3000 },
	server:{ host: "127.0.0.1", port: 3000 },
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
