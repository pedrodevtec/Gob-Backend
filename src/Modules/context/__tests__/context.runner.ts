import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import {
  ContextClassification,
  ContextLayer,
  ContextVersionStatus,
  ContextVisibility,
} from "@prisma/client";
import express from "express";
import jwt from "jsonwebtoken";
import { env } from "../../../config/env";
import { AppError } from "../../../errors/AppError";
import { errorHandler } from "../../../middleware/errorHandler";
import { requestContext } from "../../../middleware/requestContext";
import contextRoutes from "../context.routes";
import { ContextService } from "../context.service";

const ADMIN_ID = "admin-context";
const PLAYER_ID = "player-context";

const SECRET_FRAGMENTS = [
  "Erya",
  "Zurich",
  "alma fragmentada",
  "versao popular incompleta",
  "Mandukuru reconhece",
];

const OPEN_MASTER_VARIABLES = [
  "objetivo real do ataque",
  "vinculo ameacado",
  "nivel de revelacao",
  "escolha final",
  "gancho futuro",
  "versao da lenda descoberta",
];

const EPISODE_ONE_PUBLIC_CONTENT = [
  "Ascendencia dos Guardioes apresenta pessoas marcadas por um legado antigo.",
  "Bravantus e o territorio inicial conhecido pelos jogadores.",
  "Mandukuru, a Corrupcao, os Guardioes e as Marcas fazem parte da premissa publica.",
  "A premissa publica informa que ha um ataque, sem definir sua verdade oculta.",
].join("\n");

const EPISODE_ONE_SECRET_CONTENT = [
  "Erya e Zurich fazem parte do contexto reservado ao Mestre.",
  "A alma fragmentada e corrompida altera a leitura da historia.",
  "Mandukuru reconhece e demonstra interesse por esse contexto oculto.",
  "A versao popular incompleta da historia nao deve ser tratada como verdade total.",
].join("\n");

const test = async (name: string, run: () => Promise<void> | void): Promise<void> => {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

const createToken = (id: string, accountRole: "USER" | "ADMIN") => {
  return jwt.sign({ id, accountRole }, env.JWT_SECRET, { expiresIn: "1h" });
};

const adminHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${createToken(ADMIN_ID, "ADMIN")}`,
});

const playerHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${createToken(PLAYER_ID, "USER")}`,
});

