require("dotenv").config();
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  const rows = await sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and (
        (table_name = 'User' and column_name in ('theme'))
        or
        (table_name = 'Character' and column_name in ('avatarId', 'titleId', 'bannerId'))
      )
    order by table_name, column_name
  `;

  console.log(JSON.stringify(rows, null, 2));
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
