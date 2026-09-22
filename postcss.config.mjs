import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      // Keep Tailwind's automatic class scan inside application source. The
      // repository also contains Markdown and agent documentation with CSS
      // examples that are not runtime UI and can produce invalid candidates.
      base: path.join(projectRoot, "src"),
    },
  },
};

export default config;
