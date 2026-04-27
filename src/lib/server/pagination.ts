const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGE_SIZE = 500;

export type PaginationParams = {
  enabled: boolean;
  limit: number;
  offset: number;
};

export type PaginatedListResult<T> = {
  items: T[];
  page: {
    limit: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
};

const parsePositiveInt = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

export const getPaginationParams = (request: Request): PaginationParams => {
  const { searchParams } = new URL(request.url);
  const enabled = searchParams.has('limit') || searchParams.has('offset');
  const limit = Math.min(parsePositiveInt(searchParams.get('limit'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const offset = parsePositiveInt(searchParams.get('offset'), 0);

  return {
    enabled,
    limit,
    offset,
  };
};

export const buildPaginatedListResult = <T>(
  items: T[],
  pagination: PaginationParams,
): PaginatedListResult<T> => {
  const hasMore = items.length > pagination.limit;
  const pageItems = hasMore ? items.slice(0, pagination.limit) : items;

  return {
    items: pageItems,
    page: {
      limit: pagination.limit,
      offset: pagination.offset,
      nextOffset: hasMore ? pagination.offset + pagination.limit : null,
      hasMore,
    },
  };
};
