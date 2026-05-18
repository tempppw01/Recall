# Release Notes - v0.3.4

This release focuses on making Recall feel more intelligent on entry, more coherent across workspaces, and more useful when live information is needed.

## Highlights

### AI Assistant
- Merged casual chat into the AI assistant page so chat, record, and manage workflows share one entry point.
- Added a compact smart briefing at the top of the AI assistant page with recent priority tasks and an AI-generated current-state summary.
- Added web-enabled answering with Tavily, plus local Google, Bing, and Baidu search providers.
- Added clear-context and interrupt/retry behaviors so long answers can be stopped, replaced, or retried without losing the conversation shape.
- Improved assistant suggestions with collapsible reasoning, direct task navigation, and expandable subtasks.

### Knowledge And Sync
- Moved the knowledge base into Settings instead of keeping it as a separate feature page.
- Included knowledge entries in sync payloads while keeping onboarding sample tasks out of synced data.
- Improved automatic knowledge capture so chat content is summarized into reusable notes instead of being copied verbatim.
- Added model/provider icon coverage for common providers, including OpenAI, Gemini, Grok, DeepSeek, Jina, Kimi, GLM, Qwen, MiniMax, Spark, and BGE.

### Task And Planning UX
- Merged inbox, today, next 7 days, and todo shortcuts into one task page with scope controls.
- Added inline completed-task visibility and a clear-completed action.
- Added drag selection for batch mode and quick right-click time actions.
- Refined task detail behavior on narrow screens and reduced dense helper copy.
- Improved recurring task recognition and assistant time recommendations.

### Workspace Redesigns
- Redesigned timeline, review, habits, countdown, calendar, quadrant, and statistics workspaces for clearer first actions.
- Improved responsive behavior for calendar views and quadrant layouts.
- Added quadrant hover actions while removing unnecessary drag text.
- Tightened shared top bars, cards, scroll behavior, light/dark theme surfaces, and mobile spacing.

### Pomodoro
- Reworked Pomodoro overview cards to keep the timer as the visual focus.
- Added configurable white-noise mixes and tied background audio playback to active Pomodoro sessions.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run release:check`
