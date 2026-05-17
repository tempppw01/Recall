import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Edit3, MapPin, Package2, Plus, Search, Tag, X, XCircle } from 'lucide-react';
import { Item } from '@/lib/store';

type ItemStatus = Item['status'];
type QuickItemTemplate = {
  name: string;
  category: string;
  tags?: string[];
  note?: string;
};

const statusMeta: Record<ItemStatus, { label: string; className: string }> = {
  normal: { label: '正常', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' },
  low_stock: { label: '库存低', className: 'border-amber-500/30 bg-amber-500/10 text-amber-200' },
  need_restock: { label: '待补货', className: 'border-orange-500/30 bg-orange-500/10 text-orange-200' },
  missing: { label: '缺失', className: 'border-rose-500/30 bg-rose-500/10 text-rose-200' },
};

const quickItemTemplates: QuickItemTemplate[] = [
  { name: '电池', category: '耗材', tags: ['常用', '补货'] },
  { name: '药品', category: '健康', tags: ['常用', '有效期'] },
  { name: '线材', category: '数码', tags: ['常用', '收纳'] },
  { name: '证件', category: '证件', tags: ['重要', '随身'] },
  { name: '工具', category: '工具', tags: ['常用', '归位'] },
];

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
  onCancelItemForm: () => void;
  onEditItem: (item: Item) => void;
  onUpdateItemStatus: (id: string, status: ItemStatus) => void;
  onDeleteItem: (id: string) => void;
  onCreateItemTask: (item: Item, action: 'restock' | 'buy' | 'put_back') => void;
  onQuickCreateItem: (template: QuickItemTemplate) => void;
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
  onCancelItemForm,
  onEditItem,
  onUpdateItemStatus,
  onDeleteItem,
  onCreateItemTask,
  onQuickCreateItem,
}: ItemsPanelProps) {
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const lowStockCount = items.filter((item) => item.status === 'low_stock' || item.status === 'need_restock').length;
  const missingCount = items.filter((item) => item.status === 'missing').length;
  const isEmpty = items.length === 0;

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: '全部状态' },
      { value: 'normal', label: '正常' },
      { value: 'low_stock', label: '库存低' },
      { value: 'need_restock', label: '待补货' },
      { value: 'missing', label: '缺失' },
    ],
    [],
  );

  useEffect(() => {
    if (editingItemId) {
      setIsItemFormOpen(true);
    }
  }, [editingItemId]);

  const openNewItemForm = () => {
    onCancelItemForm();
    setIsItemFormOpen(true);
  };

  const closeItemForm = () => {
    setIsItemFormOpen(false);
    onCancelItemForm();
  };

  const submitItemForm = () => {
    const hasName = itemNameInput.trim().length > 0;
    onCreateItem();
    if (hasName) {
      setIsItemFormOpen(false);
    }
  };

  return (
    <div className="theme-native-surface space-y-5 pb-24 sm:space-y-6 sm:pb-28">
      <div className="glass-panel rounded-[30px] border-[color:var(--ui-border-strong)] px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <div className="ui-kicker">物品管理</div>
            <h2 className="ui-title mt-1 text-xl font-semibold tracking-[-0.03em]">物品台账</h2>
            <p className="ui-copy-muted mt-1 max-w-2xl text-sm leading-6">
              记录物品放在哪里、剩余多少，以及是否需要补货或归位。
            </p>
            <div className="ui-copy-muted mt-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
              <span className="glass-card rounded-full px-2.5 py-1">
                物品总数：<span className="ui-title">{items.length}</span>
              </span>
              <span className="glass-card rounded-full px-2.5 py-1">
                待处理：<span className="ui-title">{lowStockCount}</span>
              </span>
              <span className="glass-card rounded-full px-2.5 py-1">
                缺失：<span className="ui-title">{missingCount}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={openNewItemForm}
            className="hidden"
            aria-label="新增物品"
          >
            <Plus className="h-4 w-4" />
            新增物品
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div className="ui-empty-state rounded-[28px] border border-dashed border-[color:var(--ui-border-strong)] px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--ui-border-soft)] bg-[var(--ui-card-bg)]">
              <Package2 className="h-6 w-6 text-[color:var(--ui-icon-muted)]" />
            </div>
            <div className="min-w-0">
              <p className="ui-title text-base font-semibold">先添加一个常用物品</p>
              <p className="ui-copy-muted mt-1 text-sm leading-6">
                从经常找不到或需要补货的东西开始，比如电池、药品、线材、证件或工具。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {quickItemTemplates.map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => onQuickCreateItem(template)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.10)] px-3 py-1.5 text-xs font-medium text-[color:var(--ui-text-strong)] transition-all hover:-translate-y-0.5 hover:border-[rgba(var(--theme-accent),0.36)] hover:bg-[rgba(var(--theme-accent),0.16)]"
                    title={`快速添加${template.name}`}
                  >
                    <Plus className="h-3 w-3" />
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="glass-panel-soft rounded-[28px] border-[color:var(--ui-border-strong)] px-4 py-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ui-icon-muted)]" />
                <input
                  value={itemSearch}
                  onChange={(event) => setItemSearch(event.target.value)}
                  placeholder="搜索名称、分类、标签、位置或备注"
                  className="ui-input rounded-xl pl-9 text-sm"
                />
              </div>
              <select
                value={itemStatusFilter}
                onChange={(event) => setItemStatusFilter(event.target.value)}
                className="ui-select rounded-xl text-sm"
                aria-label="筛选物品状态"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {items.map((item) => {
              const meta = statusMeta[item.status];

              return (
                <article key={item.id} className="glass-panel space-y-3 rounded-[28px] border-[color:var(--ui-border-strong)] p-4">
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
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${meta.className}`}>{meta.label}</span>
                  </div>

                  <div className="ui-copy text-sm">数量：{item.quantity} 件</div>

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
                    <button
                      type="button"
                      onClick={() => onEditItem(item)}
                      className="btn btn-secondary btn-sm rounded-2xl"
                      aria-label={`编辑 ${item.name}`}
                    >
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
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="btn btn-danger btn-sm ml-auto rounded-2xl"
                      aria-label={`删除 ${item.name}`}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {(item.status === 'low_stock' || item.status === 'need_restock') && (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      这件物品已标记为需要关注。
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      {!isItemFormOpen && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[45] flex justify-center px-4">
          <button
            type="button"
            onClick={openNewItemForm}
            className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(var(--theme-accent),0.28)] bg-[color:var(--ui-card-bg)] text-[color:var(--ui-text-strong)] shadow-[0_18px_40px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[rgba(var(--theme-accent),0.4)] hover:bg-[color:var(--ui-card-hover-bg)]"
            aria-label="新增物品"
            title="新增物品"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      )}

      {isItemFormOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-[color:var(--ui-overlay-bg)] px-3 pb-3 pt-14 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={closeItemForm}
        >
          <div
            className="theme-native-surface motion-modal w-full max-w-lg overflow-hidden rounded-[30px] border border-[color:var(--ui-border-strong)] bg-[color:var(--ui-modal-bg)] shadow-[0_28px_80px_rgba(0,0,0,0.36)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-[color:var(--ui-modal-bg)] flex items-start justify-between gap-4 border-b border-[color:var(--ui-border-soft)] px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="ui-kicker">{editingItemId ? '编辑物品' : '新增物品'}</div>
                <h3 className="ui-title mt-1 text-lg font-semibold">{editingItemId ? '更新物品信息' : '添加到物品台账'}</h3>
                <p className="ui-copy-muted mt-1 text-sm">先填写名称、位置和数量，分类与备注可以稍后补充。</p>
              </div>
              <button
                type="button"
                onClick={closeItemForm}
                className="btn btn-ghost btn-sm rounded-2xl"
                aria-label="关闭物品表单"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[min(70vh,560px)] space-y-4 overflow-y-auto bg-[color:var(--ui-modal-bg)] px-5 py-5 sm:px-6">
              <div>
                <label className="ui-field-label mb-2 block text-[11px] sm:text-xs">物品名称</label>
                <input
                  autoFocus
                  value={itemNameInput}
                  onChange={(event) => setItemNameInput(event.target.value)}
                  placeholder="例如：5 号电池"
                  className={FIELD_CLASS_NAME}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="ui-field-label mb-2 block text-[11px] sm:text-xs">位置</label>
                  <input
                    value={itemLocationInput}
                    onChange={(event) => setItemLocationInput(event.target.value)}
                    placeholder="例如：书房抽屉"
                    className={FIELD_CLASS_NAME}
                  />
                </div>
                <div>
                  <label className="ui-field-label mb-2 block text-[11px] sm:text-xs">数量（件）</label>
                  <div className="relative">
                    <input
                      value={itemQuantityInput}
                      onChange={(event) => setItemQuantityInput(event.target.value)}
                      placeholder="请输入数量"
                      inputMode="numeric"
                      className={`${FIELD_CLASS_NAME} pr-12`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-[color:var(--ui-text-muted)]">
                      件
                    </span>
                  </div>
                </div>
              </div>

              <details className="rounded-2xl border border-[color:var(--ui-border-soft)] bg-[var(--ui-card-bg)] px-3 py-3" open={Boolean(editingItemId)}>
                <summary className="ui-copy-muted cursor-pointer list-none text-sm">更多信息：分类、标签、备注</summary>
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="ui-field-label mb-2 block text-[11px] sm:text-xs">分类</label>
                      <input
                        value={itemCategoryInput}
                        onChange={(event) => setItemCategoryInput(event.target.value)}
                        placeholder="例如：耗材"
                        className={FIELD_CLASS_NAME}
                      />
                    </div>
                    <div>
                      <label className="ui-field-label mb-2 block text-[11px] sm:text-xs">标签</label>
                      <input
                        value={itemTagsInput}
                        onChange={(event) => setItemTagsInput(event.target.value)}
                        placeholder="用逗号分隔"
                        className={FIELD_CLASS_NAME}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="ui-field-label mb-2 block text-[11px] sm:text-xs">备注</label>
                    <textarea
                      value={itemNoteInput}
                      onChange={(event) => setItemNoteInput(event.target.value)}
                      placeholder="例如：只剩半盒"
                      className="ui-textarea min-h-[88px] rounded-xl text-sm"
                    />
                  </div>
                </div>
              </details>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[color:var(--ui-border-soft)] bg-[color:var(--ui-modal-bg)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button type="button" onClick={closeItemForm} className="btn btn-secondary btn-md rounded-2xl">
                取消
              </button>
              <button type="button" onClick={submitItemForm} className="btn btn-primary btn-md rounded-2xl">
                {editingItemId ? '保存修改' : '添加物品'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
