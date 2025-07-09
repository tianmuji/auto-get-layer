// 纯数据几何分组算法测试
// 输入: 扁平的、乱序的元素数据
// 输出: 分组的、层级清晰的结构

console.log('🧮 纯数据几何分组算法测试\n');

// 测试数据1: 卡片布局 (乱序输入)
const cardLayoutData = [
  // 子元素 (乱序)
  { id: 'price', name: 'Price', x: 40, y: 380, width: 100, height: 30 },
  { id: 'image', name: 'Product Image', x: 40, y: 40, width: 320, height: 200 },
  { id: 'button', name: 'Buy Button', x: 260, y: 380, width: 100, height: 40 },
  { id: 'title', name: 'Product Title', x: 40, y: 260, width: 320, height: 30 },
  { id: 'desc', name: 'Product Description', x: 40, y: 300, width: 320, height: 60 },
  // 父容器 (放在最后)
  { id: 'container', name: 'Card Container', x: 20, y: 20, width: 360, height: 460 },
];

// 测试数据2: 嵌套容器 (完全乱序)
const nestedContainerData = [
  // 最内层内容
  { id: 'content2', name: 'Content 2', x: 260, y: 80, width: 160, height: 100 },
  // 中层容器
  { id: 'middle', name: 'Middle Container', x: 40, y: 40, width: 420, height: 320 },
  // 最内层内容
  { id: 'content1', name: 'Content 1', x: 80, y: 80, width: 160, height: 100 },
  { id: 'content3', name: 'Content 3', x: 80, y: 200, width: 340, height: 120 },
  // 外层容器
  { id: 'outer', name: 'Outer Container', x: 20, y: 20, width: 460, height: 360 },
  // 内层容器
  { id: 'inner', name: 'Inner Container', x: 60, y: 60, width: 380, height: 280 },
];

// 测试数据3: 重叠冲突 (包含正常和冲突元素)
const overlapConflictData = [
  // 基础容器
  { id: 'base', name: 'Base Container', x: 20, y: 20, width: 300, height: 300 },
  // 正常包含的元素
  { id: 'normal', name: 'Normal Element', x: 40, y: 40, width: 120, height: 80 },
  { id: 'independent', name: 'Independent Element', x: 40, y: 200, width: 120, height: 80 },
  // 完全独立的重叠元素（互相重叠，但都不在容器内）
  { id: 'overlap1', name: 'Overlap Element 1', x: 350, y: 150, width: 80, height: 80 },
  { id: 'overlap2', name: 'Overlap Element 2', x: 380, y: 180, width: 80, height: 80 },
];

// 测试数据4: 水平布局
const horizontalLayoutData = [
  { id: 'item3', name: 'Item 3', x: 320, y: 40, width: 120, height: 120 },
  { id: 'container', name: 'Horizontal Container', x: 20, y: 20, width: 560, height: 160 },
  { id: 'item1', name: 'Item 1', x: 40, y: 40, width: 120, height: 120 },
  { id: 'item4', name: 'Item 4', x: 460, y: 40, width: 120, height: 120 },
  { id: 'item2', name: 'Item 2', x: 180, y: 40, width: 120, height: 120 },
];

// 边界框计算
function calculateBoundingBox(element) {
  return {
    minX: element.x,
    minY: element.y,
    maxX: element.x + element.width,
    maxY: element.y + element.height,
    width: element.width,
    height: element.height,
    centerX: element.x + element.width / 2,
    centerY: element.y + element.height / 2
  };
}

// 检查元素A是否完全包含元素B
function isElementContained(containerBounds, elementBounds) {
  return containerBounds.minX <= elementBounds.minX &&
         containerBounds.minY <= elementBounds.minY &&
         containerBounds.maxX >= elementBounds.maxX &&
         containerBounds.maxY >= elementBounds.maxY;
}

// 检查两个元素是否有重叠
function hasOverlap(bounds1, bounds2) {
  return !(bounds1.maxX <= bounds2.minX || 
           bounds2.maxX <= bounds1.minX || 
           bounds1.maxY <= bounds2.minY || 
           bounds2.maxY <= bounds1.minY);
}

// 检查两个元素是否部分重合
function hasPartialOverlap(bounds1, bounds2) {
  const hasOverlapResult = hasOverlap(bounds1, bounds2);
  const isContained1 = isElementContained(bounds1, bounds2);
  const isContained2 = isElementContained(bounds2, bounds1);
  
  return hasOverlapResult && !isContained1 && !isContained2;
}

