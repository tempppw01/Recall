import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveRequestDbContext } from '@/lib/prisma';

export const getSessionUserId = async () => {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id || '';
};

export const getRequestDbContext = async (request: Request) =>
  resolveRequestDbContext(request, getSessionUserId);
