"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type ModelSelectProps = {
  models: string[];
  value: string;
  onChange: (value: string) => void;
  onOpen?: () => void | Promise<void>;
  ariaLabel?: string;
  title?: string;
  buttonClassName?: string;
  panelClassName?: string;
  optionClassName?: string;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
};

type ModelProviderIconRule = {
  key: string;
  label: string;
  matchers: string[];
  iconUrl?: string;
  lobeThemeSlug?: string;
  lobeColorSlug?: string;
  lobePreferredStyle?: 'theme' | 'color';
};

const buildLobeIconUrl = (themeMode: 'dark' | 'light', slug: string) => (
  `https://unpkg.com/@lobehub/icons-static-png@latest/${themeMode}/${slug}.png`
);

const MODEL_PROVIDER_ICON_RULES: ModelProviderIconRule[] = [
  {
    key: 'deepseek',
    label: 'DeepSeek',
    matchers: ['deepseek'],
    lobeThemeSlug: 'deepseek',
    lobeColorSlug: 'deepseek-color',
    lobePreferredStyle: 'color',
  },
  {
    key: 'gemini',
    label: 'Gemini',
    matchers: ['gemini'],
    lobeThemeSlug: 'gemini',
    lobeColorSlug: 'gemini-color',
    lobePreferredStyle: 'color',
    iconUrl: 'https://storage.googleapis.com/gweb-uniblog-publish-prod/images/Gemini_SparkIcon_.max-1440x810.png',
  },
  {
    key: 'grok',
    label: 'Grok',
    matchers: ['grok', 'xai'],
    lobeThemeSlug: 'xai',
    lobePreferredStyle: 'theme',
    iconUrl: 'https://organizationalphysics.com/wp-content/uploads/2025/05/grok-logo.png',
  },
  {
    key: 'jina',
    label: 'Jina',
    matchers: ['jina'],
    lobeThemeSlug: 'jina',
    lobePreferredStyle: 'theme',
    iconUrl: 'https://miro.medium.com/1*NNFKpvX4kJ6m1Xlzb7toiQ.png',
  },
  {
    key: 'kimi',
    label: 'Kimi',
    matchers: ['kimi', 'moonshot'],
    lobeThemeSlug: 'kimi',
    lobeColorSlug: 'kimi-color',
    lobePreferredStyle: 'color',
    iconUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT67b4JNffRE6z2oqGQ9ht-nC--q28I1y14DQ&s',
  },
  {
    key: 'glm',
    label: 'GLM',
    matchers: ['glm', 'chatglm', 'zhipu'],
    lobeThemeSlug: 'chatglm',
    lobeColorSlug: 'chatglm-color',
    lobePreferredStyle: 'color',
  },
  {
    key: 'qwen',
    label: 'Qwen',
    matchers: ['qwen', 'qwq', 'qvq', 'tongyi'],
    lobeThemeSlug: 'qwen',
    lobeColorSlug: 'qwen-color',
    lobePreferredStyle: 'color',
  },
  {
    key: 'minimax',
    label: 'MiniMax',
    matchers: ['minimax', 'abab'],
    lobeThemeSlug: 'minimax',
    lobeColorSlug: 'minimax-color',
    lobePreferredStyle: 'color',
  },
  {
    key: 'spark',
    label: 'Spark',
    matchers: ['spark', 'xinghuo', 'xfyun'],
    lobeThemeSlug: 'spark',
    lobeColorSlug: 'spark-color',
    lobePreferredStyle: 'color',
  },
  {
    key: 'bge',
    label: 'BGE',
    matchers: ['bge', 'baai'],
    lobeThemeSlug: 'baai',
    lobeColorSlug: 'baai-color',
    lobePreferredStyle: 'color',
  },
  {
    key: 'gpt',
    label: 'OpenAI',
    matchers: ['gpt', 'chatgpt', 'openai'],
    lobeThemeSlug: 'openai',
    lobePreferredStyle: 'theme',
  },
];

const resolveModelProvider = (model: string) => {
  const normalized = model.trim().toLowerCase();
  return MODEL_PROVIDER_ICON_RULES.find((rule) => (
    rule.matchers.some((matcher) => normalized.includes(matcher))
  )) ?? null;
};

const getThemeModeFromDocument = (): 'dark' | 'light' => {
  if (typeof document === 'undefined') return 'dark';
  return document.body.classList.contains('theme-light') ? 'light' : 'dark';
};

const useResolvedThemeMode = () => {
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => getThemeModeFromDocument());

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const syncThemeMode = () => {
      setThemeMode(getThemeModeFromDocument());
    };

    syncThemeMode();

    const observer = new MutationObserver(syncThemeMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return themeMode;
};

