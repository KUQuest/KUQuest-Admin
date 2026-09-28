import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      // The CSS entrypoint disables automatic scanning and explicitly scopes
      // Tailwind sources to `src`, avoiding non-runtime repository content.
      base: projectRoot,
    },
  },
};

export default config;