const createServer = async () => {
  const app = express();
  const basePath = `/audit-context-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  app.use(requestContext);
  app.use(express.json());
  app.use(basePath, contextRoutes);
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${address.port}${basePath}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
};

const requestJson = async (
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
) => {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body = await response.json();
  return { status: response.status, body, serialized: JSON.stringify(body) };
};

const assertNoSecretLeak = (value: unknown): void => {
  const serialized = JSON.stringify(value);
  for (const fragment of SECRET_FRAGMENTS) {
    assert.equal(serialized.includes(fragment), false, `Vazamento de segredo: ${fragment}`);
  }
  assert.equal(serialized.includes("secretUnit"), false);
  assert.equal(serialized.includes("secret-unit"), false);
  assert.equal(serialized.includes("AUTHOR_ADMIN"), false);
  assert.equal(serialized.includes("SECRET_CANON"), false);
};

const assertOpenVariablesNotPersisted = (db: ReturnType<typeof createFakeDb>): void => {
  const serialized = JSON.stringify(db.units);
  for (const variable of OPEN_MASTER_VARIABLES) {
    assert.equal(serialized.includes(variable), false, `Variavel aberta persistida: ${variable}`);
  }
};

const createFakeDb = () => {
  const settings: any[] = [];
  const episodes: any[] = [];
  const versions: any[] = [];
  const units: any[] = [];
  const calls: { lastPublicUnitsWhere?: unknown; deleteCount: number } = { deleteCount: 0 };
  let nextSetting = 1;
  let nextEpisode = 1;
  let nextVersion = 1;
  let nextUnit = 1;

  const findSetting = (where: any) =>
    settings.find((setting) => setting.id === where.id || setting.stableKey === where.stableKey) ?? null;
  const findEpisode = (where: any) =>
    episodes.find((episode) => {
      if (where.id && episode.id !== where.id) return false;
      if (where.settingId && episode.settingId !== where.settingId) return false;
      if (where.stableKey && episode.stableKey !== where.stableKey) return false;
      return true;
    }) ?? null;
  const decorateVersion = (version: any, include?: any) => {
    if (!version) return null;
    const result = { ...version };
    if (include?.setting) result.setting = findSetting({ id: version.settingId });
    if (include?.episode) result.episode = version.episodeId ? findEpisode({ id: version.episodeId }) : null;
    if (include?.units) {
      let selected = units.filter((unit) => unit.contextVersionId === version.id);
      if (include.units.where?.visibility?.in) {
        calls.lastPublicUnitsWhere = include.units.where;
        selected = selected.filter((unit) => include.units.where.visibility.in.includes(unit.visibility));
      }
      if (include.units.where?.classification?.not) {
        selected = selected.filter((unit) => unit.classification !== include.units.where.classification.not);
      }
      selected = selected.sort((left, right) => left.sortOrder - right.sortOrder);
      result.units = selected.map((unit) => ({ ...unit }));
    }
    return result;
  };

  const db = {
    settings,
    episodes,
    versions,
    units,
    calls,
    setting: {
      create: async ({ data }: any) => {
        if (settings.some((setting) => setting.stableKey === data.stableKey)) {
          throw new AppError(409, "Identificador estavel duplicado.", "DUPLICATED_STABLE_IDENTIFIER");
        }
        const setting = { id: `setting-${nextSetting++}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        settings.push(setting);
        return setting;
      },
      findUnique: async ({ where }: any) => findSetting(where),
    },
    episode: {
      create: async ({ data }: any) => {
        if (episodes.some((episode) => episode.settingId === data.settingId && episode.stableKey === data.stableKey)) {
          throw new AppError(409, "Identificador estavel duplicado.", "DUPLICATED_STABLE_IDENTIFIER");
        }
        const episode = { id: `episode-${nextEpisode++}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        episodes.push(episode);
        return episode;
      },
      findUnique: async ({ where }: any) => findEpisode(where),
      findFirst: async ({ where }: any) => findEpisode(where),
    },
    contextVersion: {
      create: async ({ data }: any) => {
        if (
          versions.some(
            (version) =>
              version.settingId === data.settingId &&
              (version.episodeId ?? null) === (data.episodeId ?? null) &&
              version.layer === data.layer &&
              version.version === data.version
          )
        ) {
          throw new AppError(409, "Versao duplicada.", "INVALID_CONTEXT_VERSION");
        }
        const version = {
          id: `version-${nextVersion++}`,
          status: ContextVersionStatus.DRAFT,
          publishedAt: null,
          archivedAt: null,
          approvedById: null,
          updatedById: null,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        versions.push(version);
        return version;
      },
      findUnique: async ({ where, include }: any) => decorateVersion(versions.find((version) => version.id === where.id) ?? null, include),
      findFirst: async ({ where, include, orderBy }: any) => {
        let selected = versions.filter((version) => {
          if (where.id && version.id !== where.id) return false;
          if (where.settingId && version.settingId !== where.settingId) return false;
          if ("episodeId" in where && (version.episodeId ?? null) !== where.episodeId) return false;
          if (where.layer && version.layer !== where.layer) return false;
          if (where.status && version.status !== where.status) return false;
          return true;
        });
        if (orderBy?.version === "desc") selected = selected.sort((left, right) => right.version - left.version);
        return decorateVersion(selected[0] ?? null, include);
      },
      findMany: async ({ include }: any) => versions.map((version) => decorateVersion(version, include)),
      update: async ({ where, data }: any) => {
        const version = versions.find((entry) => entry.id === where.id);
        if (!version) throw new Error("version not found");
        Object.assign(version, data, { updatedAt: new Date() });
        return version;
      },
      delete: async () => {
        calls.deleteCount += 1;
      },
    },
    contextUnit: {
      create: async ({ data }: any) => {
        const unit = { id: `unit-${nextUnit++}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        units.push(unit);
        return unit;
      },
      findFirst: async ({ where, select }: any) => {
        const unit = units.find((entry) => {
          const version = versions.find((candidate) => candidate.id === entry.contextVersionId);
          if (entry.id !== where.id) return false;
          if (!where.visibility.in.includes(entry.visibility)) return false;
          if (entry.classification === where.classification.not) return false;
          if (where.contextVersion.status && version?.status !== where.contextVersion.status) return false;
          return true;
        });
        if (!unit) return null;
        return Object.fromEntries(Object.keys(select).map((key) => [key, unit[key]]));
      },
    },
  };

  return db;
};

