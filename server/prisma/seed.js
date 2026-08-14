import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

async function main() {
  const lessonsPath = join(root, 'content/lessons.json');
  const quizzesPath = join(root, 'content/quizzes.json');

  const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));
  const quizzes = JSON.parse(readFileSync(quizzesPath, 'utf8'));

  await prisma.contentManifest.updateMany({ data: { isActive: false } });

  const manifest = await prisma.contentManifest.create({
    data: {
      version: lessons.version,
      curriculum: lessons.curriculum,
      lessonsData: lessons,
      quizzesData: quizzes,
      isActive: true
    }
  });

  let institution = await prisma.institution.findFirst({ where: { name: 'TRAC' } });
  if (!institution) {
    institution = await prisma.institution.create({
      data: { name: 'TRAC', region: 'BARMM', type: 'college' }
    });
  }

  console.log('Seed complete:');
  console.log(`  Content manifest: v${manifest.version} (${manifest.id})`);
  console.log(`  Institution: ${institution.name}`);
  console.log(`  Modules: ${lessons.modules.length}`);
  console.log(`  Quizzes: ${quizzes.quizzes.length}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
