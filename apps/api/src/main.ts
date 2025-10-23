import { createServer } from "http";

import { createApp } from "./app";

const PORT = Number(process.env.PORT ?? 4000);

const app = createApp();
const server = createServer(app);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}`);
});

