// 可视化几何分组算法测试
// 输出ASCII图形来直观显示分组前后的结构

console.log('🎨 可视化几何分组算法测试\n');

// 测试数据：卡片布局
const cardLayoutData = [
  { id: 'price', name: 'Price', x: 40, y: 380, width: 100, height: 30 },
  { id: 'image', name: 'Product Image', x: 40, y: 40, width: 320, height: 200 },
  { id: 'button', name: 'Buy Button', x: 260, y: 380, width: 100, height: 40 },
  { id: 'title', name: 'Product Title', x: 40, y: 260, width: 320, height: 30 },
  { id: 'desc', name: 'Product Description', x: 40, y: 300, width: 320, height: 60 },
  { id: 'container', name: 'Card Container', x: 20, y: 20, width: 360, height: 460 },
];

// 重叠冲突测试数据
const overlapConflictData = [
  { id: 'base', name: 'Base Container', x: 20, y: 20, width: 300, height: 300 },
  { id: 'normal', name: 'Normal Element', x: 40, y: 40, width: 120, height: 80 },
  { id: 'independent', name: 'Independent Element', x: 40, y: 200, width: 120, height: 80 },
  { id: 'overlap1', name: 'Overlap Element 1', x: 350, y: 150, width: 80, height: 80 },
  { id: 'overlap2', name: 'Overlap Element 2', x: 380, y: 180, width: 80, height: 80 },
];

// 创建ASCII画布
function createCanvas(width, height, scale = 10) {
  const canvasWidth = Math.ceil(width / scale);
  const canvasHeight = Math.ceil(height / scale);
  const canvas = Array(canvasHeight).fill().map(() => Array(canvasWidth).fill(' '));
  return { canvas, scale, canvasWidth, canvasHeight };
}

// 在画布上绘制矩形
function drawRect(canvasData, element, char = '█', label = '') {
  const { canvas, scale } = canvasData;
  const startX = Math.floor(element.x / scale);
  const startY = Math.floor(element.y / scale);
  const endX = Math.min(Math.floor((element.x + element.width) / scale), canvas[0].length - 1);
  const endY = Math.min(Math.floor((element.y + element.height) / scale), canvas.length - 1);
  
  // 绘制边框
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      if (y >= 0 && y < canvas.length && x >= 0 && x < canvas[0].length) {
        if (y === startY || y === endY || x === startX || x === endX) {
          canvas[y][x] = char;
        }
      }
    }
  }
  
  // 添加标签
  if (label && startY + 1 < canvas.length && startX + 1 < canvas[0].length) {
    const labelChars = label.slice(0, Math.min(label.length, endX - startX - 1));
    for (let i = 0; i < labelChars.length; i++) {
      if (startX + 1 + i < canvas[0].length) {
        canvas[startY + 1][startX + 1 + i] = labelChars[i];
      }
    }
  }
}

// 渲染画布
function renderCanvas(canvasData, title) {
  const { canvas, canvasWidth, canvasHeight } = canvasData;
  console.log(`\n${title}`);
  console.log('═'.repeat(canvasWidth + 2));
  
  for (let y = 0; y < canvasHeight; y++) {
    console.log('║' + canvas[y].join('') + '║');
  }
  console.log('═'.repeat(canvasWidth + 2));
}

// 可视化元素列表
function visualizeElementList(elements, title) {
  console.log(`\n${title}`);
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│ ID          │ Name                │ Position    │ Size    │');
  console.log('├─────────────────────────────────────────────────────────┤');
  
  elements.forEach((elem, index) => {
    const id = elem.id.padEnd(11);
    const name = elem.name.slice(0, 19).padEnd(19);
    const pos = `(${elem.x},${elem.y})`.padEnd(11);
    const size = `${elem.width}×${elem.height}`.padEnd(8);
    console.log(`│ ${id} │ ${name} │ ${pos} │ ${size} │`);
  });
  
  console.log('└─────────────────────────────────────────────────────────┘');
}

