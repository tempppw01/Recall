import { AlertTriangle, MapPin, Package2, Search, Tag, XCircle } from 'lucide-react';
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
  onCreateItem: () => void;
  onUpdateItemStatus: (id: string, status: ItemStatus) => void;
  onDeleteItem: (id: string) => void;
  onCreateItemTask: (item: Item, action: 'restock' | 'buy' | 'put_back') => void;
};

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
  onCreateItem,
  onUpdateItemStatus,
  onDeleteItem,
  onCreateItemTask,
}: ItemsPanelProps) {
  const lowStockCount = items.filter((item) => item.status === 'low_stock' || item.status === 'need_restock').length;
  const missingCount = items.filter((item) => item.status === 'missing').length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="glass-panel rounded-[30px] px-4 py-4 sm:px-5 sm:py-5 space-y-4 border-[color:var(--ui-border-strong)]">
        <div className="flex flex-wrap items-center gap-2.5 text-[11px] sm:text-xs text-[#777777]">
          <span className="glass-card px-2.5 py-1 rounded-full">物品总数：<span className="text-[#F1F1F1]">{items.length}</span></span>
          <span className="glass-card px-2.5 py-1 rounded-full">待补货：<span className="text-[#F1F1F1]">{lowStockCount}</span></span>
          <span className="glass-card px-2.5 py-1 rounded-full">缺失：<span className="text-[#F1F1F1]">{missingCount}</span></span>
          <span className="text-[#5E5E5E]">先把东西放清楚，后面再接购买/补货任务。</span>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="glass-panel-soft rounded-[28px] border-[color:var(--ui-border-strong)] px-4 py-4 space-y-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#6d7483]">新增物品</div>
            <input value={itemNameInput} onChange={(e) => setItemNameInput(e.target.value)} placeholder="物品名称，例如：5号电池" className="w-full bg-[#1F1F1F]/80 border border-[#3A3F4B]/50 rounded-xl px-3 py-2 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:border-blue-500" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={itemCategoryInput} onChange={(e) => setItemCategoryInput(e.target.value)} placeholder="分类，例如：耗材" className="w-full bg-[#1F1F1F]/80 border border-[#3A3F4B]/50 rounded-xl px-3 py-2 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:border-blue-500" />
              <input value={itemLocationInput} onChange={(e) => setItemLocationInput(e.target.value)} placeholder="位置，例如：书房抽屉" className="w-full bg-[#1F1F1F]/80 border border-[#3A3F4B]/50 rounded-xl px-3 py-2 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:border-blue-500" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={itemQuantityInput} onChange={(e) => setItemQuantityInput(e.target.value)} placeholder="数量" inputMode="numeric" className="w-full bg-[#1F1F1F]/80 border border-[#3A3F4B]/50 rounded-xl px-3 py-2 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:border-blue-500" />
              <input value={itemTagsInput} onChange={(e) => setItemTagsInput(e.target.value)} placeholder="标签，逗号分隔" className="w-full bg-[#1F1F1F]/80 border border-[#3A3F4B]/50 rounded-xl px-3 py-2 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:border-blue-500" />
            </div>
            <textarea value={itemNoteInput} onChange={(e) => setItemNoteInput(e.target.value)} placeholder="备注，例如：只剩半盒" className="min-h-[88px] w-full resize-y bg-[#1F1F1F]/80 border border-[#3A3F4B]/50 rounded-xl px-3 py-2 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:border-blue-500" />
            <div className="flex justify-end">
              <button type="button" onClick={onCreateItem} className="btn btn-primary btn-md rounded-2xl">添加物品</button>
            </div>
          </div>

          <div className="glass-panel-soft rounded-[28px] border-[color:var(--ui-border-strong)] px-4 py-4 space-y-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#6d7483]">筛选</div>
            <div className="relative">
              <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="搜名称、分类、标签、位置" className="w-full pl-9 bg-[#1F1F1F]/80 border border-[#3A3F4B]/50 rounded-xl px-3 py-2 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:border-blue-500" />
            </div>
            <select value={itemStatusFilter} onChange={(e) => setItemStatusFilter(e.target.value)} className="w-full bg-[#1F1F1F]/80 border border-[#3A3F4B]/50 rounded-xl px-3 py-2 text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500">
              <option value="all">全部状态</option>
              <option value="normal">正常</option>
              <option value="low_stock">库存低</option>
              <option value="need_restock">待补货</option>
              <option value="missing">缺失</option>
            </select>
            <div className="text-xs text-[#7d8595] leading-6">这版先做最小可用骨架：记清楚东西在哪、剩多少、是不是该补了。下一轮再接“生成补货/购买任务”。</div>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 text-[#444444] glass-panel rounded-[30px] border border-dashed border-[color:var(--ui-border-soft)]">
          <Package2 className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm">还没有物品，先录入一个常用东西</p>
          <p className="text-xs text-[#555555] mt-2">比如电池、药品、线材、证件、工具这些最容易找不到的。</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => {
            const meta = statusMeta[item.status];
            return (
              <div key={item.id} className="glass-panel rounded-[28px] p-4 space-y-3 border-[color:var(--ui-border-strong)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-[#F3F6FF] break-words">{item.name}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[#8F9BB3]">
                      {item.category && <span className="inline-flex items-center gap-1"><Package2 className="w-3 h-3" />{item.category}</span>}
                      {item.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] ${meta.className}`}>{meta.label}</span>
                </div>
                <div className="text-sm text-[#D7DEEF]">数量：{item.quantity}</div>
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span key={`${item.id}-${tag}`} className="inline-flex items-center gap-1 rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-[11px] text-[#AEB8CD]">
                        <Tag className="w-3 h-3" />{tag}
                      </span>
                    ))}
                  </div>
                )}
                {item.note && <div className="text-xs text-[#8F9BB3] leading-6">{item.note}</div>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => onUpdateItemStatus(item.id, 'normal')} className="btn btn-ghost btn-sm rounded-2xl">正常</button>
                  <button type="button" onClick={() => onUpdateItemStatus(item.id, 'low_stock')} className="btn btn-ghost btn-sm rounded-2xl">库存低</button>
                  <button type="button" onClick={() => onUpdateItemStatus(item.id, 'need_restock')} className="btn btn-ghost btn-sm rounded-2xl">待补货</button>
                  <button type="button" onClick={() => onUpdateItemStatus(item.id, 'missing')} className="btn btn-ghost btn-sm rounded-2xl">缺失</button>
                  <button type="button" onClick={() => onCreateItemTask(item, 'restock')} className="btn btn-secondary btn-sm rounded-2xl">补货任务</button>
                  <button type="button" onClick={() => onCreateItemTask(item, 'buy')} className="btn btn-secondary btn-sm rounded-2xl">购买任务</button>
                  <button type="button" onClick={() => onCreateItemTask(item, 'put_back')} className="btn btn-secondary btn-sm rounded-2xl">归位任务</button>
                  <button type="button" onClick={() => onDeleteItem(item.id)} className="btn btn-danger btn-sm rounded-2xl ml-auto">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                {(item.status === 'low_stock' || item.status === 'need_restock') && (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 inline-flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
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
