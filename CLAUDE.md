# CLAUDE.md — malditasmaquinas.com

Instruccions per a Claude Code. Llegeix aquest fitxer abans de qualsevol acció al projecte.

---

## Què és aquest projecte

Web de consultoria tecnològica a demanda per a artistes, autònoms i petites empreses. Fusiona les marques MalditasMaquinas.com i MacBCN.com, ambdues subprojectes de LinuxBCN.com.

Model de negoci: el client compra paquets d'hores prepagades i envia consultes tècniques a través del web. **Sense hores contractades no s'atenen consultes tècniques.**

Fundat el 22/10/2003. Més de 20 anys d'experiència.

---

## Stack tècnic

| Capa | Tecnologia |
|---|---|
| Generador estàtic | Hugo 0.159+ |
| Hosting / CDN | GitHub Pages (actual) → Cloudflare Pages (futur) |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) |
| API / lògica backend | Cloudflare Workers |
| Base de dades | Cloudflare D1 (SQLite) |
| Sessions / cache | Cloudflare KV |
| Fitxers / adjunts | Cloudflare R2 |
| Autenticació | JWT via Workers (cookie HttpOnly) |
| Pagaments | Stripe Checkout + webhooks |
| Email transaccional | Resend |
| Notificacions | Telegram Bot API (via Worker) |
| Repositori | GitHub públic (112books/malditasmaquinas) |

**Cost actual: 0 €/mes.**

---

## Estructura de branques

```
main    → producció (GitHub Pages → malditasmaquinas.com)
dev     → staging / preview
local   → desenvolupament (localhost:1313, hugo serve)
```

**Regla**: mai fer push directe a `main` sense haver provat abans.

---

## Estructura del repositori

```
malditasmaquinas/
├── CLAUDE.md
├── README.md
├── hugo.toml
├── hugo_stats.json
├── sync-malditas.sh            ← script de sincronització local → repo
├── .github/
│   └── workflows/
│       └── deploy.yml          ← Hugo build → GitHub Pages
├── archetypes/
│   └── default.md
├── content/
│   ├── ca/                     ← català (idioma principal)
│   │   ├── _index.md
│   │   ├── serveis/
│   │   ├── com-funciona/
│   │   ├── paquets/
│   │   ├── contacte/
│   │   ├── avis-legal/
│   │   ├── privacitat/
│   │   └── condicions/
│   └── es/                     ← castellà (idioma secundari, parcialment creat)
│       ├── _index.md
│       ├── servicios/
│       ├── como-funciona/
│       └── paquetes/
├── layouts/
│   ├── _default/
│   │   ├── baseof.html
│   │   ├── list.html
│   │   ├── legal.html
│   │   └── contacte.html
│   ├── home.html
│   ├── shortcodes/
│   └── partials/
│       ├── basehead.html
│       ├── nav.html
│       └── footer.html
├── static/
│   ├── .htaccess
│   ├── img/
│   │   ├── logo/
│   │   │   └── mm_03.gif           ← logotip actual (provisional)
│   │   ├── dimoni-roig.png
│   │   └── dimoni-roig-banyes-blanques.png
│   ├── svg/
│   ├── fonts/
│   └── app/
│       └── index.html              ← àrea privada (SPA, sense backend encara)
├── assets/
│   ├── css/
│   │   └── main.css
│   └── js/
├── i18n/
│   ├── ca.toml
│   └── es.toml
├── workers/
│   ├── api/
│   │   └── index.js
│   ├── migrations/
│   │   └── 0001_init.sql
│   └── wrangler.toml
└── public/                         ← generat per Hugo, ignorat al .gitignore
```

---

## Convencions

### Idioma i textos

- Català és l'idioma per defecte (`defaultContentLanguage = "ca"`)
- Castellà és el segon idioma (`/es/`)
- Tota nova pàgina cal crear-la en els dos idiomes
- Les cadenes d'interfície van a `i18n/ca.toml` i `i18n/es.toml`
- **Majúscula inicial** als paràgrafs i títols de contingut
- **Minúscula** als elements d'interfície (botons, etiquetes, navegació, tags)
- Noms de fitxer: minúscules, guió, sense accents: `com-funciona.md`, `avis-legal/`

### Programari i ètica tecnològica

- **Prioritzar sempre programari lliure**: Inkscape, GIMP, Darktable, Kdenlive, Ardour, Affinity, etc.
- **No recomanar Adobe** ni altres imperis de subscripció tancada
- **No recomanar WordPress** com a destí — sí com a origen de migracions
- Drupal i WordPress: suport de migració cap a solucions estàtiques (Hugo), no cap a nous projectes
- Missatge de marca: sites estàtics cobreixen el 99% de necessitats; és més ètic, econòmic i sostenible
- Solucions de pagament: justificar molt bé; preferir alternatives lliures quan existeixin

