/**
 * Frame Selection + Flatten 功能演示测试
 * 
 * 这是一个简单的测试脚本，展示新增的测试和修复按钮功能
 */

console.log('=== Frame Selection + Flatten 功能测试 ===');

// 模拟测试数据
const testNodes = [
  {
    id: 'test-group-1',
    name: 'Button Group',
    type: 'GROUP',
    children: [
      { type: 'RECTANGLE', name: 'Background' },
      { type: 'TEXT', name: 'Label' },
      { type: 'VECTOR', name: 'Icon' }
    ]
  },
  {
    id: 'test-frame-1',
    name: 'Container Frame',
    type: 'FRAME',
    layoutMode: 'NONE',
    children: [
      { type: 'FRAME', name: 'Header' },
      { type: 'FRAME', name: 'Content' },
      { type: 'FRAME', name: 'Footer' }
    ]
  },
  {
    id: 'test-group-2',
    name: 'Navigation Group',
    type: 'GROUP',
    children: [
      { type: 'COMPONENT', name: 'Logo' },
      { type: 'FRAME', name: 'Menu Items' }
    ]
  }
];

// 模拟测试Frame Selection检测逻辑
function simulateTestFrameSelection(nodes) {
  console.log('\n🧪 模拟测试Frame Selection功能...');
  
  const violations = [];
  let groupCount = 0;
  let frameCount = 0;
  
  nodes.forEach(node => {
    if (node.type === 'GROUP') {
      groupCount++;
      
      // 检查Group是否应该转换为Frame
      const hasComplexChildren = node.children.some(child => 
        child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'INSTANCE'
      );
      
      if (hasComplexChildren || node.children.length >= 3) {
        violations.push({
          nodeId: node.id,
          nodeName: node.name,
          type: 'GROUP',
          violations: [
            '此Group包含复杂子元素，建议转换为Frame以获得更好的布局控制',
            `包含 ${node.children.length} 个子元素，其中有复杂组件`
          ],
          suggestions: [
            '使用Frame Selection + Flatten命令将Group转换为Frame',
            '转换后可以启用自动布局功能',
            '提高设计的可维护性和响应式布局能力'
          ]
        });
      }
    } else if (node.type === 'FRAME') {
      frameCount++;
      
      // 检查Frame是否启用了自动布局
      if (node.layoutMode === 'NONE' && node.children.length >= 2) {
        violations.push({
          nodeId: node.id,
          nodeName: node.name,
          type: 'FRAME',
          violations: [
            'Frame未启用自动布局，可能影响响应式设计',
            `包含 ${node.children.length} 个子元素但使用绝对定位`
          ],
          suggestions: [
            '启用自动布局以获得更好的响应式效果',
            '考虑使用水平或垂直排列方式',
            '设置适当的间距和对齐方式'
          ]
        });
      }
    }
  });
  
  const message = violations.length === 0 
    ? `✅ Frame Selection测试通过！检查了 ${groupCount} 个Group和 ${frameCount} 个Frame，未发现问题。`
    : `🧪 Frame Selection测试完成：发现 ${violations.length} 个问题需要处理。共检查了 ${groupCount} 个Group和 ${frameCount} 个Frame。`;
  
  console.log(message);
  
  if (violations.length > 0) {
    console.log('\n问题详情:');
    violations.forEach((violation, index) => {
      console.log(`${index + 1}. ${violation.nodeName} (${violation.type})`);
      console.log('   问题:');
      violation.violations.forEach(v => console.log(`   - ${v}`));
      console.log('   建议:');
      violation.suggestions.forEach(s => console.log(`   - ${s}`));
      console.log('');
    });
  }
  
  return { violations, message };
}

// 模拟修复Frame Selection功能
function simulateFixFrameSelection(nodes) {
  console.log('\n🔧 模拟修复Frame Selection功能...');
  
  const results = [];
  let fixedCount = 0;
  let errorCount = 0;
  
  nodes.forEach(node => {
    try {
      if (node.type === 'GROUP') {
        // 模拟将Group转换为Frame
        console.log(`转换 Group "${node.name}" 为 Frame...`);
        results.push(`✅ ${node.name}: Group转换为Frame并启用自动布局`);
        fixedCount++;
      } else if (node.type === 'FRAME' && node.layoutMode === 'NONE') {
        // 模拟为Frame启用自动布局
        console.log(`为 Frame "${node.name}" 启用自动布局...`);
        results.push(`✅ ${node.name}: Frame启用自动布局`);
        fixedCount++;
      } else {
        results.push(`ℹ️ ${node.name}: 无需修复`);
      }
    } catch (error) {
      results.push(`❌ ${node.name}: 修复失败 - ${error.message}`);
      errorCount++;
    }
  });
  
  const message = errorCount === 0 
    ? `🔧 Frame Selection修复完成！成功处理了 ${fixedCount} 个节点。`
    : `🔧 Frame Selection修复完成：成功 ${fixedCount} 个，失败 ${errorCount} 个。详情请查看结果列表。`;
  
  console.log(message);
  
  if (results.length > 0) {
    console.log('\n修复详情:');
    results.forEach(result => console.log(`  ${result}`));
  }
  
  return { results, message, fixedCount, errorCount };
}

// 运行测试
console.log('测试数据:');
testNodes.forEach((node, index) => {
  console.log(`${index + 1}. ${node.name} (${node.type}) - ${node.children.length} 个子元素`);
});

// 执行测试
const testResults = simulateTestFrameSelection(testNodes);
const fixResults = simulateFixFrameSelection(testNodes);

console.log('\n=== 测试总结 ===');
console.log(`发现问题: ${testResults.violations.length} 个`);
console.log(`修复成功: ${fixResults.fixedCount} 个`);
console.log(`修复失败: ${fixResults.errorCount} 个`);

console.log('\n=== UI按钮功能说明 ===');
console.log('🧪 测试Frame Selection - 分析节点结构，检测需要转换的Group和需要启用自动布局的Frame');
console.log('🔧 修复Frame Selection - 执行实际的转换和修复操作');
console.log('⚡ 智能修复 - 综合性修复，包括Frame Selection + Flatten + 其他优化');

console.log('\n测试完成！'); 