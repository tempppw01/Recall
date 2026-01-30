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
  return (
    <div className="space-y-3">
      <div className="text-[11px] sm:text-xs text-[#999999] uppercase">PostgreSQL 连接</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">主机</label>
          <input
            type="text"
            value={host}
            onChange={(event) => onHostChange(event.target.value)}
            placeholder="pg.example.com"
            className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">端口</label>
          <input
            type="number"
            value={port}
            onChange={(event) => onPortChange(event.target.value)}
            placeholder="5432"
            className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">数据库名</label>
        <input
          type="text"
          value={database}
          onChange={(event) => onDatabaseChange(event.target.value)}
          placeholder="recall"
          className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">用户名</label>
          <input
            type="text"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="postgres"
            className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">密码</label>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Postgres 密码"
            className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
}