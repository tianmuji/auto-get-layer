/**
 * 测试报告生成器
 * 生成详细的自动布局检查测试报告
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
/**
 * 生成测试摘要
 */
export function generateTestSummary(statistics, violations) {
    const autoLayoutCapableNodes = statistics.autoLayoutCapableNodes;
    const autoLayoutEnabledNodes = statistics.autoLayoutEnabledNodes;
    const violationsCount = violations.length;
    const complianceRate = autoLayoutCapableNodes > 0 ?
        ((autoLayoutCapableNodes - violationsCount) / autoLayoutCapableNodes * 100) : 100;
    return {
        totalNodes: statistics.totalNodes,
        autoLayoutCapableNodes,
        autoLayoutEnabledNodes,
        violationsCount,
        complianceRate: Math.round(complianceRate * 100) / 100,
        passed: violationsCount === 0
    };
}
/**
 * 生成 Markdown 格式的测试报告
 */
export function generateMarkdownReport(testResult) {
    const { summary, statistics, violations, detailedNodes } = testResult;
    let report = `# 自动布局检查测试报告

## 测试信息
- **测试时间**: ${testResult.testTime}
- **Figma 文件**: ${testResult.fileName}
- **文件链接**: [查看文件](${testResult.figmaUrl})
- **File Key**: \`${testResult.fileKey}\`
${testResult.nodeId ? `- **Node ID**: \`${testResult.nodeId}\`` : ''}

## 测试结果摘要

### 🎯 总体评估
- **测试状态**: ${summary.passed ? '✅ 通过' : '❌ 未通过'}
- **合规率**: ${summary.complianceRate}%
- **总节点数**: ${summary.totalNodes}
- **支持自动布局的节点**: ${summary.autoLayoutCapableNodes}
- **已启用自动布局的节点**: ${summary.autoLayoutEnabledNodes}
- **发现的问题**: ${summary.violationsCount} 个

### 📊 节点类型分布
| 节点类型 | 数量 |
|---------|------|`;
    Object.entries(statistics.nodesByType).forEach(([type, count]) => {
        report += `\n| ${type} | ${count} |`;
    });
    report += `\n\n### 📏 结构信息
- **最大嵌套深度**: ${statistics.maxDepth}
- **有子节点的节点**: ${statistics.nodesWithChildren}

`;
    if (violations.length > 0) {
        report += `## ❌ 发现的问题

共发现 ${violations.length} 个自动布局配置问题：

`;
        violations.forEach((violation, index) => {
            report += `### ${index + 1}. ${violation.nodeName} (${violation.type})

- **节点ID**: \`${violation.nodeId}\`
- **问题描述**: 
`;
            violation.violations.forEach((v) => {
                report += `  - ${v}\n`;
            });
            report += `- **修改建议**: 
`;
            violation.suggestions.forEach((s) => {
                report += `  - ${s}\n`;
            });
            report += '\n';
        });
    }
    else {
        report += `## ✅ 检查结果

🎉 **恭喜！** 所有支持自动布局的节点都已正确配置。

`;
    }
    // 添加详细的节点列表（仅显示支持自动布局的节点）
    const autoLayoutNodes = detailedNodes.filter(node => node.supportsAutoLayout);
    if (autoLayoutNodes.length > 0) {
        report += `## 📋 支持自动布局的节点详情

| 节点名称 | 类型 | 路径 | 布局模式 | 子节点数 | 状态 |
|---------|------|------|----------|----------|------|`;
        autoLayoutNodes.forEach(node => {
            const status = node.autoLayoutEnabled ? '✅ 已启用' : '❌ 未启用';
            report += `\n| ${node.name} | ${node.type} | ${node.path} | ${node.layoutMode} | ${node.childrenCount} | ${status} |`;
        });
    }
    report += `\n\n## 📈 改进建议

`;
    if (summary.violationsCount > 0) {
        report += `### 🔧 需要修复的问题
1. 共有 ${summary.violationsCount} 个节点需要启用自动布局
2. 建议优先修复层级较浅的容器节点
3. 对于复杂的组件，启用自动布局可以提高响应性和维护性

### 📚 自动布局最佳实践
- 对于包含多个子元素的容器，建议启用自动布局
- 使用适当的 padding 和 spacing 设置
- 考虑使用 Figma 的 Auto Layout 功能来创建响应式设计

`;
    }
    else {
        report += `### 🌟 设计质量评估
- 所有支持自动布局的节点都已正确配置
- 设计稿结构良好，符合最佳实践
- 建议继续保持这种高质量的设计标准

`;
    }
    report += `## 🔗 相关资源

- [Figma Auto Layout 官方文档](https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties)
- [Auto Layout 最佳实践](https://www.figma.com/best-practices/everything-you-need-to-know-about-layout-grids/)
- [响应式设计指南](https://www.figma.com/blog/responsive-web-design-figma/)

---

*报告由 auto-get-layer 插件自动生成 | 生成时间: ${testResult.testTime}*
`;
    return report;
}
/**
 * 生成 JSON 格式的测试报告
 */
export function generateJsonReport(testResult) {
    return JSON.stringify(testResult, null, 2);
}
/**
 * 保存测试报告到文件
 */
export function saveTestReport(testResult, outputDir = 'test/reports') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const fileKey = testResult.fileKey.substring(0, 8);
    const baseFileName = `auto-layout-test-${fileKey}-${timestamp}`;
    // 保存 Markdown 报告
    const markdownReport = generateMarkdownReport(testResult);
    const markdownPath = join(outputDir, `${baseFileName}.md`);
    writeFileSync(markdownPath, markdownReport, 'utf-8');
    console.log(`📄 Markdown 报告已保存: ${markdownPath}`);
    // 保存 JSON 报告
    const jsonReport = generateJsonReport(testResult);
    const jsonPath = join(outputDir, `${baseFileName}.json`);
    writeFileSync(jsonPath, jsonReport, 'utf-8');
    console.log(`📊 JSON 报告已保存: ${jsonPath}`);
    // 生成简要的控制台输出
    console.log('\n' + '='.repeat(60));
    console.log('📋 测试报告摘要');
    console.log('='.repeat(60));
    console.log(`文件: ${testResult.fileName}`);
    console.log(`状态: ${testResult.summary.passed ? '✅ 通过' : '❌ 未通过'}`);
    console.log(`合规率: ${testResult.summary.complianceRate}%`);
    console.log(`问题数量: ${testResult.summary.violationsCount}`);
    console.log(`支持自动布局的节点: ${testResult.summary.autoLayoutCapableNodes}`);
    console.log('='.repeat(60));
}
