import "dotenv/config";
import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";

function main() {
  // Validate env at startup
  const env = getEnv();
  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`Lab 12 image RAG server running on http://localhost:${env.PORT}`);
  });
}

main();