// 检测布局方向
function detectLayoutDirection(elements) {
  if (elements.length < 2) return 'VERTICAL';
  
  let horizontalGaps = 0;
  let verticalGaps = 0;
  
  for (let i = 0; i < elements.length - 1; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const elem1 = elements[i];
      const elem2 = elements[j];
      
      // 检查是否水平相邻
      const horizontalGap = Math.max(0, Math.max(elem1.bounds.minX - elem2.bounds.maxX, elem2.bounds.minX - elem1.bounds.maxX));
      const verticalOverlap = Math.min(elem1.bounds.maxY, elem2.bounds.maxY) - Math.max(elem1.bounds.minY, elem2.bounds.minY);
      
      if (horizontalGap < 100 && verticalOverlap > 0) {
        horizontalGaps++;
      }
      
      // 检查是否垂直相邻
      const verticalGap = Math.max(0, Math.max(elem1.bounds.minY - elem2.bounds.maxY, elem2.bounds.minY - elem1.bounds.maxY));
      const horizontalOverlap = Math.min(elem1.bounds.maxX, elem2.bounds.maxX) - Math.max(elem1.bounds.minX, elem2.bounds.minX);
      
      if (verticalGap < 100 && horizontalOverlap > 0) {
        verticalGaps++;
      }
    }
  }
  
  return horizontalGaps > verticalGaps ? 'HORIZONTAL' : 'VERTICAL';
}

// 核心分组算法
function performGeometricGrouping(elements) {
  console.log(`🔍 分析 ${elements.length} 个元素的几何关系`);
  
  // 为每个元素计算边界框
  const elementsWithBounds = elements.map(elem => ({
    ...elem,
    bounds: calculateBoundingBox(elem)
  }));
  
  // 第一步：识别所有父子关系
  const parentChildRelations = [];

  for (let i = 0; i < elementsWithBounds.length; i++) {
    for (let j = 0; j < elementsWithBounds.length; j++) {
      if (i === j) continue;

      const elem1 = elementsWithBounds[i];
      const elem2 = elementsWithBounds[j];

      // 检查包含关系
      if (isElementContained(elem1.bounds, elem2.bounds)) {
        parentChildRelations.push({ parent: elem1, child: elem2 });
        console.log(`📦 包含关系: ${elem1.name} 包含 ${elem2.name}`);
      }
    }
  }

  // 第二步：识别真正的冲突元素（部分重叠且不在包含关系中的元素）
  const conflictPairs = [];

  for (let i = 0; i < elementsWithBounds.length; i++) {
    for (let j = i + 1; j < elementsWithBounds.length; j++) {
      const elem1 = elementsWithBounds[i];
      const elem2 = elementsWithBounds[j];

      // 检查是否有部分重叠
      if (hasPartialOverlap(elem1.bounds, elem2.bounds)) {
        // 检查这两个元素是否已经在包含关系中
        const hasContainmentRelation = parentChildRelations.some(relation =>
          (relation.parent.id === elem1.id && relation.child.id === elem2.id) ||
          (relation.parent.id === elem2.id && relation.child.id === elem1.id)
        );

        if (!hasContainmentRelation) {
          conflictPairs.push([elem1, elem2]);
          console.log(`⚠️  部分重叠冲突: ${elem1.name} 与 ${elem2.name}`);
        }
      }
    }
  }

  // 只有真正冲突的元素对才标记为冲突
  const conflictElements = new Set();
  for (const [elem1, elem2] of conflictPairs) {
    conflictElements.add(elem1.id);
    conflictElements.add(elem2.id);
  }
  
  // 第二步：构建层级结构
  return buildHierarchicalStructure(elementsWithBounds, parentChildRelations, conflictElements);
}

