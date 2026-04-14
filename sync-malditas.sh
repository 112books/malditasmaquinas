#!/bin/bash

# sync-malditas.sh — Git + Hugo workflow — malditasmaquinas.com
#
# 4 entorns:
#   local   → http://localhost:1313/                           (hugo serve)
#   dev     → https://github.com/112books/malditasmaquinas/   (codi a GitHub, branca dev)
#   staging → https://112books.github.io/malditasmaquinas/    (GitHub Pages, branca main)
#   prod    → https://malditasmaquinas.com/                   (domini propi, mateixa branca main)
#
# Els baseURL per entorn estan a config/local/ i config/staging/
# GitHub Actions gestiona el baseURL de staging/prod al build (configure-pages)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuració
REMOTE="origin"
BRANCH_DEV="dev"
BRANCH_PROD="main"

URL_LOCAL="http://localhost:1313/"
URL_DEV="https://github.com/112books/malditasmaquinas/"
URL_STAGING="https://112books.github.io/malditasmaquinas/"
URL_PROD="https://malditasmaquinas.com/"

# Missatges
print_message() { echo -e "${BLUE}[sync]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error()   { echo -e "${RED}[✗]${NC} $1"; }

# ---------------------------------------------------------------------------
# Verificacions
# ---------------------------------------------------------------------------

check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "No és un repositori Git"
        exit 1
    fi
}

