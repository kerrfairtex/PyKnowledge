import { prisma } from '../lib/prisma.js';

export async function getActiveManifest() {
  return prisma.contentManifest.findFirst({
    where: { isActive: true },
    orderBy: { publishedAt: 'desc' }
  });
}

export async function getLessonsPayload() {
  const manifest = await getActiveManifest();
  if (!manifest) {
    throw new Error('No active content manifest found. Run: npm run db:seed');
  }
  return manifest.lessonsData;
}

export async function getQuizzesPayload() {
  const manifest = await getActiveManifest();
  if (!manifest) {
    throw new Error('No active content manifest found. Run: npm run db:seed');
  }
  return manifest.quizzesData;
}

export async function getManifestMeta() {
  try {
    const manifest = await getActiveManifest();
    if (!manifest) {
      return { version: null, curriculum: null, publishedAt: null, hasContent: false };
    }
    return {
      version: manifest.version,
      curriculum: manifest.curriculum,
      publishedAt: manifest.publishedAt,
      hasContent: true
    };
  } catch {
    return { version: null, curriculum: null, publishedAt: null, hasContent: false };
  }
}