// 几何分组算法（简化版）
function performGeometricGrouping(elements) {
  const elementsWithBounds = elements.map(elem => ({
    ...elem,
    bounds: {
      minX: elem.x,
      minY: elem.y,
      maxX: elem.x + elem.width,
      maxY: elem.y + elem.height
    }
  }));
  
  // 识别包含关系
  const parentChildRelations = [];
  const conflictElements = new Set();
  
  for (let i = 0; i < elementsWithBounds.length; i++) {
    for (let j = 0; j < elementsWithBounds.length; j++) {
      if (i === j) continue;
      
      const elem1 = elementsWithBounds[i];
      const elem2 = elementsWithBounds[j];
      
      // 检查包含关系
      if (isElementContained(elem1.bounds, elem2.bounds)) {
        parentChildRelations.push({ parent: elem1, child: elem2 });
      }
    }
  }
  
  // 检查重叠冲突
  for (let i = 0; i < elementsWithBounds.length; i++) {
    for (let j = i + 1; j < elementsWithBounds.length; j++) {
      const elem1 = elementsWithBounds[i];
      const elem2 = elementsWithBounds[j];
      
      if (hasPartialOverlap(elem1.bounds, elem2.bounds)) {
        const hasContainmentRelation = parentChildRelations.some(relation => 
          (relation.parent.id === elem1.id && relation.child.id === elem2.id) ||
          (relation.parent.id === elem2.id && relation.child.id === elem1.id)
        );
        
        if (!hasContainmentRelation) {
          conflictElements.add(elem1.id);
          conflictElements.add(elem2.id);
        }
      }
    }
  }
  
  // 构建分组
  const validRelations = parentChildRelations.filter(relation => 
    !conflictElements.has(relation.parent.id) && !conflictElements.has(relation.child.id)
  );
  
  const directRelations = findDirectParentChildRelations(validRelations);
  const childrenMap = new Map();
  
  for (const relation of directRelations) {
    if (!childrenMap.has(relation.parent.id)) {
      childrenMap.set(relation.parent.id, []);
    }
    childrenMap.get(relation.parent.id).push(relation.child);
  }
  
  const groups = [];
  const rootElements = elementsWithBounds.filter(elem => 
    !directRelations.some(r => r.child.id === elem.id) && !conflictElements.has(elem.id)
  );
  
  for (const rootElement of rootElements) {
    const children = childrenMap.get(rootElement.id) || [];
    if (children.length > 0) {
      groups.push({
        element: rootElement,
        directChildren: children,
        layoutDirection: detectLayoutDirection(children)
      });
    }
  }
  
  return {
    groups,
    conflicts: elementsWithBounds.filter(e => conflictElements.has(e.id)),
    relations: directRelations
  };
}

// 辅助函数
function isElementContained(containerBounds, elementBounds) {
  return containerBounds.minX <= elementBounds.minX &&
         containerBounds.minY <= elementBounds.minY &&
         containerBounds.maxX >= elementBounds.maxX &&
         containerBounds.maxY >= elementBounds.maxY;
}

function hasPartialOverlap(bounds1, bounds2) {
  const hasOverlap = !(bounds1.maxX <= bounds2.minX || 
                      bounds2.maxX <= bounds1.minX || 
                      bounds1.maxY <= bounds2.minY || 
                      bounds2.maxY <= bounds1.minY);
  const isContained1 = isElementContained(bounds1, bounds2);
  const isContained2 = isElementContained(bounds2, bounds1);
  
  return hasOverlap && !isContained1 && !isContained2;
}

