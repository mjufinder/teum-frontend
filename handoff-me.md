# TEUM — Design Handoff: 내 정보 · 내 시간표 Redesign

**Issue:** #37 · **Branch:** `style/me-timetable-redesign`  
**Recipient:** Gemini  
**Author:** Claude (Sonnet 4.6)  
**Scope:** `src/app/(main)/me/page.tsx`, `src/app/(main)/me/timetable/page.tsx`, `src/components/timetable/TimetableGrid.tsx`, `src/components/timetable/TimetableEditor.tsx`, `src/components/timetable/TimetableUpload.tsx`

---

## 1. Project Design Language (Full System Reference)

TEUM uses a **Chzzk-inspired dark-first** system. The user can toggle dark/light via `ThemeToggle` in `AppHeader`. Every color must adapt — no hardcoded `bg-white` or `text-black`.

### 1.1 CSS Variables (`src/app/globals.css`)

```css
/* Light (:root)                      Dark (.dark) */
--c-ink:          #f1f2f4;         /* #0e0f10  — page canvas */
--c-ink-base:     #ffffff;         /* #141517  — primary surface */
--c-ink-1:        #fbfcfd;         /* #1c1d1f  — elevated card */
--c-ink-2:        #f0f1f2;         /* #202224  — hover fill */
--c-ink-3:        #e3e5e8;         /* #2e3033  — subtle chip/fill */
--c-ink-line:     #e6e7ea;         /* #2a2c2f  — divider */
--c-ink-line-2:   #cfd1d4;         /* #4d4d4d  — strong border */
--c-ink-text:     #0e0f10;         /* #ffffff  — primary text */
--c-ink-text-2:   #202224;         /* #dfe2ea  — body text */
--c-ink-text-3:   #55585e;         /* #9da5b6  — secondary text */
--c-ink-text-weak:#8a8d93;         /* #697183  — placeholder */
--c-neon:         #036635;         /* #00ffa3  — accent */
--c-neon-2:       #024d28;         /* #00e693  — accent hover */
--c-neon-3:       #1bb373;         /* #00cc82  — accent lighter */
--c-on-neon:      #ffffff;         /* #0e0f10  — text on accent */
```

### 1.2 Tailwind Utility Classes

Defined via `@theme inline` — use directly as `bg-*`, `text-*`, `border-*`:

```
bg-ink          bg-ink-base      bg-ink-1        bg-ink-2        bg-ink-3
border-ink-line border-ink-line-2
text-ink-text   text-ink-text-2  text-ink-text-3  text-ink-text-weak
bg-neon         bg-neon-2        text-neon        text-on-neon
```

Also available (legacy — light-mode semantic, still used in globals.css components):
```
brand / brand-deep / brand-soft / brand-strong
lime / lime-bright / lime-soft
danger / danger-soft
muted  line  line-strong  surface  sunken  field  foreground
```

### 1.3 Dark Mode Activation

- Class-based: `html.dark` activates dark vars
- Tailwind variant: `dark:bg-ink-1` etc. (from `@custom-variant dark (&:where(.dark, .dark *))`)
- Toggled by `ThemeToggle` → `localStorage.theme`
- FOUC prevention script in `src/app/layout.tsx` adds `.dark` before first paint

### 1.4 Typography

```
font: "IBM Plex Sans KR", "Apple SD Gothic Neo", system-ui
base size: 0.9375rem (15px) / line-height: 1.65
word-break: keep-all
```

### 1.5 Global Component Classes (`globals.css`)

| Class | Purpose |
|---|---|
| `.page-title` | `text-[1.75rem] font-bold tracking-[-0.015em]` |
| `.section-title` | `text-[1.0625rem] font-bold` |
| `.btn .btn-primary` | Green fill button |
| `.btn .btn-secondary` | Green outline button |
| `.btn .btn-danger` | Red outline button |
| `.btn-sm` | Compact button |
| `.chip[aria-pressed]` | Toggle chip, neon when pressed |
| `.badge .badge-brand .badge-accent` | Status label |
| `.notice .notice-danger` | Info/warning bar |
| `.field-label .field-hint` | Form label + hint |
| `.input` | **Has bg-white — needs dark override (see §2.5)** |
| `.slot-class` | `bg-brand` timetable cell |
| `.slot-manual` | Hatch pattern cell |
| `.slot-free` | `bg-white` cell — **needs dark override** |