### Estil visual i disseny

- **Estètica**: negre/antracita de base, accent taronja rovell (`#e04d10`)
- **Filosofia**: asimetria controlada estil Monk — mides contrastades, res de simetria perfecta
- **Mòbil primer**: dissenyar sempre des de pantalla petita cap a gran
- **Cap majúscules forçades** als títols grans — Galindo ja té prou presència
- **Botons i etiquetes**: minúscula

### Tipografia

| Rol | Font | Origen |
|---|---|---|
| Títols i display | **Galindo** | Google Fonts (SIL OFL) |
| Cos de text | **Bitter** | Google Fonts (SIL OFL) |
| Interfície / codi | **IBM Plex Mono** | Google Fonts (SIL OFL) |

- Galindo: **només** per a titulars i elements de display. Mai cos de text ni interfície
- IBM Plex Mono: etiquetes, botons, nav, tags, dades
- Bitter: cos de text, subtítols, descripcions

### Colors CSS (variables)

```css
--bg:     #0d0c0b   /* fons principal */
--bg2:    #181714   /* fons secundari / hover */
--line:   #1e1c1a   /* línies divisòries */
--cream:  #e2ddd6   /* text principal */
--cream2: #9a958e   /* text secundari */
--cream3: #7a7570   /* text terciari / UI gran — #7a7570 sobre bg = ~4.8:1 WCAG AA */
--rust:   #bf3d08   /* accent fosc */
--rust2:  #e04d10   /* accent principal */
--rust3:  #ff6425   /* accent hover */
```

**Contrast WCAG AA**: cream2 sobre bg = ~7.2:1 ✓ · rust2 sobre bg = ~4.6:1 ✓

### Accessibilitat (obligatori)

- Tot el HTML ha de passar validació W3C
- Tots els `<img>` han de tenir `alt` descriptiu
- Totes les icones SVG del nav: `aria-hidden="true"` + `aria-label` al `<a>`
- SVG decoratius: `aria-hidden="true" focusable="false"`
- `<main id="main-content">` + skip link `.skip-link` visible al focus
- `<nav aria-label="...">` per a cada nav
- `<ul role="list">` quan la llista té rol semàntic
- `lang` correcte a l'element `<html>` i als links de canvi d'idioma
- `:focus-visible` amb outline visible (2px solid var(--rust2))
- `@media (prefers-reduced-motion: reduce)` per desactivar animacions

### Animacions

- **Logo al hero**: lletres individuals amb `transform: rotate()` lleuger i aleatori (estil Monk)
- **Scroll shrink**: quan el hero desapareix del viewport, el títol gran fa fade out i MalditasMaquinas apareix al nav amb animació `translateY`
- **Hover icones nav**: `translateY(-3px) rotate(-8deg)` suau
- Totes les animacions respecten `prefers-reduced-motion`

### Commits

- En català, minúscules, imperatiu present
- Correcte: `afegeix pàgina de contacte en castellà`
- Incorrecte: `Added contact page`

---

## Paquets d'hores

| Paquet | Hores | Preu | Caducitat |
|--------|-------|------|-----------|
| mínim | 0.5h | 35 € + IVA | 1 mes |
| bàsic | 1h | 60 € + IVA | 3 mesos |
| mitjà | 3h | 165 € + IVA | 5 mesos |
| estàndard | 5h | 260 € + IVA | 7 mesos |
| pro | 10h | 500 € + IVA | 10 mesos |
| avançat | 20h | 900 € + IVA | 12 mesos |

- Mínim per consulta: **0.25h** descomptades automàticament
- Retorn parcial d'hores no usades en caducar, sense comissions
- Sense hores: no s'atén consulta tècnica (sí informació general)

---

## Serveis (ordre de prioritat)

1. Consultoria tecnològica (servei estrella)
2. Programari a mida
3. Eines creatives (programari lliure primer)
4. Webs i servidors
5. Allibera't del WordPress
6. Seguretat
7. Gestió de correu electrònic
8. Mac i Linux

---

## Àrea privada (`/app/`)

SPA en HTML/JS vanilla a `static/app/index.html`. Sense framework.

- Autenticació: magic link → JWT (localStorage `mm_jwt`), 30 dies, HS256
- Panell client: saldo d'hores, historial de consultes, nova consulta, compra paquets
- Panell admin: gestió d'usuaris (validar/bloquejar), totes les consultes, respondre
- Backend desplegat a Cloudflare Workers. Stripe webhook pendent de configurar.

---

## D1 — taules principals