const createPublishedEpisodeFixture = async (baseUrl: string) => {
  const settingResponse = await requestJson(`${baseUrl}/admin/settings`, {
    method: "POST",
    headers: adminHeaders(),
    body: {
      stableKey: "bravantus",
      title: "Bravantus",
      description: "Setting de validacao do Episodio 1.",
    },
  });
  const setting = settingResponse.body.setting;

  const episodeResponse = await requestJson(`${baseUrl}/admin/episodes`, {
    method: "POST",
    headers: adminHeaders(),
    body: {
      settingId: setting.id,
      stableKey: "episode-1-validation",
      title: "Titulo de trabalho do Episodio 1",
      synopsis: "Premissa publica de validacao.",
    },
  });
  const episode = episodeResponse.body.episode;

  const versionResponse = await requestJson(`${baseUrl}/admin/versions`, {
    method: "POST",
    headers: adminHeaders(),
    body: {
      settingId: setting.id,
      episodeId: episode.id,
      layer: ContextLayer.EPISODE,
      version: 1,
      origin: "Contexto e Playtest na Plataforma - Episodio 1",
      approvalNote: "Responsabilidade do Autor/Admin para fixture de validacao.",
    },
  });
  const version = versionResponse.body.contextVersion;

  const publicUnitResponse = await requestJson(`${baseUrl}/admin/units`, {
    method: "POST",
    headers: adminHeaders(),
    body: {
      contextVersionId: version.id,
      classification: ContextClassification.PUBLIC_CANON,
      visibility: ContextVisibility.PUBLIC,
      title: "Premissa publica do Episodio 1",
      content: EPISODE_ONE_PUBLIC_CONTENT,
      sortOrder: 1,
    },
  });

  const secretUnitResponse = await requestJson(`${baseUrl}/admin/units`, {
    method: "POST",
    headers: adminHeaders(),
    body: {
      contextVersionId: version.id,
      classification: ContextClassification.SECRET_CANON,
      visibility: ContextVisibility.AUTHOR_ADMIN,
      title: "Contexto secreto do Episodio 1",
      content: EPISODE_ONE_SECRET_CONTENT,
      sortOrder: 2,
    },
  });

  const authenticatedPlayerUnitResponse = await requestJson(`${baseUrl}/admin/units`, {
    method: "POST",
    headers: adminHeaders(),
    body: {
      contextVersionId: version.id,
      classification: ContextClassification.RULE,
      visibility: ContextVisibility.AUTHENTICATED_TABLE_PLAYER,
      title: "Contexto para jogador autenticado de mesa",
      content: "Conteudo protegido para jogador autenticado de mesa.",
      sortOrder: 3,
    },
  });

  const specificCharacterUnitResponse = await requestJson(`${baseUrl}/admin/units`, {
    method: "POST",
    headers: adminHeaders(),
    body: {
      contextVersionId: version.id,
      classification: ContextClassification.HYPOTHESIS,
      visibility: ContextVisibility.SPECIFIC_CHARACTER,
      title: "Contexto para personagem especifico",
      content: "Conteudo protegido para personagem especifico.",
      sortOrder: 4,
    },
  });

  const tableMasterUnitResponse = await requestJson(`${baseUrl}/admin/units`, {
    method: "POST",
    headers: adminHeaders(),
    body: {
      contextVersionId: version.id,
      classification: ContextClassification.HYPOTHESIS,
      visibility: ContextVisibility.TABLE_MASTER,
      title: "Contexto para Mestre de mesa",
      content: "Conteudo protegido para Mestre de mesa.",
      sortOrder: 5,
    },
  });

  const publishResponse = await requestJson(`${baseUrl}/admin/versions/${version.id}/publish`, {
    method: "POST",
    headers: adminHeaders(),
  });

  return {
    setting,
    episode,
    version,
    publicUnit: publicUnitResponse.body.contextUnit,
    secretUnit: secretUnitResponse.body.contextUnit,
    authenticatedPlayerUnit: authenticatedPlayerUnitResponse.body.contextUnit,
    specificCharacterUnit: specificCharacterUnitResponse.body.contextUnit,
    tableMasterUnit: tableMasterUnitResponse.body.contextUnit,
    publishResponse,
  };
};