---

## 2. Shared Patterns (copy-paste ready)

### 2.1 Auth-style Input (dark-safe, use instead of `.input`)

```tsx
const inkInput =
  "h-12 w-full rounded-[10px] border border-ink-line-2 bg-ink-base px-4 text-[0.95rem] text-ink-text placeholder:text-ink-text-weak transition-colors focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/30";
```

Importable from `AuthShell`:
```tsx
import { authInput, authLabel, authBtnPrimary } from "@/components/auth/AuthShell";
```

### 2.2 Pill Buttons

```tsx
// Primary neon pill
"inline-flex min-h-11 items-center justify-center rounded-full bg-neon px-6 text-[0.95rem] font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:cursor-not-allowed disabled:opacity-50"

// Ghost pill
"inline-flex min-h-11 items-center justify-center rounded-full border border-ink-line-2 px-6 text-[0.95rem] font-bold text-ink-text transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50"

// Danger pill
"inline-flex min-h-11 items-center justify-center rounded-full border border-live/60 px-6 text-[0.95rem] font-bold text-live transition-colors hover:bg-live/10 disabled:cursor-not-allowed disabled:opacity-50"
```

### 2.3 Info Card

```tsx
"rounded-[16px] border border-ink-line bg-ink-1 p-6"
```

### 2.4 Section Kicker + Title

```tsx
<span className="inline-flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.08em] text-ink-text-3 uppercase">
  <span aria-hidden className="size-1.5 rounded-full bg-neon" />
  내 정보
</span>
<h1 className="mt-2 text-[1.75rem] leading-[1.25] font-bold tracking-[-0.015em] text-ink-text">
  프로필
</h1>
```

### 2.5 Fix `.input` and `.slot-free` for Dark Mode

Add these overrides in `src/app/globals.css` inside `.dark { }` block:

```css
.dark .input {
  background-color: var(--c-ink-1);
  border-color: var(--c-ink-line-2);
  color: var(--c-ink-text);
}
.dark .input::placeholder {
  color: var(--c-ink-text-weak);
}
.dark .input:focus {
  border-color: var(--c-neon);
  outline-color: var(--c-neon);
}
.dark .slot-free {
  background-color: var(--c-ink-base);
}
```

---

## 3. Redesign: `me/page.tsx` — 내 정보

### 3.1 Current State (problems)

- Flat `<form className="card">` — no visual identity
- `.input` class breaks in dark mode
- No avatar / user identity display
- Timetable shortcut and withdraw action lumped together without hierarchy

### 3.2 Target Layout

```
┌─────────────────────────────────────────────┐
│  ○ 내 정보          [kicker + page title]    │
├─────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐ │
│  │  [Avatar circle]  이름  전공           │ │
│  │                   neon initial letter  │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌────────────────────────────────────────┐ │
│  │  프로필 편집                           │ │
│  │  이름 ___________________________      │ │
│  │  전공 ___________________________      │ │
│  │  [저장]  ✓ 저장했어요.                │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ─────── 내 시간표 ───────────────────────  │
│  시간표를 등록하면 공강 계산에 참여해요.    │
│                            [시간표 수정 →]  │
│                                             │
│  ─────── 위험 구역 ────────────────────── ⚠ │
│  탈퇴하면 모든 데이터가 삭제돼요.          │
│                           [회원 탈퇴]       │
└─────────────────────────────────────────────┘
```

### 3.3 Avatar Component (inline, no new file needed)

```tsx
function Avatar({ name }: { name: string }) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-neon/15 text-2xl font-bold text-neon">
      {initial}
    </div>
  );
}
```

Profile identity card:
```tsx
<div className="flex items-center gap-4 rounded-[16px] border border-ink-line bg-ink-1 p-5">
  <Avatar name={name} />
  <div>
    <p className="text-lg font-bold text-ink-text">{name || "—"}</p>
    <p className="text-sm text-ink-text-3">{major || "전공 미입력"}</p>
  </div>
</div>
```

### 3.4 Profile Edit Form

