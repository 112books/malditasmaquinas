# malditasmaquinas.com

Web de consultoria tecnològica a demanda. [LinuxBCN.com](https://linuxbcn.com) · [MalditasMaquinas.com](https://malditasmaquinas.com)

---

## Requisits

- [Hugo](https://gohugo.io/) >= 0.120
- [Node.js](https://nodejs.org/) >= 18 (per a Wrangler)
- Compte [Cloudflare](https://cloudflare.com) (gratis)
- Compte [Stripe](https://stripe.com) (gratis, comissió per transacció)

## Inici ràpid

```bash
# 1. Clona el repo
git clone git@github.com:112books/malditasmaquinas.com.git
cd malditasmaquinas.com

# 2. Desenvolupa en local
hugo serve -D

# 3. Workers en local (necessita wrangler login primer)
cd workers
npm install
npx wrangler dev
```

## Branques

| Branca | Entorn | URL |
|--------|--------|-----|
| `local` | localhost | http://localhost:1313 |
| `dev` | Cloudflare Pages preview | URL automàtica per branch |
| `main` | Producció | https://malditasmaquinas.com |

## Deploy

El deploy és automàtic via Cloudflare Pages en cada push a `dev` i `main`.

Per als Workers:
```bash
cd workers
npx wrangler deploy
```

## Primers passos després de clonar

1. Crea la D1 database: `wrangler d1 create malditasmaquinas-db`
2. Copia l'ID al `workers/wrangler.toml`
3. Executa la migració: `wrangler d1 execute malditasmaquinas-db --file=migrations/0001_init.sql`
4. Crea el KV namespace: `wrangler kv namespace create KV`
5. Copia l'ID al `workers/wrangler.toml`
6. Crea el bucket R2: `wrangler r2 bucket create malditasmaquinas-files`
7. Configura els secrets: `wrangler secret put JWT_SECRET` (i la resta)
8. Connecta el repo a Cloudflare Pages (build command: `hugo`, output: `public`)

Veure `CLAUDE.md` per a totes les convencions del projecte.
