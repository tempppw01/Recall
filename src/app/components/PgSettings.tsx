import React from 'react';

// MySQL 连接测试表单（仅负责渲染与回调）。
// 生产实例的实际数据库由 Compose 的 DATABASE_URL 决定；这里保留为运维测试入口。
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
          type: 'mysql',
          config: { host, port, database, username, password },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('MySQL 连接成功！');
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[11px] sm:text-xs text-[#AAB3C6] uppercase tracking-[0.12em]">MySQL 连接测试</div>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="text-[10px] rounded-full border border-[rgba(var(--theme-accent),0.28)] bg-[rgba(var(--theme-accent),0.08)] px-2.5 py-1 text-blue-300 transition-all hover:border-blue-400/40 hover:bg-[rgba(var(--theme-accent),0.12)] hover:text-blue-200 disabled:opacity-50"
        >
          {testing ? '测试中...' : '测试 MySQL'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] sm:text-xs text-[#7d8595] mb-2">主机</label>
          <input
            type="text"
            value={host}
            onChange={(event) => onHostChange(event.target.value)}
            placeholder="mysql.example.com"
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-[13px] sm:text-sm text-[#E8ECF8] focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] sm:text-xs text-[#7d8595] mb-2">端口</label>
          <input
            type="number"
            value={port}
            onChange={(event) => onPortChange(event.target.value)}
            placeholder="3306"
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
            placeholder="recall"
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-[13px] sm:text-sm text-[#E8ECF8] focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] sm:text-xs text-[#7d8595] mb-2">密码</label>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="MySQL 密码"
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-[13px] sm:text-sm text-[#E8ECF8] focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
