# TEUM — Design Handoff: Meetings App Redesign

**Issue:** #31 · **Branch:** `style/meetings-ink-neon`  
**Recipient:** Gemini  
**Author:** Claude (Sonnet 4.6)  
**Goal:** Apply the same ink/neon design language used on the Landing + Auth pages to every screen inside the `(main)` route group (meetings list, meeting detail, new/edit forms, my profile, timetable).

---

## 1. Design Language Overview

The app uses a **Chzzk-inspired** dark-first design system: dark canvas (`#141517`) with a neon-green (`#00ffa3`) accent. Light mode inverts to white canvas + brand green (`#036635`). **Both modes must work** — the user can toggle via `ThemeToggle` in the header.

Reference pages already redesigned:
- `src/app/page.tsx` → `src/components/landing/LandingStory.tsx` (landing)
- `src/app/login/page.tsx`, `src/app/signup/page.tsx` (auth)
- Shell: `src/components/auth/AuthShell.tsx`

---

## 2. Token Reference

### 2.1 CSS Custom Properties (`src/app/globals.css`)

```
/* Light mode (:root) */
--c-ink:          #f1f2f4   /* page background */
--c-ink-base:     #ffffff   /* card/surface base */
--c-ink-1:        #fbfcfd   /* elevated surface */
--c-ink-2:        #f0f1f2   /* hover state */
--c-ink-3:        #e3e5e8   /* subtle fill */
--c-ink-line:     #e6e7ea   /* divider */
--c-ink-line-2:   #cfd1d4   /* stronger border */
--c-ink-text:     #0e0f10   /* primary text */
--c-ink-text-2:   #202224   /* body text */
--c-ink-text-3:   #55585e   /* secondary text */
--c-ink-text-weak:#8a8d93   /* placeholder / hint */
--c-neon:         #036635   /* primary accent (brand green in light) */
--c-neon-2:       #024d28   /* accent hover */
--c-neon-3:       #1bb373   /* accent lighter */
--c-on-neon:      #ffffff   /* text on neon bg */

/* Dark mode (.dark) */
--c-ink:          #0e0f10
--c-ink-base:     #141517
--c-ink-1:        #1c1d1f
--c-ink-2:        #202224
--c-ink-3:        #2e3033
--c-ink-line:     #2a2c2f
--c-ink-line-2:   #4d4d4d
--c-ink-text:     #ffffff
--c-ink-text-2:   #dfe2ea
--c-ink-text-3:   #9da5b6
--c-ink-text-weak:#697183
--c-neon:         #00ffa3   /* neon green in dark */
--c-neon-2:       #00e693
--c-neon-3:       #00cc82
--c-on-neon:      #0e0f10
```

### 2.2 Tailwind Color Utilities

These map 1:1 from `@theme inline` in `globals.css`. Use them as `bg-*`, `text-*`, `border-*`:

| Token | Tailwind class |
|---|---|
| ink canvas | `bg-ink` |
| ink base surface | `bg-ink-base` |
| elevated | `bg-ink-1` |
| hover fill | `bg-ink-2` |
| subtle fill | `bg-ink-3` |
| divider | `border-ink-line` |
| strong border | `border-ink-line-2` |
| primary text | `text-ink-text` |
| body text | `text-ink-text-2` |
| secondary text | `text-ink-text-3` |
| placeholder | `text-ink-text-weak` |
| accent | `text-neon` / `bg-neon` |
| accent hover | `bg-neon-2` |
| on-accent text | `text-on-neon` |