```sql
profiles        -- dades personals i fiscals
hour_packages   -- catàleg de paquets
purchases       -- compres (stripe_session_id, expires_at, status)
hour_balance    -- vista: hores disponibles per usuari
consultations   -- consultes (adjunts_r2_keys JSON, hores_descomptades, estat)
responses       -- respostes del consultor
```

Migracions: `workers/migrations/`

---

## Stripe

- Un producte per paquet
- Webhook → `https://malditasmaquinas.com/api/stripe-webhook` (Worker)
- Worker: verifica signatura → actualitza `purchases` → recalcula `hour_balance` → notifica (Resend + Telegram)
- IDs de preu: secrets de Workers (`wrangler secret put`) + `hugo.toml` params per als CTAs

---

## Secrets (mai al codi, mai al repo)

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
JWT_SECRET
RESEND_API_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

Gestió: `wrangler secret put NOM`

---

## Fitxers que no s'han de tocar mai

- `public/` — generat per Hugo
- `resources/` — caché de Hugo Pipes

---

## Historial de tasques fetes

### 2026-04-17 (sessió 2)

**Emails amb marca i RGPD**
- Nou `workers/api/email.js`: template HTML compartit per a tots els correus
  - `emailHtml()` per a clients: logo dimoni, capçalera de marca, peu RGPD (responsable, NIF, drets, link privacitat)
  - `emailAdminHtml()` per a notificacions internes: sense peu RGPD, marca "Admin"
  - `sendEmail()` helper centralitzat que crida Resend
- Tots els correus existents migrats al nou template: nova consulta (admin), resposta (client), pagament (admin + client)

**Adjunts a consultes (R2)**
- Nou `workers/api/upload.js`: `POST /api/upload` puja un fitxer a R2 (màx 10 MB, 5 fitxers, tipus validats)
  - `GET /api/files/:key` serveix el fitxer autenticat (client veu els seus, admin veu tots)
  - Key format: `{userId}/{uuid}.{ext}`
- `workers/wrangler.toml`: R2 bucket `malditasmaquinas-files` activat (cal crear: `wrangler r2 bucket create malditasmaquinas-files`)
- `workers/api/consultations.js`: crea consulta amb `adjunts` (JSON array a `adjunts_r2_keys`), lista adjunts a l'email admin
- `static/app/index.html`: formulari amb `<input type="file">` (previsualització, upload seqüencial amb progrés, errors inline), detall consulta mostra adjunts com a botons de descàrrega (`downloadFile()` via fetch+blob)

