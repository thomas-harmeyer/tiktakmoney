import { defineConfig } from "orval";

export default defineConfig({
	games: {
		input: "http://localhost:5000/api/openapi.json",
		output: {
			target: "./src/api.ts",
			client: "react-query",
			baseUrl: "/api",
			override: {
				query: { useSuspenseQuery: true },
				mutator: {
					path: "./src/lib/axiosInstance.ts",
					name: "customInstance",
				},
			},
		},
	},
});
