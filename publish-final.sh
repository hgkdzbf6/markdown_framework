#!/bin/bash
# OpenClaw Markdown Publisher - Final Version with Built-in Tests

set -e

# Configuration
SERVER="root@786100557.xyz"
PORT="30022"
REMOTE_DIR="/root/workspace/markdown-processor"
OUTPUT_DIR="$REMOTE_DIR/output"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}📤 OpenClaw Markdown Publisher${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 0: Run Built-in Tests
run_tests() {
    print_info "步骤0：运行内置测试..."

    # Test 1: Check server connectivity
    print_info "  测试服务器连接..."
    if ssh -p $PORT -o ConnectTimeout=5 $SERVER 'echo "OK"' >/dev/null 2>&1; then
        print_success "  服务器连接正常"
    else
        print_error "  无法连接到服务器"
        exit 1
    fi

    # Test 2: Check watche service
    print_info "  测试监听器服务..."
    WATCHER_STATUS=$(ssh -p $PORT $SERVER 'systemctl is-active md-watcher' 2>/dev/null || echo "unknown")
    if [ "$WATCHER_STATUS" = "active" ]; then
        print_success "  监听器服务运行中"
    else
        print_warning "  监听器服务未运行"
    fi

    # Test 3: Check HTTP server
    print_info "  测试HTTP服务器..."
    HTTP_STATUS=$(ssh -p $PORT $SERVER 'systemctl is-active md-server' 2>/dev/null || echo "unknown")
    if [ "$HTTP_STATUS" = "active" ]; then
        print_success "  HTTP服务器运行中"
    else
        print_warning "  HTTP服务器未运行"
    fi

    # Test 4: Check output directory
    print_info "  测试输出目录..."
    if ssh -p $PORT $SERVER "[ -d $OUTPUT_DIR ] && echo 'exists'" 2>/dev/null; then
        print_success "  输出目录存在"
    else
        print_error "  输出目录不存在"
        exit 1
    fi

    # Test 5: Check for recent documents
    print_info "  测试文档编译..."
    DOC_COUNT=$(ssh -p $PORT $SERVER "ls -1 $OUTPUT_DIR/*.html 2>/dev/null | wc -l" 2>/dev/null || echo "0")
    if [ "$DOC_COUNT" -gt "0" ]; then
        print_success "  找到 $DOC_COUNT 个HTML文档"
    else
        print_warning "  没有找到HTML文档"
    fi

    print_success "所有内置测试通过！"
    echo ""
}

# Step 1: Check arguments
check_arguments() {
    if [ $# -eq 0 ]; then
        print_error "请提供Markdown文件路径"
        echo "用法: $0 <markdown文件>"
        echo "示例: $0 my-article.md"
        exit 1
    fi

    MD_FILE=$1

    if [ ! -f "$MD_FILE" ]; then
        print_error "文件不存在: $MD_FILE"
        exit 1
    fi

    print_info "目标文件: $MD_FILE"
    echo ""
}

# Step 2: Upload Markdown
upload_markdown() {
    print_info "步骤1：上传Markdown文件..."

    if scp -P $PORT "$MD_FILE" "$SERVER:$OUTPUT_DIR/"; then
        print_success "上传成功"
        echo ""
    else
        print_error "上传失败"
        exit 1
    fi
}

# Step 3: Wait for compilation
wait_for_compilation() {
    print_info "步骤2：等待服务器编译..."
    print_info "预计等待3-5秒..."

    BASE_NAME=$(basename "$MD_FILE" .md)
    HTML_FILE="${BASE_NAME}.html"

    # Wait for HTML file to be created
    for i in {1..10}; do
        if ssh -p $PORT "$SERVER" "test -f $OUTPUT_DIR/$HTML_FILE"; then
            print_success "编译成功"
            echo ""

            # Show file sizes
            MD_SIZE=$(ssh -p $PORT "$SERVER" "du -h $OUTPUT_DIR/$MD_FILE | awk '{print $1}'")
            HTML_SIZE=$(ssh -p $PORT "$SERVER" "du -h $OUTPUT_DIR/$HTML_FILE | awk '{print $1}'")
            print_success "Markdown: $MD_SIZE"
            print_success "HTML: $HTML_SIZE"
            echo ""

            return 0
        fi

        if [ $i -lt 10 ]; then
            print_info "等待编译... ($i/10)"
            sleep 1
        fi
    done

    print_warning "编译超时，但文件可能已生成"
    echo ""
}

# Step 4: Verify compilation
verify_compilation() {
    print_info "步骤3：验证编译结果..."

    BASE_NAME=$(basename "$MD_FILE" .md)
    HTML_FILE="${BASE_NAME}.html"

    # Check if HTML exists
    if ssh -p $PORT "$SERVER" "[ -f $OUTPUT_DIR/$HTML_FILE ]"; then
        print_success "HTML文件存在"

        # Get file modification time
        MTIME=$(ssh -p $PORT "$SERVER" "date -r $OUTPUT_DIR/$HTML_FILE '+%Y-%m-%d %H:%M:%S'")
        print_success "生成时间: $MTIME"
    else
        print_error "HTML文件不存在"
        exit 1
    fi

    # Check HTML content
    CONTENT=$(ssh -p $PORT "$SERVER" "head -20 $OUTPUT_DIR/$HTML_FILE")
    if echo "$CONTENT" | grep -q "<!DOCTYPE html>"; then
        print_success "HTML格式正确"
    else
        print_warning "HTML格式可能有问题"
    fi

    echo ""
}

# Step 5: Display access info
display_access_info() {
    print_info "步骤4：访问信息..."

    BASE_NAME=$(basename "$MD_FILE" .md)
    HTML_FILE="${BASE_NAME}.html"

    print_success "文档目录："
    echo -e "${BLUE}  http://786100557.xyz:8088/${NC}"

    echo ""
    print_success "文档链接："
    echo -e "${BLUE}  http://786100557.xyz:8088/output/$HTML_FILE${NC}"

    echo ""
    print_success "快速测试命令："
    echo -e "${BLUE}  curl -I http://786100557.xyz:8088/output/$HTML_FILE${NC}"

    echo ""
}

# Main execution
main() {
    print_header

    # Step 0: Run built-in tests
    run_tests

    # Check arguments
    check_arguments "$@"

    # Upload markdown
    upload_markdown

    # Wait for compilation
    wait_for_compilation

    # Verify compilation
    verify_compilation

    # Display access info
    display_access_info

    # Done
    echo -e "${BLUE}========================================${NC}"
    print_success "📤 发布完成！"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Run main
main "$@"
