import * as dotenv from "dotenv";
dotenv.config();

import { createApp } from "./server/app";

const PORT = Number(process.env.PORT) || 3000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`\nLab 4 — Agent Server`);
  console.log(`  Running on  : http://localhost:${PORT}`);
  console.log(`  Health check: GET  http://localhost:${PORT}/health`);
  console.log(`  Agent API   : POST http://localhost:${PORT}/api/agent\n`);
});