```tsx
<section className="flex flex-col gap-4 rounded-[16px] border border-ink-line bg-ink-1 p-6">
  <span className="text-[0.72rem] font-bold tracking-[0.08em] text-ink-text-3 uppercase flex items-center gap-2">
    <span className="size-1.5 rounded-full bg-neon" />
    프로필 편집
  </span>
  <form onSubmit={saveProfile} className="flex flex-col gap-4">
    <label className="flex flex-col gap-2 text-sm font-bold text-ink-text-2">
      이름
      <input value={name} ... className={authInput} />
    </label>
    <label className="flex flex-col gap-2 text-sm font-bold text-ink-text-2">
      전공
      <input value={major} ... className={authInput} />
    </label>
    <div className="flex items-center gap-3">
      <button type="submit" disabled={saving || ...} className={/* pill primary */}>
        {saving ? "저장 중..." : "저장"}
      </button>
      {saved && (
        <span className="flex items-center gap-1.5 text-sm text-neon">
          <span>✓</span> 저장했어요.
        </span>
      )}
      {saveError && <p className="text-sm text-live">{saveError}</p>}
    </div>
  </form>
</section>
```

### 3.5 Timetable Shortcut Card

```tsx
<section className="flex items-center justify-between gap-4 rounded-[16px] border border-ink-line bg-ink-1 p-5">
  <div>
    <p className="font-bold text-ink-text">내 시간표</p>
    <p className="mt-0.5 text-sm text-ink-text-3">시간표를 등록하면 공강 계산에 참여해요.</p>
  </div>
  <Link href="/me/timetable" className={/* ghost pill small */}>
    수정 →
  </Link>
</section>
```

### 3.6 Danger Zone

```tsx
<section className="rounded-[16px] border border-live/30 bg-live/5 p-5">
  <p className="mb-1 text-sm font-bold text-live">위험 구역</p>
  <p className="mb-4 text-sm text-ink-text-3">탈퇴하면 모든 데이터가 삭제되고 복구할 수 없어요.</p>
  <button type="button" onClick={withdraw} disabled={withdrawing} className={/* danger pill */}>
    {withdrawing ? "처리 중..." : "회원 탈퇴"}
  </button>
  {withdrawError && <p className="mt-2 text-sm text-live">{withdrawError}</p>}
</section>
```

---

## 4. Redesign: `me/timetable/page.tsx` — 내 시간표

### 4.1 Current State (problems)

- Plain `flex flex-col gap-4` — no visual structure
- Upload and editor states share no visual frame
- "이미지로 다시 등록" button is visually prominent but rarely used

### 4.2 Target Layout

```
┌─────────────────────────────────────────────┐
│  ○ 내 시간표   [kicker]                     │
│  내 시간표     [page-title]                 │
│  시간표를 등록해 공강 계산에 참여하세요.    │
├─────────────────────────────────────────────┤
│  [상태: 로딩 / 없음 / 업로드 중 / 에디터]  │
│                                             │
│  ┌── TimetableUpload or TimetableEditor ──┐ │
│  │                                        │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

Page wrapper:
```tsx
<div className="flex flex-col gap-6">
  <div>
    <span className="inline-flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.08em] text-ink-text-3 uppercase">
      <span className="size-1.5 rounded-full bg-neon" />
      내 시간표
    </span>
    <h1 className="mt-2 text-[1.75rem] leading-[1.25] font-bold tracking-[-0.015em] text-ink-text">
      시간표 편집
    </h1>
    <p className="mt-1 text-sm text-ink-text-3">
      시간표를 등록하면 모임 공강 계산에 자동으로 참여해요.
    </p>
  </div>
  {renderContent()}
