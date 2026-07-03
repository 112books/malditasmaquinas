# Pla de visibilitat — MalditasMaquinas.com

> Document de treball. Ves marcant les tasques amb `[x]` a mesura que les facis.
> Última revisió: juliol 2026

---

## Com usar aquest document

Les tasques estan ordenades per impacte/esforç. Fes-les en ordre si pots, però qualsevol millora ja suma. Les marcades amb ⚡ són les de major impacte ràpid.

---

## 1. SEO tècnic (fonaments)

### 1.1 Google Search Console ⚡
- [x] Crea compte a [search.google.com/search-console](https://search.google.com/search-console)
- [x] Afegeix propietat `malditasmaquinas.com`
- [ ] Verifica el domini (millor via DNS TXT a Dinahosting)
- [x] Envia el sitemap: `https://malditasmaquinas.com/sitemap.xml`
- [x] Espera 2-3 dies i revisa quines URLs ha indexat Google

### 1.2 Indexació
- [x] Comprova que `https://malditasmaquinas.com` carrega correctament (no redirigeix a `/malditasmaquinas/`)
- [X] Comprova que `robots.txt` és accessible: `https://malditasmaquinas.com/robots.txt`
- [x] Comprova que el sitemap existeix: `https://malditasmaquinas.com/sitemap.xml`
- [x] A Search Console, fes "Inspecció d'URL" per a cada pàgina principal i demana indexació si cal

### 1.3 Velocitat i Core Web Vitals
- [ ] Passa el web per [PageSpeed Insights](https://pagespeed.web.dev) (URL: `malditasmaquinas.com`)
- [ ] Apunta els valors LCP, CLS i FID/INP
- [ ] Si LCP > 2.5s: revisa si les fonts de Google es carreguen localment o en diferit
- [ ] Comprova que les imatges (dimoni, logo) tenen mida correcta i atribut `loading="lazy"` on toca

### 1.4 Schema.org (ja implementat, cal verificar)
- [ ] Valida el JSON-LD a [validator.schema.org](https://validator.schema.org) amb la URL del web
- [ ] Comprova que apareix `LocalBusiness` amb adreça, telèfon i horari correctes

---

## 2. Presència local — Google Business Profile ⚡

Sense perfil de Google, no apareixeràs a "consultoria tecnològica Barcelona" al mapa.

### 2.1 Crear o reclamar el perfil
- [x] Ves a [business.google.com](https://business.google.com)
- [x] Crea un perfil per a **MalditasMaquinas** (o reclama si n'hi ha un d'existent)
- [x] Categoria principal: **Consultor en tecnología de la información** (o IT Consultant)
- [ ] Categories secundàries: Servicio de asistencia informática, Empresa de software

### 2.2 Completar el perfil (mínim per aparèixer)
- [x] Nom: MalditasMaquinas
- [x] Adreça: Nau Bostik — Carrer Ferran Turné 1-11, 08027 Barcelona
  - Si no vols mostrar l'adreça públicament: marca "Atenc a clients a la seva ubicació" i oculta l'adreça
- [x] Àrea de servei: Barcelona, Àrea Metropolitana (o tot Catalunya si és remot)
- [x] Web: `https://malditasmaquinas.com`
- [x] Telèfon (si en tens un per al negoci)
- [x] Horari d'atenció
- [x] Descripció (250 caràcters): *Consultoria tecnològica a demanda per a artistes, autònoms i petites empreses. Programari lliure, Mac i Linux. Sense subscripcions, sense pèrdua de temps.*

### 2.3 Fotos i contingut visual
- [ ] Puja almenys 3 fotos: logo, lloc de treball, imatge representativa
- [ ] Afegeix els serveis principals com a "Serveis" al perfil

### 2.4 Primeres ressenyes
- [ ] Demana ressenya a 3-5 clients o col·legues de confiança (link directe des del perfil)
- [ ] Respon a totes les ressenyes, positives i negatives

---

## 3. Contingut que posiciona

### 3.1 Pàgines de servei — ampliar text ⚡

Les pàgines actuals tenen bon contingut però son curtes per a SEO. Objectiu: 600-800 paraules per pàgina.

- [ ] **Consultoria tecnològica** (`/serveis/consultoria-tecnologica/`)
  - Afegir: casos d'ús concrets, preguntes típiques que resol, per a qui NO és
  - Paraules clau objectiu: "consultoria informàtica Barcelona", "assessoria tecnològica autònoms"
  
- [ ] **Webs i servidors** (`/serveis/webs-i-servidors/`)
  - Afegir: comparativa web estàtic vs WordPress, preus orientatius, temps de lliurament
  - Paraules clau: "web estàtica Barcelona", "migració WordPress Hugo", "web sense WordPress"

- [ ] **Allibera't del WordPress** (`/serveis/allibera-del-wordpress/`)
  - Aquesta pàgina pot ser un actiu SEO potent — molts cerquen alternatives
  - Afegir: per què WordPress és un problema, quines alternatives existeixen, com és la migració
  - Paraules clau: "alternativa WordPress", "migrar de WordPress", "web sense WordPress Barcelona"

- [ ] **Mac i Linux** (`/serveis/mac-i-linux/`)
  - Paraules clau: "suport Mac Barcelona", "Linux autònom Barcelona", "reparació Mac"

### 3.2 FAQ ⚡

La secció FAQ (`/faq/`) és ideal per capturar cerca de cua llarga. Afegeix preguntes reals.

- [ ] Crea 10-15 preguntes amb respostes de 100-200 paraules cadascuna
- Exemples de preguntes que rankejen:
  - "Quant val una consulta informàtica?"
  - "Com triar un ordinador per a fotografia professional?"
  - "Puc passar la meva web de WordPress a alguna cosa més ràpida?"
  - "Quin és el millor programari d'edició de vídeo gratuït per a Mac?"
  - "Com configurar el correu amb domini propi sense pagar molt?"
  - "Val la pena tenir Linux al Mac amb Apple Silicon?"

### 3.3 Blog / articles (opcional però potent)

Un article mensual sobre temes reals pot atraure molt de tràfic. No cal ser prolífic.

- [ ] Crea la secció `content/ca/blog/` a Hugo
- [ ] Primer article suggerit: **"Per què el teu web de WordPress és més lent del que creus (i com solucionar-ho)"**
- [ ] Segon article: **"Programari lliure per a creatius: la guia que ningú et farà"**
- [ ] Tercer: **"Inkscape vs Illustrator: per a un autònom, quin té sentit?"**

### 3.4 Paraules clau locals a les pàgines

- [ ] Afegir "Barcelona" i "Catalunya" de manera natural als textos de serveis
- [ ] Meta description de cada pàgina ha de mencionar la ubicació i el servei concret
- [ ] Títol de la pàgina principal: considera afegir "· Barcelona" al final

---

## 4. Autoritat i enllaços externs

### 4.1 Directoris i presència bàsica
- [ ] [Bing Webmaster Tools](https://www.bing.com/webmasters) — mateix procés que Google Search Console
- [ ] [Páginas Amarillas](https://www.paginasamarillas.es) — fitxa gratuïta
- [ ] [Yelp Espanya](https://www.yelp.es) — fitxa gratuïta
- [ ] [Hotfrog](https://www.hotfrog.es) — directori de negocis
- [ ] Si tens perfil a LinkedIn: afegeix el web i una descripció de l'empresa

### 4.2 Comunitats i visibilitat
- [ ] Respon preguntes tècniques a fòrums de fotografia, música o disseny Catalans (amb link al web quan sigui rellevant i natural)
- [ ] Si tens Twitter/Mastodon: publica quan afegeixes contingut nou
- [ ] LinuxBCN.com: afegir link a malditasmaquinas.com des del web germà (és autoritat donada)

---

## 5. Monitoratge

### 5.1 Eines gratuïtes
- [ ] **Google Search Console**: quines cerques porten al web, posicions, clics
- [ ] **GoatCounter** (`/stats/`): tràfic propi, pàgines més visitades
- [ ] **PageSpeed Insights**: velocitat mensual

### 5.2 Calendari mínim
- [ ] **Setmanal** (5 min): mirar GoatCounter, hi ha alguna pàgina que creixi?
- [ ] **Mensual** (30 min): Search Console — noves paraules clau, errors d'indexació
- [ ] **Trimestral**: revisar si cal actualitzar contingut de les pàgines de servei

---

## Ordre recomanat (si ho has de fer poc a poc)

| Setmana | Tasques |
|---------|---------|
| 1 | Google Search Console + sitemap + Google Business Profile |
| 2 | Completar perfil GBP + demanar primeres ressenyes |
| 3 | Ampliar pàgina "Allibera't del WordPress" (la de més potencial) |
| 4 | Ampliar FAQ amb 10 preguntes |
| 5+ | Ampliar altres pàgines de servei, un per un |
| Mes 2+ | Primer article de blog si tens ganes |

---

## Notes i observacions

_(afegeix aquí el que vagis descobrint: quines cerques et porten visites, quines pàgines funcionen millor, etc.)_

