const { spawnSync } = require("node:child_process");

function run(command, args) {
  const result = spawnSync(command, args, {
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const shouldDeployMigrations =
  process.env.VERCEL_ENV === "production" ||
  process.env.DEPLOY_DATABASE_MIGRATIONS === "true";

if (shouldDeployMigrations) {
  console.log("Applying pending Prisma migrations before the production build.");
  run("npm", ["run", "db:migrate:deploy"]);
} else {
  console.log("Skipping database migrations outside the production deployment.");
}

run("npm", ["run", "build"]);
