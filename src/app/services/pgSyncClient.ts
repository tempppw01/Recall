export type PgSyncConfig = {
  pgHost: string;
  pgPort?: string;
  pgDatabase: string;
  pgUsername: string;
  pgPassword: string;
};

export type PgSyncEntity = 'tasks' | 'habits' | 'countdowns';
export type PgSyncMethod = 'POST' | 'PUT' | 'DELETE';

export function buildPgHeaders(config: PgSyncConfig, contentType?: string) {
  const headers: Record<string, string> = {
    'x-pg-host': config.pgHost,
    'x-pg-port': config.pgPort || '5432',
    'x-pg-database': config.pgDatabase,
    'x-pg-username': config.pgUsername,
    'x-pg-password': config.pgPassword,
  };
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  return headers;
}

export async function syncToPg(params: {
  config: PgSyncConfig;
  type: PgSyncEntity;
  method: PgSyncMethod;
  data: any;
}) {
  const { config, type, method, data } = params;
  if (!config.pgHost) return;

  const headers = buildPgHeaders(config, method === 'DELETE' ? undefined : 'application/json');

  let url = `/api/${type}`;
  if ((method === 'PUT' || method === 'DELETE') && data?.id) {
    url = `/api/${type}/${data.id}`;
  }

  await fetch(url, {
    method,
    headers,
    body: method !== 'DELETE' ? JSON.stringify(data) : undefined,
  });
}
