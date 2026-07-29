import fs from 'node:fs';
import path from 'node:path';

export type DatabaseProvider = 'mysql' | 'sqlite' | 'none';

type SqliteConfig = {
  provider: 'sqlite';
  databaseUrl: string;
  initializedAt: string;
};

const configPath =
  process.env.RECALL_DATABASE_CONFIG_PATH?.trim() || path.join(process.cwd(), 'data', 'database.json');
const defaultSqlitePath =
  process.env.RECALL_SQLITE_PATH?.trim() || path.join(process.cwd(), 'data', 'recall.db');

const readSqliteConfig = (): SqliteConfig | null => {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SqliteConfig>;
    if (parsed.provider !== 'sqlite' || typeof parsed.databaseUrl !== 'string' || !parsed.databaseUrl) {
      return null;
    }
    return {
      provider: 'sqlite',
      databaseUrl: parsed.databaseUrl,
      initializedAt: typeof parsed.initializedAt === 'string' ? parsed.initializedAt : '',
    };
  } catch {
    return null;
  }
};

const configuredMysqlUrl = () => {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) return '';
  return /^(mysql|mariadb):\/\//i.test(value) ? value : '';
};

export const getSqliteDatabaseUrl = () => {
  const configured = readSqliteConfig()?.databaseUrl;
  if (configured) return configured;
  return `file:${defaultSqlitePath}`;
};

export const getDatabaseProvider = (): DatabaseProvider => {
  if (configuredMysqlUrl()) return 'mysql';
  if (readSqliteConfig()) return 'sqlite';
  return 'none';
};

export const getDatabaseStatus = () => {
  const provider = getDatabaseProvider();
  return {
    configured: provider !== 'none',
    setupRequired: provider === 'none',
    provider,
    sqlitePath: defaultSqlitePath,
    configPath,
  };
};

export const serializeJsonForDatabase = (value: unknown, provider: DatabaseProvider | null) =>
  provider === 'sqlite' ? JSON.stringify(value ?? null) : value;

export const initializeSqliteSelection = () => {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.mkdirSync(path.dirname(defaultSqlitePath), { recursive: true });

  const current = readSqliteConfig();
  if (current) return current;
  if (configuredMysqlUrl()) {
    throw new Error('DATABASE_URL 已配置 MySQL，无需初始化 SQLite。');
  }

  const next: SqliteConfig = {
    provider: 'sqlite',
    databaseUrl: `file:${defaultSqlitePath}`,
    initializedAt: new Date().toISOString(),
  };
  const tempPath = `${configPath}.tmp-${process.pid}`;
  fs.writeFileSync(tempPath, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tempPath, configPath);
  return next;
};