const ModelIcon = ({ model, size = 'md' }: { model: string; size?: 'sm' | 'md' }) => {
  const provider = resolveModelProvider(model);
  const themeMode = useResolvedThemeMode();
  const [iconIndex, setIconIndex] = useState(0);
  const boxSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  useEffect(() => {
    setIconIndex(0);
  }, [model, provider?.key, themeMode]);

  const providerIconUrls = (() => {
    if (!provider) return [] as string[];

    const urls: string[] = [];

    if (provider.lobePreferredStyle === 'color' && provider.lobeColorSlug) {
      urls.push(buildLobeIconUrl(themeMode, provider.lobeColorSlug));
    }

    if (provider.lobeThemeSlug) {
      urls.push(buildLobeIconUrl(themeMode, provider.lobeThemeSlug));
    }

    if (provider.iconUrl) {
      urls.push(provider.iconUrl);
    }

    return Array.from(new Set(urls.filter(Boolean)));
  })();
  const providerIconUrl = providerIconUrls[iconIndex] || '';

  if (provider && providerIconUrl) {
    return (
      <img
        src={providerIconUrl}
        alt={provider.label}
        className={`${boxSize} shrink-0 rounded-full object-cover`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          if (iconIndex < providerIconUrls.length - 1) {
            setIconIndex((current) => current + 1);
          } else {
            setIconIndex(providerIconUrls.length);
          }
        }}
      />
    );
  }

  const initial = model.trim().charAt(0).toUpperCase() || 'M';

  return (
    <span
      className={`${boxSize} ${textSize} inline-flex shrink-0 items-center justify-center rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] font-semibold text-[color:var(--ui-text-secondary)]`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
};

const ModelSelect = ({
  models,
  value,
  onChange,
  onOpen,
  ariaLabel,
  title,
  buttonClassName,
  panelClassName,
  optionClassName,
  size = 'md',
  align = 'left',
}: ModelSelectProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedValue = models.includes(value) ? value : (value || models[0] || '');
  const alignClassName = align === 'right' ? 'right-0' : 'left-0';
  const buttonLayoutClassName = size === 'sm'
    ? 'flex min-h-7 w-full items-center justify-between gap-2'
    : 'flex min-h-[44px] w-full items-center justify-between gap-2 text-left';
  const defaultButtonClassName = size === 'sm'
    ? 'flex min-h-7 w-full items-center justify-between gap-2 rounded border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-2 py-1 text-[10px] text-[color:var(--ui-text-primary)]'
    : 'flex min-h-[44px] w-full items-center justify-between gap-2 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-3 py-2.5 text-left text-[13px] text-[color:var(--ui-text-primary)] transition-colors hover:border-[color:var(--ui-border-strong)] sm:text-sm';
  const defaultPanelClassName = size === 'sm'
    ? 'absolute z-50 mt-1.5 w-[260px] max-w-[min(80vw,260px)] overflow-hidden rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.18)]'
    : 'absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.18)]';
  const defaultOptionClassName = size === 'sm'
    ? 'flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[11px] text-[color:var(--ui-text-primary)] transition-colors hover:bg-[rgba(var(--theme-accent),0.10)]'
    : 'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12px] text-[color:var(--ui-text-primary)] transition-colors hover:bg-[rgba(var(--theme-accent),0.10)] sm:text-sm';

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      void onOpen?.();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={handleToggle}
        className={buttonClassName ? `${buttonLayoutClassName} ${buttonClassName}` : defaultButtonClassName}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ModelIcon model={selectedValue} size={size} />
          <span className="truncate">{selectedValue || '未选择模型'}</span>
        </span>
        <ChevronDown className={`shrink-0 text-[color:var(--ui-icon-muted)] transition-transform ${open ? 'rotate-180' : ''} ${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      </button>

      {open && (
        <div
          className={`${alignClassName} ${defaultPanelClassName} ${panelClassName ?? ''}`}
          role="listbox"
          aria-label={ariaLabel}
        >
          <div className="max-h-72 overflow-y-auto">
            {models.map((model) => {
              const active = model === selectedValue;
              return (
                <button
                  key={model}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(model);
                    setOpen(false);
                  }}
                  className={`${defaultOptionClassName} ${optionClassName ?? ''} ${active ? 'bg-[rgba(var(--theme-accent),0.12)] text-[color:var(--ui-text-strong)]' : ''}`}
                >
                  <ModelIcon model={model} size={size} />
                  <span className="min-w-0 flex-1 truncate">{model}</span>
                  {active ? <Check className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} shrink-0 text-[color:var(--ui-text-strong)]`} /> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelect;
