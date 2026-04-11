#!/usr/bin/env bash
# =============================================================================
# build-release.sh — Gera AAB versionado para o Transfer Online
#
# Uso:
#   bash scripts/build-release.sh [versionName]
#
# Exemplos:
#   bash scripts/build-release.sh 1.0.2
#   bash scripts/build-release.sh          (usa patch auto-increment)
#
# O que faz:
#   1. Lê versionCode atual do build.gradle
#   2. Incrementa versionCode
#   3. Atualiza versionName (argumento ou auto patch)
#   4. Roda: npm run build → cap sync android → gradlew bundleRelease
#   5. Copia AAB para releases/ com nome versionado
#   6. Atualiza releases/RELEASES.md
#   7. Faz commit das mudanças de versão
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PROJECT_ROOT/app"
ANDROID_DIR="$APP_DIR/android"
BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"
RELEASES_DIR="$PROJECT_ROOT/releases"
RELEASES_MD="$RELEASES_DIR/RELEASES.md"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "━━━ Transfer Online: Build Release ━━━"
echo ""

# ── Ler versionCode e versionName atuais ──
CURRENT_VERSION_CODE=$(grep "versionCode" "$BUILD_GRADLE" | head -1 | grep -o '[0-9]*')
CURRENT_VERSION_NAME=$(grep "versionName" "$BUILD_GRADLE" | head -1 | grep -o '"[^"]*"' | tr -d '"')

echo -e "  Versão atual: ${YELLOW}$CURRENT_VERSION_NAME (versionCode $CURRENT_VERSION_CODE)${NC}"

# ── Calcular nova versão ──
NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))

if [ -n "${1:-}" ]; then
  NEW_VERSION_NAME="$1"
else
  # Auto-incrementa o patch (último número)
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION_NAME"
  NEW_PATCH=$((PATCH + 1))
  NEW_VERSION_NAME="$MAJOR.$MINOR.$NEW_PATCH"
fi

echo -e "  Nova versão:  ${GREEN}$NEW_VERSION_NAME (versionCode $NEW_VERSION_CODE)${NC}"
echo ""

# ── Atualizar build.gradle ──
echo "  Atualizando build.gradle..."
sed -i "s/versionCode $CURRENT_VERSION_CODE/versionCode $NEW_VERSION_CODE/" "$BUILD_GRADLE"
sed -i "s/versionName \"$CURRENT_VERSION_NAME\"/versionName \"$NEW_VERSION_NAME\"/" "$BUILD_GRADLE"

# ── Build web ──
echo "  Rodando npm run build..."
cd "$APP_DIR"
npm run build

# ── Cap sync ──
echo "  Rodando npx cap sync android..."
npx cap sync android

# ── Gradle bundle ──
echo "  Gerando AAB (bundleRelease)..."
cd "$ANDROID_DIR"
./gradlew bundleRelease

AAB_SOURCE="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
AAB_NAME="transfer-online-v${NEW_VERSION_NAME}-vc${NEW_VERSION_CODE}.aab"
AAB_DEST="$RELEASES_DIR/$AAB_NAME"

# ── Copiar AAB ──
echo "  Copiando AAB para releases/..."
mkdir -p "$RELEASES_DIR"
cp "$AAB_SOURCE" "$AAB_DEST"

echo ""
echo -e "  ${GREEN}✓ AAB gerado: releases/$AAB_NAME${NC}"
echo ""

# ── Atualizar RELEASES.md ──
DATE=$(date +%Y-%m-%d)
TEMP_MD=$(mktemp)
cat > "$TEMP_MD" << EOF
# Transfer Online — Release History

## v$NEW_VERSION_NAME (versionCode $NEW_VERSION_CODE) — $DATE
- Build gerada via build-release.sh
- AAB: $AAB_NAME

EOF
# Appenda o conteúdo existente (sem a primeira linha do header)
tail -n +3 "$RELEASES_MD" >> "$TEMP_MD" 2>/dev/null || true
mv "$TEMP_MD" "$RELEASES_MD"

echo -e "  ${GREEN}✓ RELEASES.md atualizado${NC}"

# ── Commit ──
cd "$PROJECT_ROOT"
git add app/android/app/build.gradle releases/
git commit -m "chore: bump version to $NEW_VERSION_NAME (vc$NEW_VERSION_CODE) [release]"

echo ""
echo "━━━ Pronto ━━━"
echo -e "  AAB: ${GREEN}releases/$AAB_NAME${NC}"
echo -e "  Próximo passo: subir para Play Console > Teste fechado > Nova versão"
echo ""
