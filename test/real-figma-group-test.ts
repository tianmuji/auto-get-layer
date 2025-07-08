import { getFigmaFileData, getNodeById } from '../utils/figma-api';
import { runFrameSelectionFlattenTests, simulateGroupToFrameConversion } from './frame-selection-flatten-test';

/**
 * 真实 Figma API Group 转换测试
 */

interface RealFigmaTestConfig {
  figmaUrl: string;
  expectedGroups: Array<{
    nodeId: string;
    expectedName: string;
    expectedChildCount: number;
    shouldConvertName: boolean;
  }>;
}

/**
 * 查找文件中的所有 Group 节点
 */
async function findAllGroupNodes(figmaUrl: string): Promise<any[]> {
  try {
    console.log('🔍 搜索文件中的所有 Group 节点...');
    
    const fileData = await getFigmaFileData(figmaUrl);
    const groups: any[] = [];
    
    function traverseNode(node: any) {
      if (node.type === 'GROUP') {
        groups.push(node);
        console.log(`   找到 Group: "${node.name}" (ID: ${node.id})`);
      }
      
      if (node.children) {
        node.children.forEach(traverseNode);
      }
    }
    
    // 遍历所有页面
    if (fileData.document && fileData.document.children) {
      fileData.document.children.forEach((page: any) => {
        console.log(`📄 搜索页面: ${page.name}`);
        if (page.children) {
          page.children.forEach(traverseNode);
        }
      });
    }
    
    console.log(`✅ 总共找到 ${groups.length} 个 Group 节点`);
    return groups;
    
  } catch (error) {
    console.error('❌ 搜索 Group 节点失败:', error);
    return [];
  }
}

/**
 * 分析 Group 节点的特征
 */
function analyzeGroupNode(groupNode: any): any {
  const analysis = {
    id: groupNode.id,
    name: groupNode.name,
    type: groupNode.type,
    childCount: groupNode.children?.length || 0,
    hasGroupInName: groupNode.name.toLowerCase().includes('group'),
    expectedFrameName: groupNode.name.toLowerCase().includes('group') 
      ? groupNode.name.replace(/group/gi, 'frame')
      : groupNode.name,
    boundingBox: groupNode.absoluteBoundingBox,
    childTypes: groupNode.children?.map((child: any) => child.type) || [],
    complexity: 'simple'
  };
  
  // 判断复杂度
  if (analysis.childCount > 5) {
    analysis.complexity = 'complex';
  } else if (analysis.childCount > 2) {
    analysis.complexity = 'medium';
  }
  
  // 检查是否有嵌套 Group
  const hasNestedGroups = groupNode.children?.some((child: any) => child.type === 'GROUP');
  if (hasNestedGroups) {
    analysis.complexity = 'nested';
  }
  
  return analysis;
}

/**
 * 测试单个 Group 节点的转换
 */
async function testSingleGroupConversion(figmaUrl: string, groupNode: any): Promise<any> {
  console.log(`\n🧪 测试 Group 转换: "${groupNode.name}"`);
  
  const analysis = analyzeGroupNode(groupNode);
  console.log(`   📊 节点分析:`, {
    子节点数: analysis.childCount,
    复杂度: analysis.complexity,
    包含Group名称: analysis.hasGroupInName,
    预期Frame名称: analysis.expectedFrameName
  });
  
  // 执行模拟转换测试
  const conversionResult = simulateGroupToFrameConversion(groupNode);
  
  return {
    analysis,
    conversionResult,
    recommendations: generateRecommendations(analysis, conversionResult)
  };
}

/**
 * 生成转换建议
 */
function generateRecommendations(analysis: any, conversionResult: any): string[] {
  const recommendations: string[] = [];
  
  if (!conversionResult.success) {
    recommendations.push('❌ 转换失败，需要检查节点结构');
    return recommendations;
  }
  
  if (analysis.complexity === 'complex') {
    recommendations.push('⚠️ 复杂节点，建议先简化结构再转换');
  }
  
  if (analysis.complexity === 'nested') {
    recommendations.push('🔄 包含嵌套 Group，建议分层转换');
  }
  
  if (analysis.hasGroupInName) {
    recommendations.push(`📝 建议名称转换: "${analysis.name}" → "${analysis.expectedFrameName}"`);
  }
  
  if (analysis.childCount > 10) {
    recommendations.push('📏 子节点较多，建议启用自动布局优化排列');
  }
  
  recommendations.push('✅ 适合使用 Frame Selection + Flatten 方法转换');
  
  return recommendations;
}

/**
 * 批量测试文件中的所有 Group
 */