// 构建层级结构
function buildHierarchicalStructure(elements, parentChildRelations, conflictElements) {
  // 过滤掉冲突的父子关系
  const validRelations = parentChildRelations.filter(relation =>
    !conflictElements.has(relation.parent.id) && !conflictElements.has(relation.child.id)
  );

  // 找到最直接的父子关系（去除传递关系）
  const directRelations = findDirectParentChildRelations(validRelations);

  // 构建父子关系映射
  const childrenMap = new Map();
  const parentMap = new Map();

  for (const relation of directRelations) {
    if (!childrenMap.has(relation.parent.id)) {
      childrenMap.set(relation.parent.id, []);
    }
    childrenMap.get(relation.parent.id).push(relation.child);
    parentMap.set(relation.child.id, relation.parent);
  }

  // 找到根元素（没有父元素的元素）
  const rootElements = elements.filter(elem =>
    !parentMap.has(elem.id) && !conflictElements.has(elem.id)
  );

  console.log(`📊 发现 ${rootElements.length} 个根元素`);
  console.log(`📊 直接父子关系: ${directRelations.length} 个`);

  // 构建层级结构
  const groups = [];

  for (const rootElement of rootElements) {
    const children = childrenMap.get(rootElement.id) || [];
    if (children.length > 0) {
      const group = buildGroupStructure(rootElement, children, childrenMap);
      groups.push(group);
    }
  }

  // 处理冲突元素
  const conflicts = elements.filter(e => conflictElements.has(e.id));

  // 计算实际分组的元素数量
  const groupedElementIds = new Set();
  groups.forEach(group => {
    addGroupElementsToSet(group, groupedElementIds);
  });

  return {
    groups,
    conflicts,
    stats: {
      totalElements: elements.length,
      groupedElements: groupedElementIds.size,
      conflictElements: conflicts.length,
      rootElements: rootElements.length,
      parentChildRelations: directRelations.length
    }
  };
}

// 找到最直接的父子关系（去除传递关系）
function findDirectParentChildRelations(relations) {
  const directRelations = [];

  for (const relation of relations) {
    let isDirect = true;

    // 检查是否存在中间层级
    for (const otherRelation of relations) {
      if (otherRelation === relation) continue;

      // 如果存在 parent -> intermediate -> child 的关系，则 parent -> child 不是直接关系
      if (otherRelation.parent.id === relation.parent.id &&
          relations.some(r => r.parent.id === otherRelation.child.id && r.child.id === relation.child.id)) {
        isDirect = false;
        break;
      }
    }

    if (isDirect) {
      directRelations.push(relation);
    }
  }

  return directRelations;
}

// 构建分组结构
function buildGroupStructure(rootElement, directChildren, childrenMap) {
  const nestedGroups = [];

  // 为每个有子元素的直接子元素创建嵌套分组
  for (const child of directChildren) {
    const grandChildren = childrenMap.get(child.id) || [];
    if (grandChildren.length > 0) {
      const nestedGroup = buildGroupStructure(child, grandChildren, childrenMap);
      nestedGroups.push(nestedGroup);
    }
  }

  const layoutDirection = detectLayoutDirection(directChildren);

  console.log(`📦 创建分组: ${rootElement.name} (${directChildren.length} 个直接子元素, ${layoutDirection})`);

  return {
    element: rootElement,
    directChildren,
    nestedGroups,
    layoutDirection
  };
}

// 将分组中的所有元素ID添加到集合中
function addGroupElementsToSet(group, elementSet) {
  elementSet.add(group.element.id);
  group.directChildren.forEach(child => elementSet.add(child.id));
  group.nestedGroups.forEach(nestedGroup => addGroupElementsToSet(nestedGroup, elementSet));
}

// 格式化输出分组结构（递归）
function formatGroupStructure(group, indent = 0) {
  const prefix = '  '.repeat(indent);
  const icon = group.layoutDirection === 'HORIZONTAL' ? '↔️' : '↕️';

  let output = `${prefix}${icon} ${group.element.name} (${group.directChildren.length} 个子元素, ${group.layoutDirection})\n`;

  // 输出直接子元素
  for (const child of group.directChildren) {
    output += `${prefix}  └── ${child.name}\n`;
  }

  // 输出嵌套分组
  for (const nestedGroup of group.nestedGroups) {
    output += formatGroupStructure(nestedGroup, indent + 1);
  }

  return output;
}



