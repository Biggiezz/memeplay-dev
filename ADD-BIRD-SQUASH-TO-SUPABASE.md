# 🐦 Add Bird Squash Clone to Supabase

## ✅ SQL Command:

```sql
INSERT INTO games (id, title, token_address)
VALUES (
  'bird-squash-clone',
  'Bird Squash Clone',
  NULL
)
ON CONFLICT (id) DO NOTHING;
```

## 📝 Or via Table Editor:

1. Go to Supabase → Table Editor → `games`
2. Click **"Insert row"**
3. Fill in:
   - `id`: `bird-squash-clone`
   - `title`: `Bird Squash Clone`
   - `token_address`: (leave NULL)
4. Click **Save**

---

## ✅ After adding, test:

1. Like button (heart icon)
2. Comment button
3. Plays count (after 5s)
4. Rewards (10s/60s/300s)

**Game will be playable after Cloudflare deploys (~2-3 min)!** 🚀

