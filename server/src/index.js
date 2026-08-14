import './config.js';
import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`PyKnowledge API running on http://localhost:${config.port}`);
  console.log(`  Health:  http://localhost:${config.port}/api/health`);
  console.log(`  Content: http://localhost:${config.port}/api/content/lessons`);
});

async function shutdown() {
  console.log('Shutting down...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