check_hugo() {
    if ! command -v hugo &> /dev/null; then
        print_error "Hugo no trobat. Instal·la'l amb: brew install hugo"
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Capçalera
# ---------------------------------------------------------------------------

show_header() {
    local branca
    branca=$(git branch --show-current)
    echo ""
    echo "======================================"
    echo " $(basename "$(pwd)") · branca: $branca"
    echo "======================================"
    echo " local   → $URL_LOCAL"
    echo " dev     → $URL_DEV"
    echo " staging → $URL_STAGING"
    echo " prod    → $URL_PROD"
    echo "======================================"
    echo ""
}

# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

show_status() {
    print_message "Branca: $(git branch --show-current)"
    echo ""
    if [[ -n $(git status -s) ]]; then
        print_warning "Canvis locals:"
        git status -s
    else
        print_success "Repositori net"
    fi
    echo ""
}

# ---------------------------------------------------------------------------
# Pull: baixa els canvis de GitHub (branca actual)
# ---------------------------------------------------------------------------

do_pull() {
    print_message "Baixant canvis de GitHub..."
    if ! git pull origin "$(git branch --show-current)" --rebase; then
        print_error "Error en el pull. Resol els conflictes i torna a intentar-ho."
        exit 1
    fi
    print_success "Repositori actualitzat"
}

# ---------------------------------------------------------------------------
# Entorn 1 — LOCAL: hugo serve (baseURL auto → localhost:1313)
# ---------------------------------------------------------------------------

do_serve() {
    check_hugo
    print_message "Entorn: local"
    print_message "baseURL → $URL_LOCAL"
    print_message "apiBase → http://localhost:8787/api  (wrangler dev)"
    echo ""
    print_success "→ $URL_LOCAL"
    echo ""
    hugo serve --environment local
}

# ---------------------------------------------------------------------------
# Commit intern (reutilitzat per sync i deploy)
# ---------------------------------------------------------------------------

do_commit() {
    if [[ -n $(git status -s) ]]; then
        print_warning "Canvis locals:"
        git status -s
        echo ""
        local msg=""
        while [[ -z "$msg" ]]; do
            read -p "Missatge del commit: " msg
            [[ -z "$msg" ]] && print_warning "El missatge no pot ser buit"
        done
        git add -A
        git commit -m "$msg"
    fi
}

# ---------------------------------------------------------------------------
# Entorn 2 — DEV: commit + rebase + push a dev (codi a GitHub, sense build)
# ---------------------------------------------------------------------------

do_sync() {
    print_message "Entorn: dev → $URL_DEV"
    echo ""

    do_commit

    print_message "Pull --rebase des de $BRANCH_DEV..."
    if ! git pull "$REMOTE" "$BRANCH_DEV" --rebase; then
        print_error "Error en el pull --rebase. Resol els conflictes i torna a intentar-ho."
        exit 1
    fi

    print_message "Push a $BRANCH_DEV..."
    if ! git push "$REMOTE" "$(git branch --show-current):$BRANCH_DEV"; then
        print_error "Error en el push."
        exit 1
    fi

    print_success "Sync correcte → $URL_DEV"
}

# ---------------------------------------------------------------------------
# Entorn 3+4 — STAGING + PROD: push a main → GitHub Actions → GitHub Pages
#
# GitHub Actions (deploy.yml) fa el build amb --baseURL des de configure-pages:
#   · Sense domini propi → $URL_STAGING
#   · Amb domini propi   → $URL_PROD
#
# Per provar el build de staging localment: ./sync-malditas.sh preview
# ---------------------------------------------------------------------------

do_deploy() {
    check_hugo
    print_message "Entorn: staging + prod"
    print_message "staging → $URL_STAGING"
    print_message "prod    → $URL_PROD  (quan el domini estigui configurat)"
    echo ""

    local current
    current=$(git branch --show-current)

    if [[ "$current" != "$BRANCH_PROD" ]]; then
        print_warning "Estàs a '$current', no a '$BRANCH_PROD'"
        read -p "Vols fer merge de '$current' → '$BRANCH_PROD' i desplegar? (s/N): " confirm
        if [[ "$confirm" =~ ^[Ss]$ ]]; then
            git checkout "$BRANCH_PROD" || exit 1
            if ! git merge "$current" --no-edit; then
                print_error "Error en el merge. Resol els conflictes i torna a intentar-ho."
                git checkout "$current"
                exit 1
            fi
        else
            print_message "Cancel·lat"
            return
        fi
    fi

    do_commit

    print_message "Push a main → GitHub Actions → GitHub Pages..."
    if ! git push "$REMOTE" "$BRANCH_PROD"; then
        print_error "Error en el push."
        exit 1
    fi

    print_success "Deploy llançat"
    print_message "staging → $URL_STAGING"
    print_message "prod    → $URL_PROD  (si el domini ja apunta a GitHub Pages)"
    print_message "CI/CD   → ${URL_DEV}actions"
}

# ---------------------------------------------------------------------------
# Preview local del build de staging (comprova links sense pujar res)
# ---------------------------------------------------------------------------

do_preview() {
    check_hugo
    print_message "Build local amb baseURL de staging..."
    print_message "→ $URL_STAGING"
    echo ""
    hugo --environment staging --destination /tmp/mm-staging-preview
    echo ""
    print_success "Build completat a /tmp/mm-staging-preview"
    print_message "Inicia un servidor per veure'l:"
    echo "  cd /tmp/mm-staging-preview && python3 -m http.server 8080"
    echo "  → http://localhost:8080/malditasmaquinas/"
}

# ---------------------------------------------------------------------------
# Menú interactiu
# ---------------------------------------------------------------------------

interactive_menu() {
    show_header

    echo "Què vols fer?"
    echo ""
    echo "1) status   → Veure estat del repositori"
    echo "2) pull     → Baixar canvis de GitHub"
    echo "3) serve    → Servidor local  ($URL_LOCAL)"
    echo "4) sync     → Pujar codi a GitHub dev"
    echo "5) preview  → Build local amb baseURL de staging"
    echo "6) deploy   → Publicar a GitHub Pages (staging + prod via CI/CD)"
    echo "0) Sortir"
    echo ""

    read -p "Opció: " opt
    echo ""

    case $opt in
        1) show_status ;;
        2) do_pull ;;
        3) do_serve ;;
        4) do_sync ;;
        5) do_preview ;;
        6)
            print_warning "Farà push a main → GitHub Actions → GitHub Pages"
            read -p "Segur? (s/N): " confirm
            [[ "$confirm" =~ ^[Ss]$ ]] && do_deploy || print_message "Cancel·lat"
            ;;
        0) exit 0 ;;
        *) print_error "Opció no vàlida" ;;
    esac
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

check_git_repo

if [[ -z "$1" ]]; then
    interactive_menu
else
    case $1 in
        status)  show_status ;;
        pull)    do_pull ;;
        serve)   do_serve ;;
        sync)    do_sync ;;
        preview) do_preview ;;
        deploy)
            print_warning "Push a main → GitHub Actions → GitHub Pages"
            read -p "Segur? (s/N): " confirm
            [[ "$confirm" =~ ^[Ss]$ ]] && do_deploy || print_message "Cancel·lat"
            ;;
        *)
            print_error "Opció desconeguda: $1"
            echo ""
            echo "Ús: ./sync-malditas.sh [status|serve|sync|preview|deploy]"
            exit 1
            ;;
    esac
fi
