import "dotenv/config";
import prisma from "../src/config/db";

const SEEDED_MISSION_TITLES = [
  "Patrulha da Estrada Velha",
  "Ruinas do Vigia",
  "Cerco do Forte",
] as const;

type Options = {
  resetCharacters: boolean;
  deleteAdminMissions: boolean;
  deleteAllMissions: boolean;
  confirm: boolean;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Options {
  const args = new Set(argv);

  if (args.has("--help") || args.has("-h")) {
    printHelp();
    process.exit(0);
  }

  const deleteAllMissions = args.has("--delete-all-missions");

  return {
    resetCharacters: args.has("--reset-characters"),
    deleteAdminMissions: args.has("--delete-admin-missions"),
    deleteAllMissions,
    confirm: args.has("--confirm"),
    dryRun: !args.has("--confirm"),
  };
}

function printHelp() {
  console.log(`
Uso:
  npx ts-node scripts/reset-game-state.ts [opcoes]

Opcoes:
  --reset-characters       Limpa tabelas ligadas a personagens
  --delete-admin-missions  Remove missoes fora da lista seedada
  --delete-all-missions    Remove todas as missoes
  --confirm                Executa a exclusao de fato
  --help, -h               Exibe esta ajuda

Observacoes:
  - Sem --confirm, o script roda em dry-run e mostra o que seria apagado.
  - --delete-admin-missions preserva as missoes seedadas por titulo:
    ${SEEDED_MISSION_TITLES.join(", ")}
  `);
}

async function summarizeCharacterReset() {
  const [
    characters,
    inventories,
    items,
    equipments,
    transactions,
    actionLogs,
    rewardClaims,
    paymentOrders,
  ] = await prisma.$transaction([
    prisma.character.count(),
    prisma.inventory.count(),
    prisma.item.count(),
    prisma.equipment.count(),
    prisma.transaction.count(),
    prisma.characterActionLog.count(),
    prisma.rewardClaim.count(),
    prisma.paymentOrder.count(),
  ]);

  return {
    characters,
    inventories,
    items,
    equipments,
    transactions,
    actionLogs,
    rewardClaims,
    paymentOrders,
  };
}

async function resetCharacters() {
  const summary = await summarizeCharacterReset();

  await prisma.$transaction(async (tx) => {
    await tx.paymentOrder.deleteMany({});
    await tx.rewardClaim.deleteMany({});
    await tx.transaction.deleteMany({});
    await tx.characterActionLog.deleteMany({});
    await tx.item.deleteMany({});
    await tx.equipment.deleteMany({});
    await tx.character.deleteMany({});
    await tx.inventory.deleteMany({});
  });

  return summary;
}

async function summarizeMissionDeletion(deleteAllMissions: boolean) {
  const where = deleteAllMissions
    ? {}
    : {
        title: {
          notIn: [...SEEDED_MISSION_TITLES],
        },
      };

  const [missions, sample] = await prisma.$transaction([
    prisma.missionDefinition.count({ where }),
    prisma.missionDefinition.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        createdAt: true,
        isActive: true,
      },
      take: 20,
    }),
  ]);

  return { missions, sample };
}

async function deleteMissions(deleteAllMissions: boolean) {
  const where = deleteAllMissions
    ? {}
    : {
        title: {
          notIn: [...SEEDED_MISSION_TITLES],
        },
      };

  const summary = await summarizeMissionDeletion(deleteAllMissions);
  const result = await prisma.missionDefinition.deleteMany({ where });

  return {
    ...summary,
    deletedCount: result.count,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.resetCharacters && !options.deleteAdminMissions && !options.deleteAllMissions) {
    printHelp();
    process.exit(1);
  }

  if (options.deleteAdminMissions && options.deleteAllMissions) {
    throw new Error("Use apenas uma das opcoes: --delete-admin-missions ou --delete-all-missions.");
  }

  console.log(`Modo: ${options.dryRun ? "DRY-RUN" : "EXECUCAO"}`);

  if (options.resetCharacters) {
    const summary = await summarizeCharacterReset();
    console.log("Resumo do reset de personagens:", summary);

    if (options.confirm) {
      const deleted = await resetCharacters();
      console.log("Tabelas de personagem limpas:", deleted);
    }
  }

  if (options.deleteAdminMissions || options.deleteAllMissions) {
    const missionSummary = await summarizeMissionDeletion(options.deleteAllMissions);
    console.log("Resumo da limpeza de missoes:", missionSummary);

    if (!options.deleteAllMissions && missionSummary.missions > 0) {
      console.log(
        "Criterio usado: remover apenas missoes com titulo fora da lista seedada conhecida."
      );
    }

    if (options.confirm) {
      const deleted = await deleteMissions(options.deleteAllMissions);
      console.log("Missoes removidas:", deleted.deletedCount);
    }
  }
}

main()
  .catch((error) => {
    console.error("Falha ao executar manutencao:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