const mysqlTables = [
  `CREATE TABLE IF NOT EXISTS \`User\` (\`id\` VARCHAR(191) NOT NULL, \`name\` VARCHAR(191) NULL, \`email\` VARCHAR(191) NULL, \`emailVerified\` DATETIME(3) NULL, \`image\` VARCHAR(191) NULL, \`passwordHash\` VARCHAR(191) NULL, PRIMARY KEY (\`id\`), UNIQUE KEY \`User_email_key\` (\`email\`)) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS \`Account\` (\`id\` VARCHAR(191) NOT NULL, \`userId\` VARCHAR(191) NOT NULL, \`type\` VARCHAR(191) NOT NULL, \`provider\` VARCHAR(191) NOT NULL, \`providerAccountId\` VARCHAR(191) NOT NULL, \`refresh_token\` TEXT NULL, \`access_token\` TEXT NULL, \`expires_at\` INT NULL, \`token_type\` VARCHAR(191) NULL, \`scope\` VARCHAR(191) NULL, \`id_token\` TEXT NULL, \`session_state\` VARCHAR(191) NULL, PRIMARY KEY (\`id\`), UNIQUE KEY \`Account_provider_providerAccountId_key\` (\`provider\`, \`providerAccountId\`), KEY \`Account_userId_idx\` (\`userId\`), CONSTRAINT \`Account_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS \`Session\` (\`id\` VARCHAR(191) NOT NULL, \`sessionToken\` VARCHAR(191) NOT NULL, \`userId\` VARCHAR(191) NOT NULL, \`expires\` DATETIME(3) NOT NULL, PRIMARY KEY (\`id\`), UNIQUE KEY \`Session_sessionToken_key\` (\`sessionToken\`), KEY \`Session_userId_idx\` (\`userId\`), CONSTRAINT \`Session_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS \`VerificationToken\` (\`identifier\` VARCHAR(191) NOT NULL, \`token\` VARCHAR(191) NOT NULL, \`expires\` DATETIME(3) NOT NULL, UNIQUE KEY \`VerificationToken_token_key\` (\`token\`), UNIQUE KEY \`VerificationToken_identifier_token_key\` (\`identifier\`, \`token\`)) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS \`Task\` (\`id\` VARCHAR(191) NOT NULL, \`userId\` VARCHAR(191) NOT NULL, \`title\` TEXT NOT NULL, \`dueDate\` DATETIME(3) NULL, \`priority\` INT NOT NULL, \`category\` VARCHAR(191) NULL, \`status\` ENUM('todo','in_progress','completed') NOT NULL DEFAULT 'todo', \`sortOrder\` INT NOT NULL DEFAULT 0, \`tags\` JSON NOT NULL, \`subtasks\` JSON NOT NULL, \`attachments\` JSON NULL, \`repeat\` JSON NULL, \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL, PRIMARY KEY (\`id\`), KEY \`Task_userId_status_idx\` (\`userId\`, \`status\`), KEY \`Task_userId_dueDate_idx\` (\`userId\`, \`dueDate\`), KEY \`Task_userId_createdAt_idx\` (\`userId\`, \`createdAt\`), KEY \`Task_userId_sortOrder_createdAt_idx\` (\`userId\`, \`sortOrder\`, \`createdAt\`), CONSTRAINT \`Task_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS \`Habit\` (\`id\` VARCHAR(191) NOT NULL, \`userId\` VARCHAR(191) NOT NULL, \`title\` VARCHAR(191) NOT NULL, \`logs\` JSON NOT NULL, \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL, PRIMARY KEY (\`id\`), KEY \`Habit_userId_createdAt_idx\` (\`userId\`, \`createdAt\`), CONSTRAINT \`Habit_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS \`Countdown\` (\`id\` VARCHAR(191) NOT NULL, \`userId\` VARCHAR(191) NOT NULL, \`title\` VARCHAR(191) NOT NULL, \`targetDate\` DATETIME(3) NOT NULL, \`pinned\` BOOLEAN NOT NULL DEFAULT false, \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL, PRIMARY KEY (\`id\`), KEY \`Countdown_userId_pinned_idx\` (\`userId\`, \`pinned\`), KEY \`Countdown_userId_targetDate_idx\` (\`userId\`, \`targetDate\`), KEY \`Countdown_userId_createdAt_idx\` (\`userId\`, \`createdAt\`), CONSTRAINT \`Countdown_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS \`Item\` (\`id\` VARCHAR(191) NOT NULL, \`userId\` VARCHAR(191) NOT NULL, \`name\` VARCHAR(191) NOT NULL, \`category\` VARCHAR(191) NULL, \`tags\` JSON NOT NULL, \`location\` VARCHAR(191) NULL, \`quantity\` INT NOT NULL DEFAULT 0, \`status\` ENUM('normal','low_stock','need_restock','missing') NOT NULL, \`note\` TEXT NULL, \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL, PRIMARY KEY (\`id\`), KEY \`Item_userId_status_idx\` (\`userId\`, \`status\`), KEY \`Item_userId_category_idx\` (\`userId\`, \`category\`), KEY \`Item_userId_createdAt_idx\` (\`userId\`, \`createdAt\`), CONSTRAINT \`Item_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS \`SyncState\` (\`id\` VARCHAR(191) NOT NULL, \`syncKey\` VARCHAR(191) NOT NULL, \`isProcessing\` BOOLEAN NOT NULL DEFAULT false, \`lastSyncedAt\` DATETIME(3) NULL, \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL, PRIMARY KEY (\`id\`), UNIQUE KEY \`SyncState_syncKey_key\` (\`syncKey\`)) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS \`SyncJob\` (\`id\` VARCHAR(191) NOT NULL, \`syncKey\` VARCHAR(191) NOT NULL, \`action\` VARCHAR(191) NOT NULL, \`status\` ENUM('pending','processing','done','failed') NOT NULL DEFAULT 'pending', \`payload\` JSON NULL, \`result\` JSON NULL, \`error\` TEXT NULL, \`processedAt\` DATETIME(3) NULL, \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL, PRIMARY KEY (\`id\`), KEY \`SyncJob_syncKey_status_createdAt_idx\` (\`syncKey\`, \`status\`, \`createdAt\`)) ENGINE=InnoDB`,
];