**Seguretat, accessibilitat i estàndards web**
- `basehead.html`: `<link rel="canonical">`, Open Graph complet, `twitter:card`, JSON-LD `LocalBusiness`, GoatCounter `https://` (era `//`), `hreflang` ca/es/x-default, `theme-color`, `rel="author"` → humans.txt
- `static/humans.txt`: creat (format humanstxt.org)
- `content/ca/privacitat/` i `content/es/privacidad/`: nova secció "Transparència tècnica" amb taula d'estàndards complerts
- `layouts/robots.txt`: personalitzat (oculta /app/ i /stats/, apunta al sitemap)
- `static/_headers`: headers Cloudflare Pages (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- `static/.htaccess`: expandit per a servidors Apache (comprensió, cache, headers)
- `assets/css/main.css`: `cream3` puja de `#5a5650` → `#7a7570` (contrast 3.1:1 → 4.8:1, passa WCAG AA)
- Footer: col dreta ("Powered by LinuxBCN") amb estètica aside-box (bg2 + vora taronja), línia d'estàndards (humans.txt · HTML5 · WCAG AA · RGPD · sense cookies)
- `hugo.toml`: eliminats Stripe links `test_*` obsolets (els links reals estan a `static/app/index.html`)

**Deploy Worker — pendent fer manualment**
- `cd workers && wrangler r2 bucket create malditasmaquinas-files && wrangler deploy`

### 2026-04-17 (sessió 1)

**Nav / header**
- `<nav>` mogut dins de `<header class="site-header">`. El sticky ara va al `<header>`, no al `<nav>` — és l'únic fix que funciona quan el pare té la mateixa alçada que el fill
- Brand nav: dimoni 42px, text 1.05rem (era 30px / 0.78rem)
- Mòbil (≤600px): dues files — fila 1: dimoni + MalditasMaquinas (ample complet); fila 2: icones nav (esquerra) + idioma + candau (dreta). Text "accés" amagat en mòbil, només la icona
- Mateixos canvis aplicats a `static/stats/index.html` (nav independent)

**GoatCounter estadístiques (`/stats/`)**
- Afegit `<script data-goatcounter>` a `layouts/partials/basehead.html`
- Nou `workers/api/stats.js`: proxy server-side que protegeix el `GOATCOUNTER_TOKEN`
- Nou `static/stats/index.html`: dashboard complet (navegadors, SO, països, mides pantalla, pàgines)
- Secret `GOATCOUNTER_TOKEN` configurat al Worker
- **Bug fix**: GoatCounter API v0 no accepta `period=week`, necessita `start=YYYY-MM-DD&end=YYYY-MM-DD`. Afegida funció `periodToRange()` al Worker
- Estructura de resposta GoatCounter: `/stats/{page}` retorna `{stats: [...]}` (no `{browsers: [...]}` etc.); `/stats/hits` retorna `{hits: [{path, count, max, event, stats}]}` sense `count_unique` per pàgina; totals via `/stats/total` → `{total: N, total_events: N}`
- Mètriques disponibles al proxy: `total | hits | browsers | systems | sizes | locations`

**Stripe (sessió anterior, 2026-04-17)**
- Webhook fix: canviat de mapeig per `price_id` (no disponible al payload) a `amount_subtotal`
- Preus IVA inclòs (21%): 4235, 7260, 19965, 31460, 60500, 108900 centaus
- 6 nous Payment Links de Stripe en mode live amb IVA inclòs als preus
- Notificació per email a admin en cada pagament (Resend)
- Notificació per email a admin en cada nova consulta (Resend)
- Migració D1 `0003_fix_hour_balance_view.sql` aplicada remotament: `p.id AS user_id` + `GROUP BY p.id` (la vista referencava `p.user_id` inexistent)
- Protecció staging (`password-gate.html`) eliminada de `baseof.html` — ja en producció
- Dominis DNS configurats a Dinahosting: A → GitHub Pages, CNAME www, MX Dinahosting, SPF/DKIM/DMARC per Resend

### 2026-04-14
- Protecció staging amb password (SHA-256 client-side, sessionStorage). Contrasenya: Linux2026
- Logo animat hero: corregit a `dimoni-roig-banyes-blanques.png` amb `relURL`
- Links de paquets i footer corregits amb `relURL` / `relLangURL` per funcionar a GitHub Pages (subpath `/malditasmaquinas/`)
- Backend complet desplegat a Cloudflare Workers (`malditasmaquinas-api.hola-78f.workers.dev`):
  - `auth.js`: registre, magic link, verify JWT, me
  - `hours.js`: balanç i historial de compres
  - `consultations.js`: llista, crear, detall, respondre, tancar
  - `admin.js`: usuaris, validar, bloquejar
  - `stripe-webhook.js`: verifica signatura, crea purchase, notifica
- D1 (`malditasmaquinas-db`) creat i migrat (0001 + 0002): taules profiles, hour_packages, purchases, consultations, responses, magic_tokens
- Secrets del Worker configurats: JWT_SECRET, RESEND_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, BASE_URL
- SPA `/app/index.html` completa: login, registre, panell client, panell admin, consultes, compra paquets
- Corregit error "carregant_" afegint try-catch a `boot()`, `showClient()`, `showAdmin()` i `boot().catch()`
- Avís legal actualitzat: NIF 38121766W, Nau Bostik — Carrer Ferran Turné 1-11, 08027 Barcelona

---

## Pendent / deute tècnic

- **Deploy Worker pendent** — cal fer `wrangler r2 bucket create malditasmaquinas-files && wrangler deploy` des de `workers/`
- **Telegram** — les notificacions no semblen arribar; revisar `TELEGRAM_BOT_TOKEN` i `TELEGRAM_CHAT_ID` als secrets del Worker (Cloudflare → Workers → malditasmaquinas-api → Settings → Variables)
- **Estadístiques** — `/stats/` desplegada però pendent de verificar que les dades carreguen (GoatCounter necessita visites reals acumulades)
- **Stripe confirmation page** — la pàgina post-pagament és en anglès; cal configurar URL de redirecció als Payment Links
- **Stripe Tax** — ajornat; IVA inclòs als preus com a solució provisional
- **Secrets incorrectes al Worker** — verificar que els secrets amb noms incorrectes s'han esborrat
- **Pàgines legals en castellà** — manquen `content/es/condiciones/`, `privacidad/`, `aviso-legal/`, `contacto/`
- `layouts/_default/single.html` — no creat; pàgines individuals van per `list.html` o layouts específics

---

## To i veu del projecte

Directe, proper, opinionat. Gurú hacker Linux programari lliure.

- Res de corbata ni tecnicisme repel·lent
- Res de "estimat client" ni fórmules corporatives
- Primera lletra en majúscula als textos de contingut
- Minúscula als elements d'interfície (botons, nav, etiquetes)
- Contacte per a consultes tècniques: hola@malditasmaquinas.com (només amb hores contractades)