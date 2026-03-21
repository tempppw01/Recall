import React from 'react';

// Redis 设置表单（仅负责渲染与回调）
// 说明：与 MySQL 设置保持一致的结构，便于统一维护。
type RedisSettingsProps = {
  host: string;
  port: string;
  db: string;
  password: string;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onDbChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
};

export default function RedisSettings({
  host,
  port,
  db,
  password,
  onHostChange,
  onPortChange,
  onDbChange,
  onPasswordChange,
}: RedisSettingsProps) {
  const [testing, setTesting] = React.useState(false);

  const handleTest = async () => {
    if (!host || !port) {
      alert('请先填写主机和端口');
      return;
    }
    setTesting(true);
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'redis',
          config: { host, port, db, password },
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
        <div className="text-[11px] sm:text-xs text-[#AAB3C6] uppercase tracking-[0.12em]">Redis 连接</div>
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
            placeholder="redis.example.com"
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-[13px] sm:text-sm text-[#E8ECF8] focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] sm:text-xs text-[#7d8595] mb-2">端口</label>
          <input
            type="number"
            value={port}
            onChange={(event) => onPortChange(event.target.value)}
            placeholder="6379"
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-[13px] sm:text-sm text-[#E8ECF8] focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] sm:text-xs text-[#7d8595] mb-2">DB 索引</label>
          <input
            type="number"
            value={db}
            onChange={(event) => onDbChange(event.target.value)}
            placeholder="0"
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-[13px] sm:text-sm text-[#E8ECF8] focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] sm:text-xs text-[#7d8595] mb-2">密码</label>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Redis 密码"
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-[13px] sm:text-sm text-[#E8ECF8] focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
