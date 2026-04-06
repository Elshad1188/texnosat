

## Plan: Identity Switcher for Listings and Messages

### Summary
Allow users who own approved stores to choose whether to act as their personal account or as one of their stores when creating listings and sending messages. A compact identity selector will appear in both the listing creation form and the messaging input area.

### Current State
- **Listings**: Already have a `store_id` field and auto-select the first approved store. But there's no explicit "personal vs store" toggle — if a user has a store, it's always associated.
- **Messages**: `sender_id` is always the user's auth ID. The conversation model uses `buyer_id`/`seller_id` (user IDs). Store identity is inferred from listing ownership on the receiving end, not from the sender's choice.

### Database Changes

**Add `sender_store_id` column to `messages` table:**
- `sender_store_id UUID nullable default null` — when set, the message was sent on behalf of this store
- Update the messages RLS policies to allow reading this new column (no policy change needed, existing policies cover it)

### Frontend Changes

#### 1. Create `IdentitySwitcher` Component
A small reusable component that shows:
- Current identity (avatar + name)
- Dropdown to switch between "Personal" and each approved store
- Used in both CreateListing and Messages pages

```text
┌──────────────────────────┐
│ [Avatar] Şəxsi hesab  ▼  │
│ ────────────────────────  │
│ [Logo] Mağaza adı 1      │
│ [Logo] Mağaza adı 2      │
└──────────────────────────┘
```

#### 2. Update `CreateListing.tsx`
- Replace current auto-store-selection logic with the IdentitySwitcher
- When "Personal" is selected, `store_id` is set to `null`
- When a store is selected, `store_id` is set to that store's ID
- Show the switcher at the top of the form

#### 3. Update `Messages.tsx`
- Add IdentitySwitcher to the message input area (above or beside the input)
- When sending a message, include `sender_store_id` in the insert if a store is selected
- In message display, show store name/logo for messages that have `sender_store_id`
- In conversation list, show which identity the user last used

#### 4. Update Message Display Logic
- When rendering a message bubble, if `sender_store_id` is present and it's from the current user, show the store logo/name instead of the personal avatar
- The recipient sees the store identity of the sender

### Technical Details

- The `IdentitySwitcher` fetches user's approved stores via `useQuery` on `stores` table filtered by `user_id` and `status = 'approved'`
- State is managed locally (per-page) — no global context needed
- Migration: single ALTER TABLE to add `sender_store_id` to messages
- The `conversations` table structure remains unchanged — conversations still link user IDs, but individual messages carry the identity context

### File Changes
1. **New migration** — add `sender_store_id` to `messages`
2. **New component** — `src/components/IdentitySwitcher.tsx`
3. **Edit** `src/pages/CreateListing.tsx` — integrate switcher, remove auto-select logic
4. **Edit** `src/pages/Messages.tsx` — integrate switcher in input, update bubble rendering

