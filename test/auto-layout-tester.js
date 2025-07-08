#!/usr/bin/env node
/**
 * 自动布局检查测试器
 * 使用 Figma API 获取节点数据，运行自动布局检查，生成测试报告
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { mkdirSync } from 'fs';
import { parseFigmaUrl, getFigmaFile, getFigmaNode, extractAllNodes, convertToPluginNodeFormat } from '../utils/figma-api';
import { checkAllNodesAutoLayout, generateNodeStatistics, generateDetailedNodeList } from '../utils/validation-adapter';
import { generateTestSummary, saveTestReport } from '../utils/report-generator';
// 创建必要的目录
function ensureDirectories() {
    try {
        mkdirSync('test/reports', { recursive: true });
        console.log('📁 创建测试报告目录: test/reports');
    }
    catch (error) {
        // 目录已存在，忽略错误
    }
}
/**
 * 主测试函数
 */
function runAutoLayoutTest(figmaUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 开始自动布局检查测试...\n');
        try {
            // 1. 解析 Figma URL
            console.log('📋 解析 Figma URL...');
            const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);
            console.log(`   File Key: ${fileKey}`);
            if (nodeId) {
                console.log(`   Node ID: ${nodeId}`);
            }
            // 2. 获取 Figma 数据
            let figmaData;
            let targetNode;
            if (nodeId) {
                // 获取特定节点
                console.log('\n🔍 获取指定节点数据...');
                const nodeResponse = yield getFigmaNode(fileKey, nodeId);
                targetNode = nodeResponse.nodes[nodeId];
                if (!targetNode) {
                    throw new Error(`未找到节点 ID: ${nodeId}`);
                }
                // 同时获取文件信息以获取文件名
                const fileResponse = yield getFigmaFile(fileKey);
                figmaData = fileResponse;
            }
            else {
                // 获取整个文件
                console.log('\n📄 获取文件数据...');
                figmaData = yield getFigmaFile(fileKey);
                // 使用第一个页面作为目标节点
                if (figmaData.document && figmaData.document.children && figmaData.document.children.length > 0) {
                    targetNode = figmaData.document.children[0]; // 第一个页面
                }
                else {
                    throw new Error('文件中没有找到可分析的页面');
                }
            }
            const fileName = figmaData.name || 'Unknown File';
            console.log(`   文件名: ${fileName}`);
            console.log(`   目标节点: ${targetNode.name || 'Unnamed'} (${targetNode.type})`);
            // 3. 转换节点格式
            console.log('\n🔄 转换节点数据格式...');
            const allNodes = extractAllNodes(targetNode);
            console.log(`   提取到 ${allNodes.length} 个节点`);
            const pluginFormatNode = convertToPluginNodeFormat(targetNode);
            // 4. 运行自动布局检查
            console.log('\n✅ 执行自动布局检查...');
            const violations = checkAllNodesAutoLayout(pluginFormatNode);
            console.log(`   发现 ${violations.length} 个违规项`);
            // 5. 生成统计信息
            console.log('\n📊 生成统计信息...');
            const statistics = generateNodeStatistics(pluginFormatNode);
            const detailedNodes = generateDetailedNodeList(pluginFormatNode);
            const summary = generateTestSummary(statistics, violations);
            console.log(`   总节点数: ${statistics.totalNodes}`);
            console.log(`   支持自动布局的节点: ${statistics.autoLayoutCapableNodes}`);
            console.log(`   已启用自动布局的节点: ${statistics.autoLayoutEnabledNodes}`);
            console.log(`   合规率: ${summary.complianceRate}%`);
            // 6. 生成测试报告
            console.log('\n📝 生成测试报告...');
            const testResult = {
                figmaUrl,
                fileKey,
                nodeId,
                fileName,
                testTime: new Date().toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                statistics,
                violations,
                detailedNodes,
                summary
            };
            // 7. 保存报告
            saveTestReport(testResult);
            // 8. 显示详细的违规信息
            if (violations.length > 0) {
                console.log('\n❌ 发现的问题详情:');
                violations.forEach((violation, index) => {
                    console.log(`\n${index + 1}. ${violation.nodeName} (${violation.type})`);
                    console.log(`   节点ID: ${violation.nodeId}`);
                    violation.violations.forEach((v) => {
                        console.log(`   ❌ ${v}`);
                    });
                    violation.suggestions.forEach((s) => {
                        console.log(`   💡 ${s}`);
                    });
                });
            }
            else {
                console.log('\n🎉 恭喜！所有支持自动布局的节点都已正确配置！');
            }
            console.log('\n✨ 测试完成！');
        }
        catch (error) {
            console.error('\n❌ 测试失败:', error.message);
            if (error.message.includes('Figma API Token')) {
                console.log('\n💡 解决方案:');
                console.log('1. 访问 https://www.figma.com/developers/api#access-tokens');
                console.log('2. 生成 Personal Access Token');
                console.log('3. 运行: export FIGMA_TOKEN="your_token_here"');
                console.log('4. 重新运行测试');
            }
            process.exit(1);
        }
    });
}
/**
 * 命令行接口
 */
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log(`
🔍 自动布局检查测试器

用法:
  npm run test:auto-layout <figma_url>

示例:
  npm run test:auto-layout "https://www.figma.com/file/ABC123/MyFile"
  npm run test:auto-layout "https://www.figma.com/design/ABC123/MyFile?node-id=1-2"

环境变量:
  FIGMA_TOKEN - Figma Personal Access Token (必需)

输出:
  - test/reports/auto-layout-test-*.md - Markdown 格式报告
  - test/reports/auto-layout-test-*.json - JSON 格式报告
    `);
        process.exit(1);
    }
    const figmaUrl = args[0];
    // 确保目录存在
    ensureDirectories();
    // 运行测试
    runAutoLayoutTest(figmaUrl);
}
// 如果直接运行此脚本
if (require.main === module) {
    main();
}
export { runAutoLayoutTest };
