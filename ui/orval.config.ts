import { defineConfig } from "orval";

export default defineConfig({
  games: {
    input: "http://localhost:8000/openapi.json",
    output: {
      target: "./src/api.ts",
      baseUrl: "http://localhost:8000",
      client: "react-query",
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
