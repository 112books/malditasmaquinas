# CLAUDE.md — malditasmaquinas.com

Instruccions per a Claude Code. Llegeix aquest fitxer abans de qualsevol acció al projecte.

---

## Què és aquest projecte

Web de consultoria tecnològica a demanda per a artistes, autònoms i petites empreses. Fusiona les marques MalditasMaquinas.com i MacBCN.com, ambdues subprojectes de LinuxBCN.com.

Model de negoci: el client compra paquets d'hores prepagades i envia consultes tècniques a través del web.

---

## Stack tècnic

| Capa | Tecnologia |
|---|---|
| Generador estàtic | Hugo |
| Hosting / CDN | Cloudflare Pages (gratis) |
| API / lògica backend | Cloudflare Workers (gratis fins 100k req/dia) |
| Base de dades | Cloudflare D1 (SQLite, gratis fins 5 GB) |
| Sessions / cache | Cloudflare KV (gratis fins 100k lectures/dia) |
| Fitxers / adjunts | Cloudflare R2 (gratis fins 10 GB) |
| Autenticació àrea privada | Cloudflare Access + JWT |
| Pagaments | Stripe Checkout + webhooks |
| Email transaccional | Resend (gratis fins 3.000 emails/mes) |
| Notificacions | Telegram Bot API (via Worker) |
| Repositori | GitHub (privat) |

**Cost actual: 0 €/mes.** Quan creixi i superi els free tiers, Cloudflare cobra ~5 $/mes.

---

## Estructura de branques

```
main    → producció (malditasmaquinas.com, Cloudflare Pages)
dev     → preview (URL automàtica de Cloudflare Pages per branch)
local   → desenvolupament (localhost:1313, hugo serve)
```

**Regla**: mai fer push directe a `main` sense haver provat a `dev` primer.

El CI/CD és automàtic: Cloudflare Pages fa el build de Hugo en cada push.

---

## Estructura del repositori

```
malditasmaquinas.com/
├── CLAUDE.md                  ← aquest fitxer
├── hugo.toml                  ← configuració Hugo
├── .github/
│   └── workflows/             ← GitHub Actions (opcional, CF Pages ja fa CI)
├── content/
│   ├── ca/                    ← continguts en català (idioma principal)
│   │   ├── _index.md
│   │   ├── serveis/
│   │   ├── com-funciona/
│   │   └── paquets/
│   └── es/                    ← continguts en castellà (idioma secundari)
│       ├── _index.md
│       ├── servicios/
│       ├── como-funciona/
│       └── paquetes/
├── layouts/
│   ├── _default/
│   ├── partials/
│   └── shortcodes/
├── static/
│   ├── img/
│   ├── svg/                   ← logotip i il·lustracions SVG
│   └── fonts/
├── assets/
│   ├── css/
│   └── js/
├── i18n/
│   ├── ca.toml
│   └── es.toml
├── workers/                   ← Cloudflare Workers (API backend)
│   ├── api/
│   │   ├── auth.js
│   │   ├── consultations.js
│   │   ├── hours.js
│   │   └── stripe-webhook.js
│   └── wrangler.toml          ← configuració Workers + D1 + KV + R2
└── public/                    ← output de Hugo (ignorat al .gitignore)
```

---

## Convencions

### Idioma

- Català és l'idioma per defecte (`defaultContentLanguage = "ca"`)
- Castellà és el segon idioma
- Els fitxers de contingut porten el codi d'idioma al path: `content/ca/`, `content/es/`
- Les cadenes d'interfície van als fitxers `i18n/ca.toml` i `i18n/es.toml`

### Fitxers de contingut

- Format: Markdown amb front matter TOML (`+++`)
- Noms de fitxer: minúscules, paraules separades per guió, sense accents ni caràcters especials
  - Correcte: `com-funciona.md`, `paquets-hores.md`
  - Incorrecte: `ComFunciona.md`, `paquets_hores.md`

### CSS i JS

