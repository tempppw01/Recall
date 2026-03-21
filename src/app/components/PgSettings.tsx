import React from 'react';

// PostgreSQL 设置表单（仅负责渲染与回调）
// 说明：替换原 MySQL 配置，用于前端保存 PG 连接信息到 localStorage。
type PgSettingsProps = {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onDatabaseChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
};

export default function PgSettings({
  host,
  port,
  database,
  username,
  password,
  onHostChange,
  onPortChange,
  onDatabaseChange,
  onUsernameChange,
  onPasswordChange,
}: PgSettingsProps) {
  const [testing, setTesting] = React.useState(false);

  const handleTest = async () => {
    if (!host || !database || !username) {
      alert('请先填写必要信息');
      return;
    }
    setTesting(true);
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pg',
          config: { host, port, database, username, password },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('连接成功！');
      } else {
        alert(`连接失败: ${data.error || '未知错误'} 
${data.details || ''}`);
      }
    } catch (error) {
      alert(`请求失败: ${String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] sm:text-xs text-[#AAB3C6] uppercase tracking-[0.12em]">PostgreSQL 连接</div>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="text-[10px] rounded-full border border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-2.5 py-1 text-blue-300 hover:text-blue-200 hover:border-blue-400/40 disabled:opacity-50"
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] sm:text-xs text-[#7d8595] mb-2">主机</label>
          <input
            type="text"
            value={host}
            onChange={(event) => onHostChange(event.target.value)}
            placeholder="pg.example.com"
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-[13px] sm:text-sm text-[#E8ECF8] focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] sm:text-xs text-[#7d8595] mb-2">端口</label>
          <input
            type="number"
            value={port}
            onChange={(event) => onPortChange(event.target.value)}
            placeholder="5432"
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-[13px] sm:text-sm text-[#E8ECF8] focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] sm:text-xs text-[#7d8595] mb-2">数据库名</label>
        <input
          type="text"
          value={database}
          onChange={(event) => onDatabaseChange(event.target.value)}
          placeholder="recall"
          className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-[13px] sm:text-sm text-[#E8ECF8] focus:border-blue-500 focus:outline-none transition-colors"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] sm:text-xs text-[#7d8595] mb-2">用户名</label>
          <input
            type="text"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="postgres"
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-[13px] sm:text-sm text-[#E8ECF8] focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] sm:text-xs text-[#7d8595] mb-2">密码</label>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Postgres 密码"
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-[13px] sm:text-sm text-[#E8ECF8] focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
}