</div>
```

"이미지로 다시 등록" button: move it inside `TimetableEditor` as a secondary ghost action at the bottom, not at the top of the page.

---

## 5. Redesign: `TimetableUpload.tsx`

### 5.1 Current State

`.card` container (white), plain `<input type="file">` with `.input` class.

### 5.2 Target

Replace `.card` and `.input` with ink-system equivalents. Add a visual drop zone.

```tsx
<div className="flex flex-col gap-5 rounded-[16px] border border-ink-line bg-ink-1 p-6">
  {/* hint */}
  <p className="text-sm text-ink-text-3">
    에브리타임 앱 → 시간표 탭 → 설정 → 이미지로 저장 후 올려주세요.
  </p>

  {/* drop zone */}
  <label className="flex cursor-pointer flex-col items-center gap-3 rounded-[12px] border-2 border-dashed border-ink-line-2 bg-ink-base p-8 text-center transition-colors hover:border-neon/60 hover:bg-neon/5">
    <span className="grid size-12 place-items-center rounded-full bg-ink-3 text-ink-text-3">
      {/* upload SVG icon */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    </span>
    <div>
      <p className="font-bold text-ink-text">시간표 이미지 선택</p>
      <p className="mt-1 text-xs text-ink-text-weak">PNG, JPEG · 10MB 이하</p>
    </div>
    <input type="file" accept="image/png,image/jpeg" onChange={handleFile} disabled={loading} className="sr-only" />
  </label>

  {/* image preview */}
  {preview && (
    <div className="relative h-44 w-full overflow-hidden rounded-[10px] border border-ink-line bg-ink-base">
      <Image src={preview} alt="고른 시간표 이미지" fill unoptimized className="object-contain object-left p-2" />
    </div>
  )}

  {error && (
    <p className="rounded-[10px] border-l-2 border-live bg-ink-2 px-4 py-3 text-sm text-ink-text-2">{error}</p>
  )}

  {/* actions */}
  <div className="flex flex-wrap gap-2">
    <button type="button" disabled={!file || loading} onClick={handleRecognize} className={/* neon pill */}>
      {loading ? "읽는 중이에요..." : "인식하기"}
    </button>
    {error && (
      <button type="button" onClick={onManual} disabled={loading} className={/* ghost pill */}>
        직접 입력하기
      </button>
    )}
    <button type="button" onClick={onCancel} disabled={loading} className={/* ghost pill */}>
      취소
    </button>
  </div>
</div>
```

---

## 6. Redesign: `TimetableEditor.tsx`

### 6.1 Current State

Tool selector: custom segmented control with hardcoded `bg-white / bg-brand / text-brand`. Save button: `.btn .btn-primary`. Both break in dark mode.

### 6.2 Tool Selector — Pill Segment

Replace the current segmented control with ink-aware pills:

```tsx
<div
  className="inline-flex gap-1 rounded-[10px] border border-ink-line bg-ink-base p-1"
  role="group"
  aria-label="칠하기 도구"
>
  {tools.map((item) => {
    const active = tool === item.state;
    return (
      <button
        key={item.state}
        type="button"
        aria-pressed={active}
        onClick={() => setTool(item.state)}
        className={`inline-flex min-h-9 items-center gap-2 rounded-[8px] px-3.5 text-sm font-bold transition-colors ${
          active
            ? "bg-neon text-on-neon shadow-sm"
            : "text-ink-text-3 hover:bg-ink-2 hover:text-ink-text"
        }`}
      >
        <Swatch state={item.state} active={active} />
        {item.label}
      </button>
    );
  })}
</div>
```

Swatch sub-component (inline):
```tsx
function Swatch({ state, active }: { state: SlotState; active: boolean }) {
  if (state === "class") {
    return <span className={`size-3.5 rounded-[3px] ${active ? "bg-on-neon/80" : "bg-brand"}`} />;
  }
  if (state === "manual") {
    // hatch: use CSS class slot-manual but sized down
    return <span className="slot-manual size-3.5 rounded-[3px] border border-current/30" />;
  }
  // free / erase
  return (
    <span className="size-3.5 rounded-[3px] border border-ink-line-2 bg-ink-base">
      <svg viewBox="0 0 14 14" className="size-full text-ink-text-weak" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3l8 8M11 3l-8 8" />
      </svg>
    </span>
  );
}
```

### 6.3 Hint text, Warnings, Save Button

```tsx
{/* hint */}
<p className="text-sm text-ink-text-3">
  칠할 종류를 고른 뒤, 칸을 누르거나 끌어서 칠해 주세요.
</p>

{/* warnings */}
{warnings.map((w, i) => (
  <div key={i} className="rounded-[10px] border-l-2 border-neon/60 bg-ink-2 px-4 py-3 text-sm text-ink-text-2">
    {w}
  </div>
))}

{/* bottom bar */}
<div className="flex items-center gap-3">
  <button type="button" disabled={saving} onClick={handleSave} className={/* neon pill */}>
    {saving ? "저장 중..." : "저장"}
  </button>
  {saved && <span className="text-sm font-bold text-neon">✓ 저장했어요.</span>}
  {error && <p className="text-sm text-live">{error}</p>}
</div>

{/* re-upload shortcut (shown at bottom of editor) */}
{onReupload && (
  <div className="border-t border-ink-line pt-4">
    <button type="button" onClick={onReupload} className={/* ghost pill small */}>
      이미지로 다시 등록
    </button>
  </div>
)}
```

Add `onReupload?: () => void` prop to `TimetableEditor` and remove the button from `me/timetable/page.tsx`'s top-level.

---

## 7. Redesign: `TimetableGrid.tsx`

### 7.1 Current State (dark mode problems)

| Element | Current class | Problem |
|---|---|---|
| Grid border top | `border-t-2 border-brand` | ✓ fine |
| Cell border | `border-t border-l border-line` | `border-line` = `#cfe0d6` hardcoded (light only via CSS var but maps to light value) |
| Slot-free cell | `.slot-free` = `bg-white` | **White in dark mode** |
| Label text | `text-muted` | Fine (CSS var) |
| Legend swatch border | `border-brand` | ✓ fine |

### 7.2 Fix Strategy

**Option A (recommended) — Add dark overrides in `globals.css`:**

```css
/* inside `.dark { }` block */
.dark .slot-free {
  background-color: var(--c-ink-base);
}
```

Cell border: replace `border-line` with `border-ink-line` in `TimetableGrid.tsx`:

```tsx
// Before
className={`h-6 border-t border-l border-line ...`}

// After  
className={`h-6 border-t border-l border-ink-line ...`}
```

Hover outline: replace `hover:outline-foreground` with `hover:outline-neon/60` for a neon paint cursor feel.

### 7.3 Legend Swatches

```tsx
<div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-text-3">
  {legend.map((item) => (
    <span key={item.state} className="flex items-center gap-1.5">
      <span className={`size-3.5 rounded-[3px] border border-ink-line-2 ${cellColors[item.state]}`} />
      {item.label}
    </span>
  ))}
</div>
```

### 7.4 Grid Container

```tsx
// Before
<div className="overflow-x-auto border-t-2 border-brand pt-1">

// After — keep brand top border, wrap in ink card
<div className="overflow-hidden rounded-[16px] border border-ink-line bg-ink-1 p-4">
  <div className="overflow-x-auto border-t-2 border-brand pt-1">
    {/* grid */}
  </div>
</div>
```

---

## 8. File Checklist

| File | Key changes |
|---|---|
| `src/app/globals.css` | Add `.dark .input`, `.dark .slot-free` overrides |
| `src/app/(main)/me/page.tsx` | Avatar card, ink form, timetable shortcut, danger zone |
| `src/app/(main)/me/timetable/page.tsx` | Kicker header, move reupload button to editor |
| `src/components/timetable/TimetableUpload.tsx` | Drop zone card, ink buttons |
| `src/components/timetable/TimetableEditor.tsx` | Pill segment toolbar, add `onReupload?` prop, ink save bar |
| `src/components/timetable/TimetableGrid.tsx` | `border-ink-line` cells, neon hover, ink card wrapper |

**Do NOT change:**
- Cell painting logic in `TimetableGrid.tsx` (`handlePointerDown`, `handlePointerMove`, `cellsBetween`)
- `lib/timetable.ts`, `lib/timetable-api.ts` — no logic changes
- `onRecognized`, `onManual`, `onCancel` props of `TimetableUpload`
- Slot state machine in `TimetableEditor` (`paintCells`, `handleSave`)

---

## 9. PR Instructions

- **Target branch:** `dev`
- **Closes:** #37
- **No new npm packages** — `lucide-react` is already installed if you need icons; otherwise use inline SVG
- Run `npx tsc --noEmit` before pushing — must be 0 errors
- Run `npm run build` — must pass

---

*End of handoff. Branch: `style/me-timetable-redesign`, base: `dev`. Questions → issue #37.*
