#!/bin/bash

# sync-web.sh - Git + Hugo + Deploy complet — malditasmaquinas.com

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuració
BRANCH="dev"
REMOTE="origin"
BUILD_DIR="public"
SSH_KEY="$HOME/.ssh/malditasmaquinas_deploy"
SSH_USER="malditasmaquinas"
SSH_HOST=""   # TODO: afegir host Dinahosting
SSH_PATH="www"

# Missatges
print_message() { echo -e "${BLUE}[sync-web]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error()   { echo -e "${RED}[✗]${NC} $1"; }

# Verificar repo
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "No és un repositori Git"
        exit 1
    fi
}

# Info ràpida
show_header() {
    echo ""
    echo "======================================"
    echo " Projecte: $(basename $(pwd))"
    echo " Branca: $(git branch --show-current)"
    echo "======================================"
    echo ""
}

# Estat
show_status() {
    print_message "Estat del repositori"
    echo ""
    if [[ -n $(git status -s) ]]; then
        print_warning "Canvis locals:"
        git status -s
    else
        print_success "Repositori net"
    fi
    echo ""
}

# Pull
do_pull() {
    print_message "Pull..."
    git pull $REMOTE $BRANCH --rebase || exit 1
    print_success "Pull correcte"
}

# Sync: commit si cal + pull --rebase + push
do_sync() {
    print_message "Sincronitzant amb el remot..."

    if [[ -n $(git status -s) ]]; then
        print_warning "Canvis detectats:"
        git status -s
        echo ""
        read -p "Missatge del commit: " msg
        git add .
        git commit -m "$msg"
    fi

    print_message "Pull --rebase..."
    if ! git pull $REMOTE $BRANCH --rebase; then
        print_error "Error en el pull --rebase. Resol els conflictes i torna a intentar-ho."
        exit 1
    fi

    print_message "Push..."
    if ! git push $REMOTE $(git branch --show-current):$BRANCH; then
        print_error "Error en el push."
        exit 1
    fi

    print_success "Push correcte"
}

do_push() { do_sync; }

# Deploy GitHub Pages (branca dev → GitHub Pages)
do_deploy() {
    print_message "Deploy GitHub Pages (staging)"
    do_sync
    print_message "Build Hugo (staging)..."
    hugo --environment staging || exit 1
    print_message "Publicant a gh-pages..."
    git subtree push --prefix $BUILD_DIR $REMOTE gh-pages || exit 1
    print_success "Deploy GitHub completat → 112books.github.io/malditasmaquinas.com"
}

# Publicar a producció via rsync SSH (Dinahosting)
do_publish() {
    print_message "Publicant al servidor via rsync SSH (Dinahosting)..."

    if [ -z "$SSH_HOST" ]; then
        print_error "SSH_HOST no configurat. Edita sync-web.sh i afegeix el host de Dinahosting."
        exit 1
    fi

    if [ ! -f "$SSH_KEY" ]; then
        print_error "Clau SSH no trobada: $SSH_KEY"
        print_error "Executa: ssh-keygen -t ed25519 -f ~/.ssh/malditasmaquinas_deploy"
        exit 1
    fi

    do_sync

    print_message "Build Hugo producció..."
    hugo --minify --environment production || exit 1

    print_message "Enviant fitxers via rsync..."
    rsync -avz --delete --checksum --omit-dir-times \
        --exclude='.DS_Store' \
        --exclude='.DS_Store?' \
        --exclude='*.map' \
        --ignore-errors \
        -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
        ${BUILD_DIR}/ ${SSH_USER}@${SSH_HOST}:${SSH_PATH}/
    RESULT=$?

    if [ $RESULT -eq 0 ] || [ $RESULT -eq 23 ]; then
        print_success "Web publicada a https://malditasmaquinas.com"
    else
        print_error "Error en la pujada. Comprova la connexió SSH."
        exit 1
    fi
}

# Force push
do_force() {
    print_warning "Forçarà el repositori remot"
    git push $REMOTE $(git branch --show-current)
    print_success "Force push completat"
}

# Menú interactiu
interactive_menu() {
    show_header

    echo "Què vols fer?"
    echo ""
    echo "1) Status    → Veure estat del repositori"
    echo "2) Pull      → Descarregar canvis de GitHub"
    echo "3) Push      → Pujar canvis locals a GitHub (branca dev)"
    echo "4) Deploy    → Publicar a GitHub Pages (staging)"
    echo "5) Publish   → Publicar al servidor real (malditasmaquinas.com)"
    echo "6) Force     → Forçar push (perillós)"
    echo "0) Sortir"
    echo ""

    read -p "Opció: " opt
    echo ""

    case $opt in
        1) show_status ;;
        2) do_pull ;;
        3) do_push ;;
        4) do_deploy ;;
        5)
            print_warning "Això SOBREESCRIURÀ el servidor de producció (malditasmaquinas.com)"
            read -p "Segur? (s/N): " confirm
            if [[ "$confirm" =~ ^[Ss]$ ]]; then
                do_publish
            else
                print_message "Cancel·lat"
            fi
            ;;
        6)
            print_warning "Això pot trencar el repositori remot"
            read -p "Segur? (s/N): " confirm
            if [[ "$confirm" =~ ^[Ss]$ ]]; then
                do_force
            else
                print_message "Cancel·lat"
            fi
            ;;
        0)
            print_message "Sortint..."
            exit 0
            ;;
        *)
            print_error "Opció no vàlida"
            ;;
    esac
}

# Main
check_git_repo

if [ -z "$1" ]; then
    interactive_menu
else
    case $1 in
        status)  show_status ;;
        pull)    do_pull ;;
        push)    do_push ;;
        deploy)  do_deploy ;;
        publish) do_publish ;;
        force)   do_force ;;
        *)
            print_error "Opció no vàlida"
            echo "Ús: ./sync-web.sh {status|pull|push|deploy|publish|force}"
            ;;
    esac
fi

print_message "Fi del procés"