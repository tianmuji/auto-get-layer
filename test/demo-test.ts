#!/usr/bin/env node
/**
 * 演示测试脚本
 * 展示如何使用自动布局检查测试系统
 */

import { runAutoLayoutTest } from './auto-layout-tester';

// 示例 Figma 文件 URL（需要替换为实际的文件）
const DEMO_FIGMA_URLS = [
  // 示例 1: 完整文件测试
  // "https://www.figma.com/file/YOUR_FILE_KEY/Your-File-Name",
  
  // 示例 2: 特定节点测试
  // "https://www.figma.com/design/YOUR_FILE_KEY/Your-File-Name?node-id=1-2",
];

async function runDemo() {
  console.log('🎯 自动布局检查演示测试\n');
  
  // 检查是否设置了 Figma Token
  if (!process.env.FIGMA_TOKEN) {
    console.log('❌ 未设置 FIGMA_TOKEN 环境变量');
    console.log('\n💡 设置方法:');
    console.log('1. 访问 https://www.figma.com/developers/api#access-tokens');
    console.log('2. 生成 Personal Access Token');
    console.log('3. 运行: export FIGMA_TOKEN="your_token_here"');
    console.log('4. 重新运行演示: npm run demo:test');
    return;
  }
  
  // 检查是否有演示 URL
  if (DEMO_FIGMA_URLS.length === 0) {
    console.log('📝 演示测试说明');
    console.log('='.repeat(50));
    console.log('要运行演示测试，请按以下步骤操作:');
    console.log('');
    console.log('1. 编辑 test/demo-test.ts 文件');
    console.log('2. 在 DEMO_FIGMA_URLS 数组中添加你的 Figma 文件 URL');
    console.log('3. 重新运行: npm run demo:test');
    console.log('');
    console.log('URL 格式示例:');
    console.log('- "https://www.figma.com/file/ABC123/MyFile"');
    console.log('- "https://www.figma.com/design/ABC123/MyFile?node-id=1-2"');
    console.log('');
    console.log('或者直接使用:');
    console.log('npm run test:auto-layout "YOUR_FIGMA_URL"');
    return;
  }
  
  // 运行演示测试
  for (let i = 0; i < DEMO_FIGMA_URLS.length; i++) {
    const url = DEMO_FIGMA_URLS[i];
    console.log(`📋 演示测试 ${i + 1}/${DEMO_FIGMA_URLS.length}`);
    console.log(`🔗 URL: ${url}`);
    console.log('');
    
    try {
      await runAutoLayoutTest(url);
      console.log('✅ 演示测试完成\n');
    } catch (error) {
      console.error('❌ 演示测试失败:', error.message);
      console.log('');
    }
    
    // 如果有多个测试，添加间隔
    if (i < DEMO_FIGMA_URLS.length - 1) {
      console.log('-'.repeat(60));
      console.log('');
    }
  }
  
  console.log('🎉 所有演示测试完成！');
  console.log('📊 查看生成的报告: test/reports/');
}

// 运行演示
if (require.main === module) {
  runDemo().catch(error => {
    console.error('演示测试失败:', error);
    process.exit(1);
  });
} 