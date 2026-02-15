#!/bin/bash

# OpenAgent 发布脚本
# 用法: ./scripts/publish.sh [选项]
#
# 选项:
#   --git-only    只推送到 GitHub，不发布 npm
#   --npm-only    只发布到 npm，不推送 GitHub
#   --dry-run     模拟运行，不实际执行
#   --bump        自动升级版本号 (patch/minor/major)
#   --help        显示帮助

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$(dirname "$PACKAGE_DIR")")"

# 默认选项
GIT_PUSH=true
NPM_PUBLISH=true
DRY_RUN=false
BUMP_VERSION=""

# 解析参数
while [[ $# -gt 0 ]]; do
  case $1 in
    --git-only)
      NPM_PUBLISH=false
      shift
      ;;
    --npm-only)
      GIT_PUSH=false
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --bump)
      BUMP_VERSION="$2"
      shift 2
      ;;
    --help|-h)
      echo "OpenAgent 发布脚本"
      echo ""
      echo "用法: ./scripts/publish.sh [选项]"
      echo ""
      echo "选项:"
      echo "  --git-only        只推送到 GitHub，不发布 npm"
      echo "  --npm-only        只发布到 npm，不推送 GitHub"
      echo "  --dry-run         模拟运行，不实际执行"
      echo "  --bump <type>     升级版本号 (patch/minor/major)"
      echo "  --help, -h        显示帮助"
      echo ""
      echo "示例:"
      echo "  ./scripts/publish.sh                    # 完整发布 (git + npm)"
      echo "  ./scripts/publish.sh --git-only        # 只推送到 GitHub"
      echo "  ./scripts/publish.sh --bump patch      # 升级补丁版本后发布"
      echo "  ./scripts/publish.sh --dry-run         # 模拟运行"
      exit 0
      ;;
    *)
      echo -e "${RED}未知选项: $1${NC}"
      exit 1
      ;;
  esac
done

# 辅助函数
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

run_cmd() {
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY-RUN]${NC} $1"
  else
    log_info "执行: $1"
    eval "$1"
  fi
}

# 检查前置条件
check_prerequisites() {
  log_info "检查前置条件..."
  
  # 检查是否在正确的目录
  if [ ! -f "$PACKAGE_DIR/package.json" ]; then
    log_error "找不到 package.json，请确保在正确的目录运行"
    exit 1
  fi
  
  # 检查 git 状态
  cd "$REPO_ROOT"
  if [ -n "$(git status --porcelain)" ]; then
    log_warn "工作目录有未提交的更改"
    git status --short
    echo ""
    read -p "是否继续? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
  
  # 检查 openagent remote
  if ! git remote | grep -q "openagent"; then
    log_info "添加 openagent remote..."
    run_cmd "git remote add openagent https://github.com/furioussoul/OpenAgent.git"
  fi
  
  log_success "前置条件检查通过"
}

# 构建项目
build_project() {
  log_info "构建项目..."
  cd "$PACKAGE_DIR"
  run_cmd "npm run build"
  log_success "构建完成"
}

# 升级版本
bump_version() {
  if [ -n "$BUMP_VERSION" ]; then
    log_info "升级版本号 ($BUMP_VERSION)..."
    cd "$PACKAGE_DIR"
    
    if [ "$DRY_RUN" = true ]; then
      CURRENT_VERSION=$(node -p "require('./package.json').version")
      echo -e "${YELLOW}[DRY-RUN]${NC} 当前版本: $CURRENT_VERSION"
      echo -e "${YELLOW}[DRY-RUN]${NC} npm version $BUMP_VERSION --no-git-tag-version"
    else
      run_cmd "npm version $BUMP_VERSION --no-git-tag-version"
      NEW_VERSION=$(node -p "require('./package.json').version")
      log_success "版本升级到: $NEW_VERSION"
      
      # 提交版本更改
      cd "$REPO_ROOT"
      run_cmd "git add packages/openagent/package.json"
      run_cmd "git commit -m 'chore(openagent): bump version to $NEW_VERSION'"
    fi
  fi
}

# 推送到 GitHub (使用 subtree)
push_to_github() {
  if [ "$GIT_PUSH" = true ]; then
    log_info "推送到 GitHub (OpenAgent 仓库)..."
    cd "$REPO_ROOT"
    
    # 先推送到主仓库
    log_info "推送到主仓库 (origin)..."
    run_cmd "git push origin master"
    
    # 使用 subtree 推送到 OpenAgent 仓库
    log_info "使用 subtree 推送到 OpenAgent 仓库..."
    run_cmd "git subtree push --prefix=packages/openagent openagent main"
    
    log_success "GitHub 推送完成"
  fi
}

# 发布到 npm
publish_to_npm() {
  if [ "$NPM_PUBLISH" = true ]; then
    log_info "发布到 npm..."
    cd "$PACKAGE_DIR"
    
    # 检查是否已登录
    if ! npm whoami --registry=https://registry.npmjs.org/ &>/dev/null; then
      log_error "未登录 npm，请先运行: npm login --registry=https://registry.npmjs.org/"
      exit 1
    fi
    
    run_cmd "npm publish --registry=https://registry.npmjs.org/ --access public"
    
    log_success "npm 发布完成"
  fi
}

# 显示发布信息
show_summary() {
  cd "$PACKAGE_DIR"
  VERSION=$(node -p "require('./package.json').version")
  NAME=$(node -p "require('./package.json').name")
  
  echo ""
  echo "=========================================="
  echo -e "${GREEN}发布完成!${NC}"
  echo "=========================================="
  echo ""
  echo "包名: $NAME"
  echo "版本: $VERSION"
  echo ""
  
  if [ "$GIT_PUSH" = true ]; then
    echo "GitHub: https://github.com/furioussoul/OpenAgent"
  fi
  
  if [ "$NPM_PUBLISH" = true ]; then
    echo "npm: https://www.npmjs.com/package/$NAME"
    echo ""
    echo "安装命令:"
    echo "  npm install $NAME"
  fi
  
  echo ""
}

# 主流程
main() {
  echo ""
  echo "=========================================="
  echo "  OpenAgent 发布脚本"
  echo "=========================================="
  echo ""
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "模拟运行模式 (不会实际执行)"
    echo ""
  fi
  
  check_prerequisites
  build_project
  bump_version
  push_to_github
  publish_to_npm
  show_summary
}

# 运行主流程
main