function findDirectParentChildRelations(relations) {
  const directRelations = [];
  
  for (const relation of relations) {
    let isDirect = true;
    
    for (const otherRelation of relations) {
      if (otherRelation === relation) continue;
      
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

function detectLayoutDirection(elements) {
  if (elements.length < 2) return 'VERTICAL';
  
  let horizontalGaps = 0;
  let verticalGaps = 0;
  
  for (let i = 0; i < elements.length - 1; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const elem1 = elements[i];
      const elem2 = elements[j];
      
      const horizontalGap = Math.max(0, Math.max(elem1.bounds.minX - elem2.bounds.maxX, elem2.bounds.minX - elem1.bounds.maxX));
      const verticalOverlap = Math.min(elem1.bounds.maxY, elem2.bounds.maxY) - Math.max(elem1.bounds.minY, elem2.bounds.minY);
      
      if (horizontalGap < 100 && verticalOverlap > 0) {
        horizontalGaps++;
      }
      
      const verticalGap = Math.max(0, Math.max(elem1.bounds.minY - elem2.bounds.maxY, elem2.bounds.minY - elem1.bounds.maxY));
      const horizontalOverlap = Math.min(elem1.bounds.maxX, elem2.bounds.maxX) - Math.max(elem1.bounds.minX, elem2.bounds.minX);
      
      if (verticalGap < 100 && horizontalOverlap > 0) {
        verticalGaps++;
      }
    }
  }
  
  return horizontalGaps > verticalGaps ? 'HORIZONTAL' : 'VERTICAL';
}

// 可视化分组结果
function visualizeGroupingResult(result, title) {
  console.log(`\n${title}`);
  console.log('═'.repeat(60));

  if (result.groups.length === 0) {
    console.log('📭 没有发现分组');
  } else {
    result.groups.forEach((group, index) => {
      const icon = group.layoutDirection === 'HORIZONTAL' ? '↔️' : '↕️';
      console.log(`\n📦 分组 ${index + 1}: ${icon} ${group.element.name} (${group.layoutDirection})`);
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log('│ 父元素: ' + group.element.name.padEnd(47) + '│');
      console.log('├─────────────────────────────────────────────────────────┤');
      console.log('│ 子元素:' + ' '.repeat(49) + '│');

      group.directChildren.forEach((child, childIndex) => {
        const childInfo = `  ${childIndex + 1}. ${child.name}`;
        console.log('│ ' + childInfo.padEnd(55) + '│');
      });

      console.log('├─────────────────────────────────────────────────────────┤');
      console.log('│ 布局方向: ' + group.layoutDirection.padEnd(45) + '│');
      console.log('│ 元素总数: ' + (group.directChildren.length + 1).toString().padEnd(45) + '│');
      console.log('└─────────────────────────────────────────────────────────┘');
    });
  }

  if (result.conflicts.length > 0) {
    console.log('\n⚠️ 冲突元素:');
    console.log('┌─────────────────────────────────────────────────────────┐');
    result.conflicts.forEach((conflict, index) => {
      const conflictInfo = `  ${index + 1}. ${conflict.name} (部分重叠)`;
      console.log('│ ' + conflictInfo.padEnd(55) + '│');
    });
    console.log('└─────────────────────────────────────────────────────────┘');
  }

  console.log(`\n📊 统计信息:`);
  console.log(`  - 分组数量: ${result.groups.length}`);
  console.log(`  - 冲突元素: ${result.conflicts.length}`);
  console.log(`  - 父子关系: ${result.relations.length}`);
}

// 可视化几何关系
function visualizeGeometricRelations(elements, result) {
  console.log('\n🔍 几何关系分析:');
  console.log('═'.repeat(60));

  // 显示包含关系
  if (result.relations.length > 0) {
    console.log('\n📦 包含关系:');
    result.relations.forEach((relation, index) => {
      console.log(`  ${index + 1}. ${relation.parent.name} ⊃ ${relation.child.name}`);
    });
  }

  // 显示冲突关系
  if (result.conflicts.length > 0) {
    console.log('\n⚠️ 重叠冲突:');
    for (let i = 0; i < result.conflicts.length; i++) {
      for (let j = i + 1; j < result.conflicts.length; j++) {
        const elem1 = result.conflicts[i];
        const elem2 = result.conflicts[j];
        if (hasPartialOverlap(elem1.bounds, elem2.bounds)) {
          console.log(`  • ${elem1.name} ⚡ ${elem2.name}`);
        }
      }
    }
  }
}

// 运行可视化测试
function runVisualTest(testName, data) {
  console.log('\n' + '🎨'.repeat(20));
  console.log(`🧪 ${testName} 可视化测试`);
  console.log('🎨'.repeat(20));

  // 1. 显示原始数据
  visualizeElementList(data, '📥 原始数据 (未分组)');

  // 2. 创建几何布局图
  const maxX = Math.max(...data.map(e => e.x + e.width));
  const maxY = Math.max(...data.map(e => e.y + e.height));
  const canvasData = createCanvas(maxX + 50, maxY + 50, 10);

  // 绘制所有元素
  const colors = ['█', '▓', '▒', '░', '▪', '▫', '●', '○'];
  data.forEach((element, index) => {
    const char = colors[index % colors.length];
    const label = element.id.slice(0, 3);
    drawRect(canvasData, element, char, label);
  });

  renderCanvas(canvasData, '🗺️ 几何布局图 (比例 1:10)');

  // 3. 执行分组算法
  console.log('\n🔍 执行几何分组算法...');
  const result = performGeometricGrouping(data);

  // 4. 显示几何关系
  visualizeGeometricRelations(data, result);

  // 5. 显示分组结果
  visualizeGroupingResult(result, '📊 分组结果');

  // 6. 创建分组后的结构图
  console.log('\n🏗️ 分组后的层级结构:');
  if (result.groups.length > 0) {
    result.groups.forEach((group, index) => {
      console.log(`\n分组 ${index + 1}:`);
      console.log('┌─ ' + group.element.name);
      group.directChildren.forEach((child, childIndex) => {
        const isLast = childIndex === group.directChildren.length - 1;
        const prefix = isLast ? '└─' : '├─';
        console.log(`${prefix} ${child.name}`);
      });
    });
  }

  return result;
}

// 执行测试
console.log('🚀 开始可视化几何分组测试\n');

// 测试1: 卡片布局
const cardResult = runVisualTest('卡片布局', cardLayoutData);

// 测试2: 重叠冲突
const conflictResult = runVisualTest('重叠冲突', overlapConflictData);

console.log('\n' + '✨'.repeat(20));
console.log('🎉 可视化测试完成！');
console.log('✨'.repeat(20));

console.log('\n📋 测试总结:');
console.log(`- 卡片布局: ${cardResult.groups.length} 个分组, ${cardResult.conflicts.length} 个冲突`);
console.log(`- 重叠冲突: ${conflictResult.groups.length} 个分组, ${conflictResult.conflicts.length} 个冲突`);
console.log('\n🔍 通过可视化输出，你可以验证:');
console.log('  ✅ 包含关系是否正确识别');
console.log('  ✅ 重叠冲突是否准确检测');
console.log('  ✅ 分组结构是否符合预期');
console.log('  ✅ 布局方向是否正确判断');