const sqliteTables = [
  `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT, "email" TEXT UNIQUE, "emailVerified" DATETIME, "image" TEXT, "passwordHash" TEXT)`,
  `CREATE TABLE IF NOT EXISTS "Account" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "provider" TEXT NOT NULL, "providerAccountId" TEXT NOT NULL, "refresh_token" TEXT, "access_token" TEXT, "expires_at" INTEGER, "token_type" TEXT, "scope" TEXT, "id_token" TEXT, "session_state" TEXT, FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Session" ("id" TEXT NOT NULL PRIMARY KEY, "sessionToken" TEXT NOT NULL UNIQUE, "userId" TEXT NOT NULL, "expires" DATETIME NOT NULL, FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "VerificationToken" ("identifier" TEXT NOT NULL, "token" TEXT NOT NULL UNIQUE, "expires" DATETIME NOT NULL, UNIQUE ("identifier", "token"))`,
  `CREATE TABLE IF NOT EXISTS "Task" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "dueDate" DATETIME, "priority" INTEGER NOT NULL, "category" TEXT, "status" TEXT NOT NULL DEFAULT 'todo', "sortOrder" INTEGER NOT NULL DEFAULT 0, "tags" TEXT NOT NULL, "subtasks" TEXT NOT NULL, "attachments" TEXT, "repeat" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Habit" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "logs" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Countdown" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "targetDate" DATETIME NOT NULL, "pinned" BOOLEAN NOT NULL DEFAULT 0, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Item" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "category" TEXT, "tags" TEXT NOT NULL, "location" TEXT, "quantity" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'normal', "note" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "SyncState" ("id" TEXT NOT NULL PRIMARY KEY, "syncKey" TEXT NOT NULL UNIQUE, "isProcessing" BOOLEAN NOT NULL DEFAULT 0, "lastSyncedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "SyncJob" ("id" TEXT NOT NULL PRIMARY KEY, "syncKey" TEXT NOT NULL, "action" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "payload" TEXT, "result" TEXT, "error" TEXT, "processedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
];

const commonIndexes = [
  ['Account_userId_idx', 'Account', 'userId'],
  ['Session_userId_idx', 'Session', 'userId'],
  ['Task_userId_status_idx', 'Task', 'userId, status'],
  ['Task_userId_dueDate_idx', 'Task', 'userId, dueDate'],
  ['Task_userId_createdAt_idx', 'Task', 'userId, createdAt'],
  ['Task_userId_sortOrder_createdAt_idx', 'Task', 'userId, sortOrder, createdAt'],
  ['Habit_userId_createdAt_idx', 'Habit', 'userId, createdAt'],
  ['Countdown_userId_pinned_idx', 'Countdown', 'userId, pinned'],
  ['Countdown_userId_targetDate_idx', 'Countdown', 'userId, targetDate'],
  ['Countdown_userId_createdAt_idx', 'Countdown', 'userId, createdAt'],
  ['Item_userId_status_idx', 'Item', 'userId, status'],
  ['Item_userId_category_idx', 'Item', 'userId, category'],
  ['Item_userId_createdAt_idx', 'Item', 'userId, createdAt'],
  ['SyncJob_syncKey_status_createdAt_idx', 'SyncJob', 'syncKey, status, createdAt'],
] as const;

const schemaInitialization = new Map<string, Promise<void>>();

export const ensureDatabaseSchema = (client: { $executeRawUnsafe: (sql: string) => Promise<unknown> }, provider: Exclude<DatabaseProvider, 'none'>) => {
  const key = provider;
  const existing = schemaInitialization.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const statements = provider === 'mysql' ? mysqlTables : sqliteTables;
    for (const statement of statements) {
      await client.$executeRawUnsafe(statement);
    }
    for (const [name, table, columns] of commonIndexes) {
      const quotedTable = provider === 'mysql' ? `\`${table}\`` : `"${table}"`;
      const quotedColumns = columns
        .split(', ')
        .map((column) => (provider === 'mysql' ? `\`${column}\`` : `"${column}"`))
        .join(', ');
      const statement = provider === 'mysql'
        ? `CREATE INDEX \`${name}\` ON ${quotedTable} (${quotedColumns})`
        : `CREATE INDEX IF NOT EXISTS "${name}" ON ${quotedTable} (${quotedColumns})`;
      try {
        await client.$executeRawUnsafe(statement);
      } catch (error) {
        if (provider === 'sqlite') throw error;
        // MySQL may already have an index from a previous deployment.
        if (!String(error).toLowerCase().includes('duplicate')) throw error;
      }
    }
  })();
  schemaInitialization.set(key, promise);
  return promise;
};
