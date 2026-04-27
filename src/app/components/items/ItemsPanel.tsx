import { AlertTriangle, Edit3, MapPin, Package2, Search, Tag, XCircle } from 'lucide-react';
import { Item } from '@/lib/store';

type ItemStatus = Item['status'];

const statusMeta: Record<ItemStatus, { label: string; className: string }> = {
  normal: { label: '正常', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' },
  low_stock: { label: '库存低', className: 'border-amber-500/30 bg-amber-500/10 text-amber-100' },
  need_restock: { label: '待补货', className: 'border-orange-500/30 bg-orange-500/10 text-orange-100' },
  missing: { label: '缺失', className: 'border-rose-500/30 bg-rose-500/10 text-rose-100' },
};

type ItemsPanelProps = {
  items: Item[];
  itemNameInput: string;
  setItemNameInput: (value: string) => void;
  itemCategoryInput: string;
  setItemCategoryInput: (value: string) => void;
  itemLocationInput: string;
  setItemLocationInput: (value: string) => void;
  itemQuantityInput: string;
  setItemQuantityInput: (value: string) => void;
  itemTagsInput: string;
  setItemTagsInput: (value: string) => void;
  itemNoteInput: string;
  setItemNoteInput: (value: string) => void;
  itemSearch: string;
  setItemSearch: (value: string) => void;
  itemStatusFilter: string;
  setItemStatusFilter: (value: string) => void;
  editingItemId: string | null;
  onCreateItem: () => void;
  onEditItem: (item: Item) => void;
  onUpdateItemStatus: (id: string, status: ItemStatus) => void;
  onDeleteItem: (id: string) => void;
  onCreateItemTask: (item: Item, action: 'restock' | 'buy' | 'put_back') => void;
};

const FIELD_CLASS_NAME = 'ui-input rounded-xl text-sm';

export default function ItemsPanel({
  items,
  itemNameInput,
  setItemNameInput,
  itemCategoryInput,
  setItemCategoryInput,
  itemLocationInput,
  setItemLocationInput,
  itemQuantityInput,
  setItemQuantityInput,
  itemTagsInput,
  setItemTagsInput,
  itemNoteInput,
  setItemNoteInput,
  itemSearch,
  setItemSearch,
  itemStatusFilter,
  setItemStatusFilter,
  editingItemId,
  onCreateItem,
  onEditItem,
  onUpdateItemStatus,
  onDeleteItem,
  onCreateItemTask,
}: ItemsPanelProps) {
  const lowStockCount = items.filter((item) => item.status === 'low_stock' || item.status === 'need_restock').length;
  const missingCount = items.filter((item) => item.status === 'missing').length;
  const isEmpty = items.length === 0;

  return (
    <div className="theme-native-surface space-y-5 sm:space-y-6">
      {isEmpty && (
        <div className="glass-panel rounded-[30px] border border-dashed border-[color:var(--ui-border-strong)] px-5 py-5 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--ui-border-soft)] bg-[var(--ui-card-bg)]">
              <Package2 className="h-6 w-6 text-[color:var(--ui-icon-muted)]" />
            </div>
            <div className="min-w-0">
              <p className="ui-title text-base font-semibold">先录一个常用东西</p>
              <p className="ui-copy-muted mt-1 text-sm leading-6">
                从最容易找不到的物品开始，比如电池、药品、线材、证件或工具，让后面的补货和归位更顺手。
              </p>
              <div className="ui-copy-muted mt-3 flex flex-wrap gap-2 text-[11px]">
                {['电池', '药品', '线材', '证件', '工具'].map((label) => (
                  <span key={label} className="ui-badge rounded-full px-2.5 py-1">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-[30px] border-[color:var(--ui-border-strong)] px-4 py-4 sm:px-5 sm:py-5">
        <div className="space-y-4">
          {!isEmpty && (
            <div className="ui-copy-muted flex flex-wrap items-center gap-2.5 text-[11px] sm:text-xs">
              <span className="glass-card rounded-full px-2.5 py-1">
                物品总数：<span className="ui-title">{items.length}</span>
              </span>
              <span className="glass-card rounded-full px-2.5 py-1">
                待补货：<span className="ui-title">{lowStockCount}</span>
              </span>
              <span className="glass-card rounded-full px-2.5 py-1">
                缺失：<span className="ui-title">{missingCount}</span>
              </span>
              <span className="ui-note">先记清放哪和剩多少，后面再接补货或采购任务。</span>
            </div>
          )}

          <div className={`grid gap-3 ${isEmpty ? '' : 'lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.9fr)]'}`}>
            <div className="glass-panel-soft space-y-3 rounded-[28px] border-[color:var(--ui-border-strong)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="ui-kicker">
                    {editingItemId ? '编辑物品' : isEmpty ? '快速录入' : '新增物品'}
                  </div>
                  <div className="ui-copy-muted mt-1 text-sm">
                    {isEmpty ? '先填名称、位置和数量，其他信息可以稍后补。' : '随手记下放哪、剩多少，后面再细化分类和标签。'}
                  </div>
                </div>
                {!isEmpty && <span className="ui-badge rounded-full px-2.5 py-1 text-[11px]">轻量录入</span>}
              </div>

              <input
                value={itemNameInput}
                onChange={(e) => setItemNameInput(e.target.value)}
                placeholder="物品名称，例如：5 号电池"
                className={FIELD_CLASS_NAME}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={itemLocationInput}
                  onChange={(e) => setItemLocationInput(e.target.value)}
                  placeholder="位置，例如：书房抽屉"
                  className={FIELD_CLASS_NAME}
                />
                <input
                  value={itemQuantityInput}
                  onChange={(e) => setItemQuantityInput(e.target.value)}
                  placeholder="数量"
                  inputMode="numeric"
                  className={FIELD_CLASS_NAME}
                />
              </div>

              <details className="rounded-2xl border border-[color:var(--ui-border-soft)] bg-[var(--ui-card-bg)] px-3 py-3">
                <summary className="ui-copy-muted cursor-pointer list-none text-sm">
                  更多信息：分类、标签、备注
                </summary>
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={itemCategoryInput}
                      onChange={(e) => setItemCategoryInput(e.target.value)}
                      placeholder="分类，例如：耗材"
                      className={FIELD_CLASS_NAME}
                    />
                    <input
                      value={itemTagsInput}
                      onChange={(e) => setItemTagsInput(e.target.value)}
                      placeholder="标签，逗号分隔"
                      className={FIELD_CLASS_NAME}
                    />
                  </div>
                  <textarea
                    value={itemNoteInput}
                    onChange={(e) => setItemNoteInput(e.target.value)}
                    placeholder="备注，例如：只剩半盒"
                    className="ui-textarea min-h-[88px] rounded-xl text-sm"
                  />
                </div>
              </details>

              <div className="flex justify-end">
                <button type="button" onClick={onCreateItem} className="btn btn-primary btn-md rounded-2xl">
                  {editingItemId ? '保存修改' : '添加物品'}
                </button>
              </div>
            </div>

            {!isEmpty && (
              <div className="glass-panel-soft space-y-3 rounded-[28px] border-[color:var(--ui-border-strong)] px-4 py-4">
                <div className="ui-kicker">筛选</div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ui-icon-muted)]" />
                  <input
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="搜名称、分类、标签或位置"
                    className="ui-input rounded-xl pl-9 text-sm"
                  />
                </div>
                <select
                  value={itemStatusFilter}
                  onChange={(e) => setItemStatusFilter(e.target.value)}
                  className="ui-select rounded-xl text-sm"
                >
                  <option value="all">全部状态</option>
                  <option value="normal">正常</option>
                  <option value="low_stock">库存低</option>
                  <option value="need_restock">待补货</option>
                  <option value="missing">缺失</option>
                </select>
                <div className="ui-hint-panel rounded-2xl px-3 py-3 text-xs leading-6">
                  这一版先把物品放哪、剩多少记清楚，后续再接生成补货、购买或归位任务。
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="ui-empty-state rounded-[26px] px-4 py-4 text-sm">
          录入后，这里会按状态展示你的物品卡片，方便直接标记“库存低”“待补货”或“缺失”。
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => {
            const meta = statusMeta[item.status];

            return (
              <div key={item.id} className="glass-panel space-y-3 rounded-[28px] border-[color:var(--ui-border-strong)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="ui-title break-words text-base font-semibold">{item.name}</div>
                    <div className="ui-copy-muted mt-1 flex flex-wrap gap-2 text-[11px]">
                      {item.category && (
                        <span className="inline-flex items-center gap-1">
                          <Package2 className="h-3 w-3" />
                          {item.category}
                        </span>
                      )}
                      {item.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] ${meta.className}`}>{meta.label}</span>
                </div>

                <div className="ui-copy text-sm">数量：{item.quantity}</div>

                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span key={`${item.id}-${tag}`} className="ui-badge inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px]">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {item.note && <div className="ui-copy-muted text-xs leading-6">{item.note}</div>}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => onUpdateItemStatus(item.id, 'normal')} className="btn btn-ghost btn-sm rounded-2xl">
                    正常
                  </button>
                  <button type="button" onClick={() => onUpdateItemStatus(item.id, 'low_stock')} className="btn btn-ghost btn-sm rounded-2xl">
                    库存低
                  </button>
                  <button type="button" onClick={() => onUpdateItemStatus(item.id, 'need_restock')} className="btn btn-ghost btn-sm rounded-2xl">
                    待补货
                  </button>
                  <button type="button" onClick={() => onUpdateItemStatus(item.id, 'missing')} className="btn btn-ghost btn-sm rounded-2xl">
                    缺失
                  </button>
                  <button type="button" onClick={() => onEditItem(item)} className="btn btn-secondary btn-sm rounded-2xl">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => onCreateItemTask(item, 'restock')} className="btn btn-secondary btn-sm rounded-2xl">
                    补货任务
                  </button>
                  <button type="button" onClick={() => onCreateItemTask(item, 'buy')} className="btn btn-secondary btn-sm rounded-2xl">
                    购买任务
                  </button>
                  <button type="button" onClick={() => onCreateItemTask(item, 'put_back')} className="btn btn-secondary btn-sm rounded-2xl">
                    归位任务
                  </button>
                  <button type="button" onClick={() => onDeleteItem(item.id)} className="btn btn-danger btn-sm ml-auto rounded-2xl">
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </div>

                {(item.status === 'low_stock' || item.status === 'need_restock') && (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    这件物品已经接近“该补了”的状态。
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