- CSS: un sol fitxer compilat per Hugo Pipes, sense frameworks externs llevat que sigui estrictament necessari
- JS: mínim imprescindible; JS de l'àrea privada consumeix l'API de Workers
- Cap dependència de jQuery

### Commits

- Missatges en català, en minúscules, imperatiu present
  - Correcte: `afegeix pàgina de paquets en castellà`
  - Incorrecte: `Added packages page`, `Afegida pàgina`

### Estil visual

- Estètica fosca: negre/antracita de base, accent taronja o verd fosfòric
- Mòbil primer: tots els layouts es dissenyen primer per a pantalla petita

### Tipografia

| Rol | Font | Llicència | Origen |
|---|---|---|---|
| Títols i display | **Galindo** | SIL OFL — lliure comercial | Google Fonts |
| Cos de text | a decidir (sans-serif legible) | — | — |
| Codi / terminal | monospace del sistema | — | — |

**Regla**: Galindo només per a titulars i elements de display. Mai per a cos de text ni interfície.

---

## Àrea privada (Workers + D1)

L'àrea privada és una SPA lleugera en JS vanilla o Alpine.js que consumeix l'API de Workers.

- Les pàgines de l'àrea privada viuen a `static/app/` com a pàgines Hugo buides que carreguen el JS
- L'autenticació usa JWT gestionat per Cloudflare Access o per Workers (cookie HttpOnly)
- El panell d'admin és una ruta protegida per rol (`role: admin`) a la taula `profiles` de D1
- Les variables d'entorn (secrets Stripe, token Telegram, etc.) van als secrets de Workers (`wrangler secret put`)

---

## Deploy

### Local

```bash
hugo serve -D
# Disponible a http://localhost:1313
```

### Workers en local

```bash
cd workers
npx wrangler dev
# API disponible a http://localhost:8787
```

### Staging / preview

```bash
git push origin dev
# Cloudflare Pages fa el build automàticament i publica a una URL de preview
```

### Producció

```bash
git push origin main
# Cloudflare Pages fa el build i publica a malditasmaquinas.com
```

No cal script de deploy manual. Tot és CI/CD via Cloudflare Pages.

---

## D1 — taules principals

```sql
profiles        -- dades personals i fiscals de l'usuari
hour_packages   -- definició dels paquets (nom, hores, preu, caducitat en dies)
purchases       -- compres (user_id, package_id, stripe_session_id, expires_at, status)
hour_balance    -- vista calculada: hores disponibles per usuari
consultations   -- consultes enviades (user_id, pregunta, adjunts_r2_keys, hores_descomptades, estat)
responses       -- respostes del consultor (consultation_id, text, created_at)
```

Les migracions de D1 viuen a `workers/migrations/`.

---

## Stripe — productes

Un producte per paquet. Els IDs de preu de Stripe van com a secrets de Workers (`wrangler secret put STRIPE_PRICE_BASIC`, etc.) i també a `hugo.toml` com a params públics per als CTAs del frontend.

El webhook de Stripe apunta a `https://malditasmaquinas.com/api/stripe-webhook` (Worker) que:

1. Verifica la signatura (`STRIPE_WEBHOOK_SECRET`)
2. Actualitza `purchases` amb estat `paid`
3. Recalcula `hour_balance`
4. Envia notificació per email (Resend) + Telegram

---

## Telegram

El bot s'activa des del Worker del webhook de Stripe. El token i el `chat_id` del consultor van com a secrets de Workers, mai al codi.

---

## Fitxers que no s'han de tocar mai directament

- `public/` — generat per Hugo, ignorat al `.gitignore`
- `resources/` — caché de Hugo Pipes, ignorat al `.gitignore`

---

## To i veu del projecte

Directe, proper, opinionat. Gurú hacker Linux programari lliure.

- Res de corbata ni tecnicisme repel·lent
- Res de "estimat client" ni fórmules corporatives
- Res de majúscules en títols: sempre minúscula inicial (estil Obsidian/LinuxBCN)
- Els textos de la interfície van sempre en català per defecte
