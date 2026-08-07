import { DEFAULT_CATEGORIES } from '@expense-tracker/shared';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // В Postgres NULL не участвует в уникальном индексе, поэтому системные
  // категории (userId = null) ищем вручную вместо upsert.
  for (const category of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name: category.name, userId: null },
    });

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { icon: category.icon, color: category.color, isDefault: true },
      });
      continue;
    }

    await prisma.category.create({
      data: { ...category, isDefault: true, userId: null },
    });
  }

  console.warn(`Сид завершён: ${DEFAULT_CATEGORIES.length} системных категорий`);
}

main()
  .catch((error: unknown) => {
    console.error('Ошибка сида:', error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
