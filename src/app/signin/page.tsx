"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data?.error || '注册失败');
        }
      }

      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        throw new Error('账号或密码错误');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#222222] border border-[#333333] rounded-2xl p-6 sm:p-8 shadow-xl">
        <h1 className="text-xl font-semibold mb-4">{isRegister ? '创建账户' : '登录 Recall'}</h1>
        <p className="text-sm text-[#777777] mb-6">
          {isRegister ? '注册后可在多设备同步任务' : '登录后访问你的任务数据'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-2">
              <label className="text-xs text-[#999999]">昵称</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg bg-[#1A1A1A] border border-[#333333] px-3 py-2 text-sm"
                placeholder="你的昵称"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs text-[#999999]">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg bg-[#1A1A1A] border border-[#333333] px-3 py-2 text-sm"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-[#999999]">密码</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg bg-[#1A1A1A] border border-[#333333] px-3 py-2 text-sm"
              placeholder="至少 6 位"
              required
            />
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2"
          >
            {loading ? '处理中...' : isRegister ? '注册并登录' : '登录'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setIsRegister((prev) => !prev)}
          className="mt-4 text-sm text-blue-300 hover:text-blue-200"
        >
          {isRegister ? '已有账号？去登录' : '没有账号？注册'}
        </button>
      </div>
    </div>
  );
}