void (async () => {
  const db = createFakeDb();
  ContextService.setDbForTests(db as any);
  const server = await createServer();
  let fixture: Awaited<ReturnType<typeof createPublishedEpisodeFixture>>;

  try {
    await test("cria Setting com identificador estavel independente do titulo", async () => {
      const response = await requestJson(`${server.url}/admin/settings`, {
        method: "POST",
        headers: adminHeaders(),
        body: { stableKey: "setting-audit", title: "Titulo mutavel" },
      });
      assert.equal(response.status, 201);
      assert.equal(response.body.setting.stableKey, "setting-audit");
      assert.notEqual(response.body.setting.stableKey, response.body.setting.title);
    });

    await test("cria Episode vinculado ao Setting sem usar titulo como identidade", async () => {
      const setting = db.settings[0];
      const response = await requestJson(`${server.url}/admin/episodes`, {
        method: "POST",
        headers: adminHeaders(),
        body: {
          settingId: setting.id,
          stableKey: "episodio-validacao",
          title: "Titulo de trabalho alteravel",
        },
      });
      assert.equal(response.status, 201);
      assert.equal(response.body.episode.settingId, setting.id);
      assert.equal(response.body.episode.stableKey, "episodio-validacao");
    });

    await test("cria versao logica com unidades publica e secreta separadas", async () => {
      fixture = await createPublishedEpisodeFixture(server.url);
      assert.equal(fixture.publishResponse.status, 200);
      assert.notEqual(fixture.publicUnit.id, fixture.secretUnit.id);
      assert.equal(fixture.publicUnit.classification, ContextClassification.PUBLIC_CANON);
      assert.equal(fixture.secretUnit.classification, ContextClassification.SECRET_CANON);
    });

    await test("rejeita publicacao de versao incompleta", async () => {
      const response = await requestJson(`${server.url}/admin/versions`, {
        method: "POST",
        headers: adminHeaders(),
        body: {
          settingId: fixture.setting.id,
          episodeId: fixture.episode.id,
          layer: ContextLayer.EPISODE,
          version: 99,
          origin: "Documento de validacao",
          approvalNote: "Autor/Admin",
        },
      });
      const publish = await requestJson(`${server.url}/admin/versions/${response.body.contextVersion.id}/publish`, {
        method: "POST",
        headers: adminHeaders(),
      });
      assert.equal(publish.status, 409);
      assert.equal(publish.body.error.code, "CONTEXT_VERSION_INCOMPLETE");
    });

    await test("recupera versao publica ativa sem conteudo secreto", async () => {
      const response = await requestJson(
        `${server.url}/settings/bravantus/episodes/episode-1-validation/active-public`
      );
      assert.equal(response.status, 200);
      assert.equal(response.body.context.version, 1);
      assert.equal(response.body.context.units.length, 1);
      assert.equal(response.body.context.units[0].content, EPISODE_ONE_PUBLIC_CONTENT);
      assertNoSecretLeak(response.body);
      assert.equal(response.serialized.includes("AUTHENTICATED_TABLE_PLAYER"), false);
      assert.equal(response.serialized.includes("SPECIFIC_CHARACTER"), false);
      assert.equal(response.serialized.includes("TABLE_MASTER"), false);
      assert.equal(response.serialized.includes("AUTHOR_ADMIN"), false);
      assert.equal(response.serialized.includes(fixture.authenticatedPlayerUnit.id), false);
      assert.equal(response.serialized.includes(fixture.specificCharacterUnit.id), false);
      assert.equal(response.serialized.includes(fixture.tableMasterUnit.id), false);
      assert.ok(JSON.stringify(db.calls.lastPublicUnitsWhere).includes("PUBLIC"));
      assert.equal(JSON.stringify(db.calls.lastPublicUnitsWhere).includes("AUTHENTICATED_TABLE_PLAYER"), false);
    });

    await test("jogador comum nao acessa contexto secreto por ID direto", async () => {
      const response = await requestJson(`${server.url}/units/${fixture.secretUnit.id}/public`);
      assert.equal(response.status, 404);
      assert.equal(response.body.error.code, "NO_ACTIVE_CONTEXT_VERSION");
      assertNoSecretLeak(response.body);
    });

    await test("jogador autenticado nao lista metadados protegidos de gestao", async () => {
      const response = await requestJson(`${server.url}/admin/versions`, {
        headers: playerHeaders(),
      });
      assert.equal(response.status, 403);
      assert.equal(response.body.error.code, "ADMIN_REQUIRED");
      assertNoSecretLeak(response.body);
    });

    await test("admin autorizado gerencia e le contexto secreto", async () => {
      const response = await requestJson(`${server.url}/admin/versions/${fixture.version.id}`, {
        headers: adminHeaders(),
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.contextVersion.units.length, 5);
      assert.equal(response.serialized.includes("Erya"), true);
      assert.equal(response.serialized.includes("Zurich"), true);
    });

    await test("versao publicada nao pode ser editada silenciosamente", async () => {
      const response = await requestJson(`${server.url}/admin/units`, {
        method: "POST",
        headers: adminHeaders(),
        body: {
          contextVersionId: fixture.version.id,
          classification: ContextClassification.PUBLIC_CANON,
          visibility: ContextVisibility.PUBLIC,
          title: "Edicao indevida",
          content: "Nao deve persistir.",
        },
      });
      assert.equal(response.status, 409);
      assert.equal(response.body.error.code, "CONTEXT_VERSION_IMMUTABLE");
    });

    await test("cria versao subsequente preservando historico", async () => {
      const version2 = await requestJson(`${server.url}/admin/versions`, {
        method: "POST",
        headers: adminHeaders(),
        body: {
          settingId: fixture.setting.id,
          episodeId: fixture.episode.id,
          layer: ContextLayer.EPISODE,
          version: 2,
          origin: "Correcao aprovada",
          approvalNote: "Autor/Admin",
        },
      });
      assert.equal(version2.status, 201);
      assert.equal(db.versions.some((version) => version.id === fixture.version.id), true);
      assert.equal(db.versions.some((version) => version.id === version2.body.contextVersion.id), true);
    });

    await test("arquiva sem delecao fisica e nao trata arquivada como ativa", async () => {
      const archive = await requestJson(`${server.url}/admin/versions/${fixture.version.id}/archive`, {
        method: "POST",
        headers: adminHeaders(),
      });
      assert.equal(archive.status, 200);
      assert.equal(archive.body.contextVersion.status, ContextVersionStatus.ARCHIVED);
      assert.equal(db.calls.deleteCount, 0);
      const publicAfterArchive = await requestJson(
        `${server.url}/settings/bravantus/episodes/episode-1-validation/active-public`
      );
      assert.equal(publicAfterArchive.status, 404);
      assert.equal(publicAfterArchive.body.error.code, "NO_ACTIVE_CONTEXT_VERSION");
    });

    await test("rejeita transicao invalida de lifecycle", async () => {
      const draft = db.versions.find((version) => version.version === 2);
      const response = await requestJson(`${server.url}/admin/versions/${draft.id}/archive`, {
        method: "POST",
        headers: adminHeaders(),
      });
      assert.equal(response.status, 409);
      assert.equal(response.body.error.code, "INVALID_CONTEXT_STATUS_TRANSITION");
    });

    await test("variaveis abertas do Mestre nao foram persistidas como canon selecionado", () => {
      assertOpenVariablesNotPersisted(db);
    });

    await test("erros e logs nao expoem conteudo secreto", async () => {
      const originalError = console.error;
      let output = "";
      console.error = (...args: unknown[]) => {
        output += args.map(String).join(" ");
      };
      try {
        const response = await requestJson(`${server.url}/versions/${fixture.version.id}/public`);
        assert.equal(response.status, 404);
        assertNoSecretLeak(response.body);
        assert.equal(output.includes("Erya"), false);
        assert.equal(output.includes("Zurich"), false);
      } finally {
        console.error = originalError;
      }
    });

    console.log("Context tests completed.");
  } finally {
    await server.close();
    ContextService.resetDbForTests();
  }
})().catch((error) => {
  ContextService.resetDbForTests();
  console.error(error);
  process.exit(1);
});
