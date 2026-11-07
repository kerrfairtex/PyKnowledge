// Prisma 7+ config for migrations
// The Runtime API reads config from here for migrations
export default {
  datasourceUrl: process.env.DATABASE_URL || process.env.DIRECT_URL,
};