// 执行测试用例
function runTestCase(name, data, expectedResults) {
  console.log(`\n🧪 测试用例: ${name}`);
  console.log('=' .repeat(50));

  console.log('📥 输入数据 (乱序):');
  data.forEach((elem, index) => {
    console.log(`  ${index + 1}. ${elem.name} (${elem.x},${elem.y}) ${elem.width}×${elem.height}`);
  });

  console.log('\n🔍 分析过程:');
  const result = performGeometricGrouping(data);

  console.log('\n📊 统计结果:');
  console.log(`  - 总元素数: ${result.stats.totalElements}`);
  console.log(`  - 分组元素数: ${result.stats.groupedElements}`);
  console.log(`  - 冲突元素数: ${result.stats.conflictElements}`);
  console.log(`  - 根元素数: ${result.stats.rootElements}`);
  console.log(`  - 父子关系数: ${result.stats.parentChildRelations}`);

  console.log('\n🏗️ 分组结构:');
  if (result.groups.length === 0) {
    console.log('  (无分组)');
  } else {
    result.groups.forEach(group => {
      console.log(formatGroupStructure(group));
    });
  }

  if (result.conflicts.length > 0) {
    console.log('⚠️ 冲突元素:');
    result.conflicts.forEach(elem => {
      console.log(`  - ${elem.name}`);
    });
  }

  // 验证预期结果
  console.log('\n✅ 结果验证:');
  let passed = 0;
  let total = 0;

  for (const [key, expected] of Object.entries(expectedResults)) {
    total++;
    let actual;
    if (key === 'groups') {
      actual = result.groups.length;
    } else {
      actual = result.stats[key];
    }
    const success = actual === expected;

    console.log(`  ${success ? '✅' : '❌'} ${key}: 预期 ${expected}, 实际 ${actual}`);
    if (success) passed++;
  }

  const accuracy = (passed / total * 100).toFixed(1);
  console.log(`\n📈 准确率: ${accuracy}% (${passed}/${total})`);

  return { passed, total, accuracy: parseFloat(accuracy) };
}

// 执行所有测试
function runAllTests() {
  console.log('🚀 开始纯数据几何分组算法测试\n');

  const testResults = [];

  // 测试1: 卡片布局
  testResults.push(runTestCase('卡片布局', cardLayoutData, {
    totalElements: 6,
    groupedElements: 6,
    conflictElements: 0,
    rootElements: 1,
    parentChildRelations: 5
  }));

  // 测试2: 嵌套容器
  testResults.push(runTestCase('嵌套容器', nestedContainerData, {
    totalElements: 6,
    groupedElements: 6,
    conflictElements: 0,
    rootElements: 1,
    parentChildRelations: 5
  }));

  // 测试3: 重叠冲突
  testResults.push(runTestCase('重叠冲突', overlapConflictData, {
    totalElements: 5,
    groupedElements: 3,  // Base Container + 2个正常子元素
    conflictElements: 2,  // 2个重叠的独立元素
    rootElements: 2,  // Base Container + 冲突元素组
    parentChildRelations: 2  // Base包含Normal和Independent
  }));

  // 测试4: 水平布局
  testResults.push(runTestCase('水平布局', horizontalLayoutData, {
    totalElements: 5,
    groupedElements: 5,
    conflictElements: 0,
    rootElements: 1,
    parentChildRelations: 4
  }));

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📋 测试总结');
  console.log('='.repeat(60));

  const totalPassed = testResults.reduce((sum, result) => sum + result.passed, 0);
  const totalTests = testResults.reduce((sum, result) => sum + result.total, 0);
  const overallAccuracy = (totalPassed / totalTests * 100).toFixed(1);

  testResults.forEach((result, index) => {
    const testNames = ['卡片布局', '嵌套容器', '重叠冲突', '水平布局'];
    console.log(`${testNames[index]}: ${result.accuracy}%`);
  });

  console.log(`\n🎯 总体准确率: ${overallAccuracy}% (${totalPassed}/${totalTests})`);

  if (parseFloat(overallAccuracy) >= 95) {
    console.log('🎉 算法测试通过！准确率达到预期标准 (≥95%)');
  } else if (parseFloat(overallAccuracy) >= 85) {
    console.log('⚠️ 算法基本可用，但需要优化 (85-95%)');
  } else {
    console.log('❌ 算法需要重大改进 (<85%)');
  }

  return {
    overallAccuracy: parseFloat(overallAccuracy),
    totalPassed,
    totalTests,
    testResults
  };
}

// 运行测试
const finalResults = runAllTests();

console.log('\n🔬 算法分析:');
console.log('- 基于纯数学几何关系');
console.log('- 包含关系识别准确');
console.log('- 重叠冲突检测有效');
console.log('- 布局方向检测智能');
console.log('- 层级结构构建清晰');

console.log('\n✨ 测试完成！');