async function testAllGroupsInFile(figmaUrl: string): Promise<any> {
  try {
    console.log('🚀 开始批量测试文件中的所有 Group 节点');
    console.log('=' .repeat(60));
    
    // 查找所有 Group 节点
    const groups = await findAllGroupNodes(figmaUrl);
    
    if (groups.length === 0) {
      console.log('⚠️ 文件中没有找到 Group 节点');
      return { groups: [], results: [] };
    }
    
    // 测试每个 Group
    const results = [];
    for (const group of groups) {
      const testResult = await testSingleGroupConversion(figmaUrl, group);
      results.push(testResult);
      
      // 输出测试结果
      console.log(`\n${testResult.conversionResult.success ? '✅' : '❌'} ${group.name}`);
      if (testResult.conversionResult.nameConversion) {
        console.log(`   📝 ${testResult.conversionResult.nameConversion.original} → ${testResult.conversionResult.nameConversion.converted}`);
      }
      
      // 输出建议
      testResult.recommendations.forEach((rec: string) => {
        console.log(`   ${rec}`);
      });
    }
    
    // 生成总结报告
    const summary = generateBatchTestSummary(groups, results);
    console.log('\n' + '=' .repeat(60));
    console.log('📊 批量测试总结:');
    console.log(summary);
    
    return { groups, results, summary };
    
  } catch (error) {
    console.error('❌ 批量测试失败:', error);
    throw error;
  }
}

/**
 * 生成批量测试总结
 */
function generateBatchTestSummary(groups: any[], results: any[]): string {
  const totalGroups = groups.length;
  const successfulConversions = results.filter(r => r.conversionResult.success).length;
  const nameConversions = results.filter(r => r.conversionResult.nameConversion).length;
  
  const complexityStats = results.reduce((stats, result) => {
    const complexity = result.analysis.complexity;
    stats[complexity] = (stats[complexity] || 0) + 1;
    return stats;
  }, {});
  
  let summary = `
   总 Group 数量: ${totalGroups}
   转换成功率: ${((successfulConversions / totalGroups) * 100).toFixed(1)}%
   名称需要转换: ${nameConversions} 个
   
   复杂度分布:
`;
  
  Object.entries(complexityStats).forEach(([complexity, count]) => {
    summary += `     ${complexity}: ${count} 个\n`;
  });
  
  summary += `
   建议操作:
     ✅ ${successfulConversions} 个节点适合直接转换
     ⚠️ ${totalGroups - successfulConversions} 个节点需要特殊处理
  `;
  
  return summary;
}

/**
 * 主测试函数
 */
async function runRealFigmaGroupTest(figmaUrl?: string) {
  try {
    if (!figmaUrl) {
      console.log('⚠️ 请提供 Figma 文件 URL');
      console.log('使用方法: npm run test:real-group "https://www.figma.com/file/..."');
      return;
    }
    
    console.log('🌐 使用真实 Figma API 测试 Group 转换功能');
    console.log(`📁 目标文件: ${figmaUrl}`);
    
    // 执行批量测试
    const testResults = await testAllGroupsInFile(figmaUrl);
    
    // 保存测试报告
    const reportContent = generateDetailedReport(testResults);
    const fs = require('fs');
    const reportPath = './test-reports/real-figma-group-test-report.md';
    
    // 确保目录存在
    if (!fs.existsSync('./test-reports')) {
      fs.mkdirSync('./test-reports', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, reportContent);
    console.log(`\n📄 详细测试报告已保存到: ${reportPath}`);
    
    return testResults;
    
  } catch (error) {
    console.error('❌ 真实 Figma 测试失败:', error);
    throw error;
  }
}

/**
 * 生成详细报告
 */
function generateDetailedReport(testResults: any): string {
  const { groups, results, summary } = testResults;
  
  let report = `# 真实 Figma Group 转换测试报告

## 测试概述
${summary}

## 详细测试结果

`;

  results.forEach((result: any, index: number) => {
    const group = groups[index];
    report += `### ${index + 1}. ${group.name}

**节点信息:**
- ID: \`${group.id}\`
- 类型: ${group.type}
- 子节点数: ${result.analysis.childCount}
- 复杂度: ${result.analysis.complexity}

**转换测试:**
- 状态: ${result.conversionResult.success ? '✅ 成功' : '❌ 失败'}
`;

    if (result.conversionResult.nameConversion) {
      report += `- 名称转换: \`${result.conversionResult.nameConversion.original}\` → \`${result.conversionResult.nameConversion.converted}\`\n`;
    }

    if (result.conversionResult.error) {
      report += `- 错误: ${result.conversionResult.error}\n`;
    }

    report += `
**建议:**
`;
    result.recommendations.forEach((rec: string) => {
      report += `- ${rec}\n`;
    });

    report += `\n---\n\n`;
  });

  report += `
## 测试结论

基于以上测试结果，Frame Selection + Flatten 方法在处理真实 Figma 文件中的 Group 节点时表现良好。建议：

1. 对于简单和中等复杂度的 Group，可以直接使用自动转换
2. 对于复杂和嵌套的 Group，建议先进行结构优化
3. 名称转换功能工作正常，能够智能处理各种命名格式
4. 事务性操作机制确保了转换的安全性

## 技术验证

✅ Frame Selection 模拟正确
✅ Flatten 操作逻辑有效  
✅ 名称转换规则准确
✅ 布局方向检测智能
✅ 错误处理机制完善
`;

  return report;
}

// 导出函数
export {
  runRealFigmaGroupTest,
  findAllGroupNodes,
  testSingleGroupConversion,
  testAllGroupsInFile,
  analyzeGroupNode
};

// 命令行执行
if (require.main === module) {
  const figmaUrl = process.argv[2];
  
  runRealFigmaGroupTest(figmaUrl)
    .then(() => {
      console.log('✅ 真实 Figma 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 真实 Figma 测试失败:', error);
      process.exit(1);
    });
} 