**Legacy tokens** (still used in `globals.css` for the app interior — keep them, don't remove):
- `brand` / `brand-deep` / `brand-soft` → `#036635` / `#024d28` / `#e6f0ea`
- `lime` / `lime-bright` / `lime-soft`
- `danger` / `danger-soft`
- `muted`, `line`, `line-strong`, `surface`, `sunken`, `field`
- `foreground` / `background`

The meetings redesign should **replace** the light-only tokens (`bg-white`, `border-line`, `text-muted`, `text-foreground`) with ink-system equivalents so the UI adapts to dark mode. Where the old token had a sensible ink-system equivalent, swap it. Keep `danger` / `brand` for semantic states (error, primary action).

### 2.3 Dark Mode Setup

Dark mode is **class-based**: `html.dark` activates it. The `@custom-variant dark` in Tailwind v4 means you can write `dark:bg-ink-base` etc. The `ThemeToggle` button saves preference to `localStorage.theme`. A FOUC-prevention script in `src/app/layout.tsx` applies the class before paint.

---

## 3. Typography & Font

```
font-family: "IBM Plex Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif
font-size base: 0.9375rem (15px)
line-height: 1.65
```

Heading utilities from `globals.css`:
- `.page-title` → `text-[1.75rem] leading-[1.25] font-bold tracking-[-0.015em]` ← keep using
- `.section-title` → `text-[1.0625rem] font-bold` ← keep using

---

## 4. Component Patterns

### 4.1 Buttons

**Pill button (landing/auth style)** — use on CTAs, primary actions in meetings:
```tsx
// Primary
className="inline-flex min-h-11 items-center justify-center rounded-full bg-neon px-6 text-[0.95rem] font-bold text-on-neon transition-colors hover:bg-neon-2"

// Ghost
className="inline-flex min-h-11 items-center justify-center rounded-full border border-ink-line-2 bg-transparent px-6 text-[0.95rem] font-bold text-ink-text transition-colors hover:bg-ink-2"
```

**Standard button (keep for forms)** — the existing `.btn .btn-primary` / `.btn-secondary` / `.btn-danger` classes in `globals.css` are fine. They already use `brand` color which adapts correctly.

### 4.2 Inputs

**Auth-style input** (from `AuthShell.tsx`):
```tsx
className="h-12 w-full rounded-[10px] border border-ink-line-2 bg-ink-base px-4 text-[0.95rem] text-ink-text placeholder:text-ink-text-weak transition-colors focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/30"
```

Apply this to all `<input>`, `<textarea>`, `<select>` inside the meetings forms instead of the existing `.input` class. The `.input` class uses `bg-field` (white) which breaks in dark mode.

### 4.3 Cards

**Standard info card:**
```tsx
className="rounded-[14px] border border-ink-line bg-ink-1 p-5"
```

**Accent card (neon border):**
```tsx
className="rounded-[16px] border border-neon/30 bg-gradient-to-br from-ink-1 to-ink-2 p-6"
```

**Notice/banner:**
```tsx
// Info
className="rounded-[10px] border-l-2 border-neon/60 bg-ink-2 px-4 py-3 text-sm text-ink-text-2"

// Warning/error
className="rounded-[10px] border-l-2 border-live bg-ink-2 px-4 py-3 text-sm text-ink-text-2"
```

### 4.4 Badges / Chips

**Status badge:**
```tsx
// Default
className="inline-flex items-center rounded-full bg-ink-3 px-3 py-1 text-[0.72rem] font-bold text-ink-text-3"

// Accent (neon)
className="inline-flex items-center rounded-full border border-neon/50 bg-neon/10 px-3 py-1 text-[0.72rem] font-bold text-neon"

// Danger
className="inline-flex items-center rounded-full border border-live/50 bg-live/10 px-3 py-1 text-[0.72rem] font-bold text-live"
```

### 4.5 Section Headers (Kicker + Title)

Reuse the `Kicker` component pattern from `LandingStory.tsx`:
```tsx
// Kicker: small label with neon dot
<span className="inline-flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.08em] text-ink-text-3 uppercase">
  <span aria-hidden className="size-1.5 rounded-full bg-neon" />
  모임 목록
</span>

// Section title
<h2 className="mt-3 text-[1.4rem] leading-tight font-bold tracking-[-0.02em] text-ink-text">
```

### 4.6 List Rows

Replace `.row-link` (white-only hover) with an ink-aware version:
```tsx
className="group relative flex items-center justify-between gap-4 rounded-[12px] border border-ink-line bg-ink-1 p-4 transition-colors hover:border-neon/40 hover:bg-ink-2"
```

Or keep `.row-link` but override the before-element and hover color with Tailwind utilities.

### 4.7 Dividers

```tsx
<div className="border-t border-ink-line" />
```

---

## 5. Layout

### 5.1 App Shell (`(main)/layout.tsx`)

Currently: `max-w-[720px]` centered, `py-10`. Keep the max-width but update the wrapper:

```tsx
// Replace <main className="mx-auto w-full max-w-[720px] px-5 py-10">
<main className="mx-auto w-full max-w-[720px] px-5 py-10 text-ink-text-2">
```

Add `bg-ink-base text-ink-text-2` on the root `<div>` wrapping `AppHeader` + `main`:
```tsx
<div className="min-h-dvh bg-ink-base">
  <AppHeader />
  <main ...>{children}</main>
</div>
```

### 5.2 AppHeader (`src/components/layout/AppHeader.tsx`)

The current header uses `border-b border-line bg-white` — this is light-only. Replace with:

```tsx
<header className="sticky top-0 z-20 border-b border-ink-line bg-ink-base/80 backdrop-blur-md">
  <div className="mx-auto flex w-full max-w-[720px] flex-wrap items-end justify-between gap-x-4 px-5 pt-4">
```

- Replace `<Logo />` with `<BrandMark className="h-6 w-9" />` + `<span className="text-lg font-bold text-ink-text">틈</span>` (same as `SiteHeader`)
- Add `<ThemeToggle />` to the right side nav
- Nav links: active state → `border-neon text-neon`, inactive → `border-transparent text-ink-text-3 hover:text-ink-text`
- Logout button: `text-ink-text-3 hover:text-ink-text`

Imports needed:
```tsx
import BrandMark from "@/components/layout/BrandMark";
import ThemeToggle from "@/components/layout/ThemeToggle";
```

---

## 6. Page-by-Page Targets

### 6.1 `meetings/page.tsx` — Meeting List

**Current:** `.page-title`, `.card`, `.row-link`, `.badge-accent` classes (white-bg).

**Target look:**
- Page bg: inherits `bg-ink-base` from layout
- Section header: `Kicker` + `page-title`
- "새 모임" button: pill primary (neon)
- Empty state: card with `bg-ink-1 border-ink-line rounded-[14px]`
- Meeting rows: `bg-ink-1 border border-ink-line rounded-[12px]` card rows instead of `.row-link`
  - Hover: `hover:border-neon/40 hover:bg-ink-2`
  - Meeting name: `text-ink-text font-bold`
  - Description / meta: `text-ink-text-3 text-sm`
  - "재계산 필요" badge: neon accent badge

### 6.2 `meetings/[meetingId]/page.tsx` — Meeting Detail

This page has sections: header info, CandidateList, MemberList, AddMemberForm, MemoBoard, MeetingActions.

- **Page header:** meeting name in `text-ink-text`, meta info in `text-ink-text-3`, "수정" → ghost pill button
- **Section separators:** `border-t border-ink-line` with section titles using the `section-title` class + `text-ink-text`
- **Status badges:** "재계산 필요" → neon badge

### 6.3 `meetings/new/page.tsx` + `meetings/[meetingId]/edit/page.tsx`

Both render `<MeetingForm>`. Target:
- Form container: `rounded-[16px] border border-ink-line bg-ink-1 p-6`
- All inputs/selects: auth-style input (see §4.2)
- Labels: `text-sm font-bold text-ink-text-2`
- Submit button: pill primary

### 6.4 `components/meeting/CandidateList.tsx`

Large component with multiple states (loading, no candidates, MATCH, VOTE phases).

Key style targets:
- `<Notice>` component → use ink-aware notice card (§4.3)
- Candidate cards → `bg-ink-1 border border-ink-line rounded-[14px] p-5`
- Selected/active candidate → `border-neon/50 bg-neon/5`
- Vote buttons → `.btn .btn-primary` (keep semantic), or pill neon
- "Top 1 추천" label → neon accent badge
- Time text (`formatSlot`) → `font-bold text-ink-text`
- Vote count chips → `bg-ink-3 text-ink-text-3`
- Confirmed schedule → `ConfirmedSchedule` component (style separately)

### 6.5 `components/meeting/MemberList.tsx`

- Member rows: `flex items-center gap-3 py-3 border-b border-ink-line`
- Avatar/initials circle: `bg-ink-3 text-ink-text-2`
- Role badge: "ADMIN" → neon accent, "MEMBER" → `bg-ink-3 text-ink-text-3`
- Transfer button: ghost/small

### 6.6 `components/meeting/AddMemberForm.tsx`

- Input + button inline row
- Input: auth-style
- "추가" button: pill primary (small)

### 6.7 `components/meeting/MemoBoard.tsx`

- Memo list container: `border border-ink-line rounded-[14px] bg-ink-1`
- Each memo: `border-b border-ink-line p-4 last:border-b-0`
- Mine vs others: mine → `bg-neon/5`, others → no fill
- Delete button: small danger ghost
- Input row at bottom: auth-style input + neon submit button

### 6.8 `components/meeting/MeetingActions.tsx`

- Danger zone section: `rounded-[14px] border border-live/30 bg-live/5 p-5`
- Leave/delete buttons: `.btn .btn-danger`

### 6.9 `me/page.tsx` and `me/timetable/page.tsx`

- Same card/input patterns as above
- Timetable grid: already has green slot colors — keep the slot colors, just update the surrounding chrome (header, labels, background) to ink tokens

---

## 7. Existing Global CSS Classes to Keep

These are defined in `globals.css` and are fine — keep using them, just ensure they render correctly with dark backgrounds by auditing any hardcoded `bg-white` or `text-foreground` that doesn't adapt:

| Class | Use |
|---|---|
| `.page-title` | Page `<h1>` |
| `.section-title` | `<h2>` sections |
| `.btn .btn-primary` | Standard form submit |
| `.btn .btn-secondary` | Secondary actions |
| `.btn .btn-danger` | Destructive actions |
| `.btn-sm` | Compact buttons |
| `.chip` | Toggle chips |
| `.badge .badge-brand .badge-accent` | Status labels |
| `.notice .notice-danger` | Info/warning banners |
| `.field-label .field-hint` | Form labels |
| `.input` | *Use sparingly — has bg-white* |

**`globals.css` changes needed:** `.input` uses `bg-field` (`#ffffff`) and doesn't adapt to dark mode. Either:
1. Add a `.dark .input` override in `globals.css`: `bg-ink-1 border-ink-line-2 text-ink-text placeholder:text-ink-text-weak focus:border-neon`
2. Or replace `.input` with the auth-style inline classes in all meeting forms.

Option 1 is cleaner — do it in `globals.css` as a one-time fix.

---

## 8. Animations

Reuse from `globals.css`:
- `hero-slot` / `hero-gap` → slot fill animations (timetable)
- `gap-reveal` → fade-in for content panels (e.g., selected candidate detail)

Reveal on scroll (from `LandingStory.tsx`):
```tsx
// IntersectionObserver-based reveal (copy the Reveal component)
const [shown, setShown] = useState(false);
// className={`transition-all duration-700 ease-out ${shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
```
Use this for meeting cards on the list page.

---

## 9. File Structure (Do Not Change)

```
src/
  app/
    (main)/
      layout.tsx             ← update shell bg + AppHeader
      meetings/
        page.tsx             ← meeting list
        new/page.tsx         ← new meeting form
        [meetingId]/
          page.tsx           ← meeting detail
          edit/page.tsx      ← edit meeting form
      me/
        page.tsx             ← profile
        timetable/page.tsx   ← timetable editor
  components/
    layout/
      AppHeader.tsx          ← update to SiteHeader style
      BrandMark.tsx          ← already done, just import it
      ThemeToggle.tsx        ← already done, just import it
      SiteHeader.tsx         ← reference only, don't modify
    meeting/
      AddMemberForm.tsx
      CandidateList.tsx
      ConfirmedSchedule.tsx
      MeetingActions.tsx
      MeetingForm.tsx
      MemberList.tsx
      MemoBoard.tsx
    auth/
      AuthShell.tsx          ← reference only, don't modify
```

---

## 10. Quick Checklist Before Opening PR

- [ ] `html.dark` class toggles the entire app correctly (test both modes)
- [ ] No hardcoded `bg-white` / `text-black` / `text-gray-*` remaining in modified files
- [ ] `ThemeToggle` visible and functional in `AppHeader`
- [ ] `BrandMark` SVG logo replaces old `Logo` in `AppHeader`
- [ ] TypeScript: `npx tsc --noEmit` returns 0 errors
- [ ] All meeting CRUD flows work (create, read, vote, confirm, delete)
- [ ] PR targets `dev` branch, closes #31

---

## 11. Key Imports

```tsx
// Design tokens are purely CSS — no JS import needed.
// Just use Tailwind utility classes.

// Logo
import BrandMark from "@/components/layout/BrandMark";
// Theme toggle
import ThemeToggle from "@/components/layout/ThemeToggle";
// Auth-style input class string (copy inline or import from AuthShell)
import { authInput, authLabel, authBtnPrimary } from "@/components/auth/AuthShell";
```

---

*End of handoff. Branch: `style/meetings-ink-neon`, base: `dev`. Questions → issue #31.*
