// 纯数学几何分组算法 - Figma插件
figma.showUI(__html__, { width: 380, height: 520 });

// 类型定义
interface ElementInfo {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  node: SceneNode;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface ElementWithBounds extends ElementInfo {
  bounds: BoundingBox;
}

interface GroupInfo {
  name: string;
  elements: ElementInfo[];
  position: { x: number; y: number; width: number; height: number };
  layoutDirection?: 'HORIZONTAL' | 'VERTICAL';
}

interface GroupingResult {
  originalCount: number;
  groupedCount: number;
  groups: Array<{
    name: string;
    elements: ElementInfo[];
    position: { x: number; y: number; width: number; height: number };
    layoutDirection?: 'HORIZONTAL' | 'VERTICAL';
  }>;
  ungroupedElements: ElementInfo[];
  conflictElements: ElementInfo[];
}

// 消息处理
figma.ui.onmessage = async (msg) => {
  console.log('收到消息:', msg.type);

  if (msg.type === 'apply-geometric-grouping') {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'grouping-result',
        result: {
          success: false,
          message: '❌ 请先选择要分组的节点'
        }
      });
      return;
    }

    try {
      const result = await applyGeometricGrouping(selection);
      figma.ui.postMessage({
        type: 'grouping-result',
        result: result
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'grouping-result',
        result: {
          success: false,
          message: '❌ 分组失败',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  if (msg.type === 'create-test-case') {
    try {
      await createTestCase(msg.testType);
      figma.ui.postMessage({
        type: 'test-case-created',
        result: {
          success: true,
          message: `✅ 测试用例 "${msg.testType}" 创建成功`
        }
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'test-case-created',
        result: {
          success: false,
          message: '❌ 测试用例创建失败',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
};

// 计算元素边界框
function calculateBoundingBox(element: ElementInfo): BoundingBox {
  const minX = element.x;
  const minY = element.y;
  const maxX = element.x + element.width;
  const maxY = element.y + element.height;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: element.width,
    height: element.height,
    centerX: minX + element.width / 2,
    centerY: minY + element.height / 2
  };
}

// 计算联合边界框
function calculateUnionBounds(elements: ElementWithBounds[]): BoundingBox {
  if (elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  const minX = Math.min(...elements.map(e => e.bounds.minX));
  const minY = Math.min(...elements.map(e => e.bounds.minY));
  const maxX = Math.max(...elements.map(e => e.bounds.maxX));
  const maxY = Math.max(...elements.map(e => e.bounds.maxY));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: minX + (maxX - minX) / 2,
    centerY: minY + (maxY - minY) / 2
  };
}

// 检查元素A是否完全包含元素B
function isElementContained(containerBounds: BoundingBox, elementBounds: BoundingBox): boolean {
  return containerBounds.minX <= elementBounds.minX &&
         containerBounds.minY <= elementBounds.minY &&
         containerBounds.maxX >= elementBounds.maxX &&
         containerBounds.maxY >= elementBounds.maxY;
}

// 检查两个元素是否有重叠
function hasOverlap(bounds1: BoundingBox, bounds2: BoundingBox): boolean {
  return !(bounds1.maxX <= bounds2.minX ||
           bounds2.maxX <= bounds1.minX ||
           bounds1.maxY <= bounds2.minY ||
           bounds2.maxY <= bounds1.minY);
}

// 检查两个元素是否部分重合（有重叠但不是包含关系）
function hasPartialOverlap(bounds1: BoundingBox, bounds2: BoundingBox): boolean {
  const hasOverlapResult = hasOverlap(bounds1, bounds2);
  const isContained1 = isElementContained(bounds1, bounds2);
  const isContained2 = isElementContained(bounds2, bounds1);

  // 有重叠但不是包含关系
  return hasOverlapResult && !isContained1 && !isContained2;
}

// 检测布局方向
function detectLayoutDirection(elements: ElementWithBounds[]): 'HORIZONTAL' | 'VERTICAL' {
  if (elements.length < 2) return 'VERTICAL';

  // 计算元素间的水平和垂直间距
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

// 主要的几何分组算法
async function applyGeometricGrouping(selection: readonly SceneNode[]): Promise<{
  success: boolean;
  message: string;
  details?: string[];
  groupCount?: number;
}> {
  console.log('🔍 开始几何分组分析...');

  const details: string[] = [];
  let totalGroups = 0;

  for (const node of selection) {
    if (node.type === 'FRAME' && 'children' in node) {
      const frameNode = node as FrameNode;
      console.log(`📦 分析Frame: ${frameNode.name}`);

      // 提取所有直接子元素
      const elements: ElementInfo[] = [];
      for (const child of frameNode.children) {
        elements.push({
          id: child.id,
          name: child.name,
          type: child.type,
          x: child.x,
          y: child.y,
          width: child.width,
          height: child.height,
          node: child
        });
      }

      if (elements.length === 0) {
        details.push(`⚠️ ${frameNode.name}: 没有子元素`);
        continue;
      }

      // 执行几何分组
      const result = performGeometricGrouping(elements);

      // 创建实际的分组
      const groupsCreated = await createGroupsInFigma(frameNode, result);
      totalGroups += groupsCreated;

      details.push(`✅ ${frameNode.name}: 创建了 ${groupsCreated} 个分组`);
      details.push(`   - 包含关系: ${result.groups.length} 个`);
      details.push(`   - 冲突元素: ${result.conflictElements.length} 个`);
      details.push(`   - 独立元素: ${result.ungroupedElements.length} 个`);
    }
  }

  return {
    success: true,
    message: `✅ 几何分组完成`,
    details,
    groupCount: totalGroups
  };
}

// 执行几何分组逻辑
function performGeometricGrouping(elements: ElementInfo[]): GroupingResult {
  console.log(`🔍 分析 ${elements.length} 个元素的几何关系`);

  const elementsWithBounds: ElementWithBounds[] = elements.map(elem => ({
    ...elem,
    bounds: calculateBoundingBox(elem)
  }));

  // 第一步：识别所有父子关系和冲突
  const parentChildRelations: Array<{parent: ElementWithBounds, child: ElementWithBounds}> = [];
  const conflictElements = new Set<string>();

  for (let i = 0; i < elementsWithBounds.length; i++) {
    for (let j = 0; j < elementsWithBounds.length; j++) {
      if (i === j) continue;

      const elem1 = elementsWithBounds[i];
      const elem2 = elementsWithBounds[j];

      // 检查是否有部分重叠
      if (hasPartialOverlap(elem1.bounds, elem2.bounds)) {
        conflictElements.add(elem1.id);
        conflictElements.add(elem2.id);
        console.log(`⚠️ 部分重叠: ${elem1.name} 与 ${elem2.name}`);
        continue;
      }

      // 检查包含关系
      if (isElementContained(elem1.bounds, elem2.bounds)) {
        parentChildRelations.push({ parent: elem1, child: elem2 });
        console.log(`📦 包含关系: ${elem1.name} 包含 ${elem2.name}`);
      }
    }
  }

  // 第二步：构建分组
  const groups = buildGroupsFromRelations(elementsWithBounds, parentChildRelations, conflictElements);

  return {
    originalCount: elements.length,
    groupedCount: groups.reduce((sum: number, group) => sum + group.elements.length, 0),
    groups,
    ungroupedElements: elements.filter(e =>
      !groups.some(g => g.elements.some(ge => ge.id === e.id)) &&
      !conflictElements.has(e.id)
    ),
    conflictElements: elements.filter(e => conflictElements.has(e.id))
  };
}

// 从关系构建分组
function buildGroupsFromRelations(
  elements: ElementWithBounds[],
  parentChildRelations: Array<{parent: ElementWithBounds, child: ElementWithBounds}>,
  conflictElements: Set<string>
): Array<{
  name: string;
  elements: ElementInfo[];
  position: { x: number; y: number; width: number; height: number };
  layoutDirection?: 'HORIZONTAL' | 'VERTICAL';
}> {
  const groups: Array<{
    name: string;
    elements: ElementInfo[];
    position: { x: number; y: number; width: number; height: number };
    layoutDirection?: 'HORIZONTAL' | 'VERTICAL';
  }> = [];

  // 构建父子关系映射
  const childrenMap = new Map<string, ElementWithBounds[]>();
  const parentMap = new Map<string, ElementWithBounds>();

  for (const relation of parentChildRelations) {
    // 跳过有冲突的元素
    if (conflictElements.has(relation.parent.id) || conflictElements.has(relation.child.id)) {
      continue;
    }

    if (!childrenMap.has(relation.parent.id)) {
      childrenMap.set(relation.parent.id, []);
    }
    childrenMap.get(relation.parent.id)!.push(relation.child);
    parentMap.set(relation.child.id, relation.parent);
  }

  // 找到根元素（没有父元素的元素）
  const rootElements = elements.filter(elem =>
    !parentMap.has(elem.id) && !conflictElements.has(elem.id)
  );

  console.log(`📊 发现 ${rootElements.length} 个根元素`);

  // 为每个有子元素的根元素创建分组
  for (const rootElement of rootElements) {
    const children = childrenMap.get(rootElement.id) || [];
    if (children.length > 0) {
      const allElements = [rootElement, ...children];
      const groupBounds = calculateUnionBounds(allElements);
      const layoutDirection = detectLayoutDirection(children);

      groups.push({
        name: `${rootElement.name} Group`,
        elements: allElements,
        position: {
          x: groupBounds.minX,
          y: groupBounds.minY,
          width: groupBounds.width,
          height: groupBounds.height
        },
        layoutDirection
      });

      console.log(`📦 创建分组: ${rootElement.name} (${allElements.length} 个元素, ${layoutDirection})`);
    }
  }

  return groups;
}

// 在Figma中创建分组
async function createGroupsInFigma(
  parentFrame: FrameNode,
  result: GroupingResult
): Promise<number> {
  let groupsCreated = 0;

  for (const group of result.groups) {
    try {
      // 获取要分组的节点
      const nodesToGroup = group.elements
        .map(elem => parentFrame.findChild(n => n.id === elem.id))
        .filter(node => node !== null) as SceneNode[];

      if (nodesToGroup.length > 1) {
        // 创建Frame作为容器
        const groupFrame = figma.createFrame();
        groupFrame.name = group.name;

        // 设置Frame位置和尺寸
        groupFrame.x = group.position.x;
        groupFrame.y = group.position.y;
        groupFrame.resize(group.position.width, group.position.height);

        // 设置自动布局
        groupFrame.layoutMode = group.layoutDirection || 'VERTICAL';
        groupFrame.primaryAxisSizingMode = 'AUTO';
        groupFrame.counterAxisSizingMode = 'AUTO';
        groupFrame.itemSpacing = 10;
        groupFrame.paddingLeft = 10;
        groupFrame.paddingRight = 10;
        groupFrame.paddingTop = 10;
        groupFrame.paddingBottom = 10;

        // 设置背景为透明
        groupFrame.fills = [];
        groupFrame.strokes = [];

        // 将节点移动到新Frame中
        for (const node of nodesToGroup) {
          // 调整节点位置相对于新Frame
          const relativeX = node.x - groupFrame.x;
          const relativeY = node.y - groupFrame.y;

          groupFrame.appendChild(node);
          node.x = relativeX;
          node.y = relativeY;

          // 设置响应式尺寸
          if ('layoutSizingHorizontal' in node && 'layoutSizingVertical' in node) {
            if (group.layoutDirection === 'HORIZONTAL') {
              node.layoutSizingHorizontal = 'HUG';
              node.layoutSizingVertical = 'FILL';
            } else {
              node.layoutSizingHorizontal = 'FILL';
              node.layoutSizingVertical = 'HUG';
            }
          }
        }

        // 将新Frame添加到父容器
        parentFrame.appendChild(groupFrame);
        groupsCreated++;

        console.log(`✅ 创建分组: ${group.name} (${nodesToGroup.length} 个元素)`);
      }
    } catch (error) {
      console.error(`❌ 创建分组失败: ${group.name}`, error);
    }
  }

  return groupsCreated;
}

// 创建测试用例
async function createTestCase(testType: string): Promise<void> {
  console.log(`🧪 创建测试用例: ${testType}`);

  switch (testType) {
    case 'card-layout':
      await createCardLayoutTest();
      break;
    case 'nested-containers':
      await createNestedContainersTest();
      break;
    case 'flex-horizontal':
      await createFlexHorizontalTest();
      break;
    case 'flex-vertical':
      await createFlexVerticalTest();
      break;
    case 'overlap-conflict':
      await createOverlapConflictTest();
      break;
    default:
      throw new Error(`未知的测试类型: ${testType}`);
  }
}

// 测试用例1: 卡片布局 (容器包含多个子元素)
async function createCardLayoutTest(): Promise<void> {
  const testFrame = figma.createFrame();
  testFrame.name = '🧪 Card Layout Test';
  testFrame.x = 100;
  testFrame.y = 100;
  testFrame.resize(400, 500);
  testFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];

  // 卡片容器
  const cardContainer = figma.createFrame();
  cardContainer.name = 'Card Container';
  cardContainer.x = 20;
  cardContainer.y = 20;
  cardContainer.resize(360, 460);
  cardContainer.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  cardContainer.cornerRadius = 12;

  // 产品图片
  const productImage = figma.createRectangle();
  productImage.name = 'Product Image';
  productImage.x = 40;
  productImage.y = 40;
  productImage.resize(320, 200);
  productImage.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.9, b: 1 } }];
  productImage.cornerRadius = 8;

  // 产品标题
  const productTitle = figma.createText();
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  productTitle.name = 'Product Title';
  productTitle.characters = 'Amazing Product';
  productTitle.x = 40;
  productTitle.y = 260;
  productTitle.resize(320, 30);
  productTitle.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];

  // 产品描述
  const productDesc = figma.createText();
  productDesc.name = 'Product Description';
  productDesc.characters = 'This is a wonderful product with amazing features.';
  productDesc.x = 40;
  productDesc.y = 300;
  productDesc.resize(320, 60);
  productDesc.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];

  // 价格
  const price = figma.createText();
  price.name = 'Price';
  price.characters = '$99.99';
  price.x = 40;
  price.y = 380;
  price.resize(100, 30);
  price.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }];

  // 购买按钮
  const buyButton = figma.createFrame();
  buyButton.name = 'Buy Button';
  buyButton.x = 260;
  buyButton.y = 380;
  buyButton.resize(100, 40);
  buyButton.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.7, b: 0.3 } }];
  buyButton.cornerRadius = 8;

  // 组装结构
  testFrame.appendChild(cardContainer);
  cardContainer.appendChild(productImage);
  cardContainer.appendChild(productTitle);
  cardContainer.appendChild(productDesc);
  cardContainer.appendChild(price);
  cardContainer.appendChild(buyButton);

  figma.currentPage.appendChild(testFrame);
  figma.viewport.scrollAndZoomIntoView([testFrame]);
}

// 测试用例2: 嵌套容器 (多层父子关系)
async function createNestedContainersTest(): Promise<void> {
  const testFrame = figma.createFrame();
  testFrame.name = '🧪 Nested Containers Test';
  testFrame.x = 600;
  testFrame.y = 100;
  testFrame.resize(500, 400);
  testFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];

  // 外层容器
  const outerContainer = figma.createFrame();
  outerContainer.name = 'Outer Container';
  outerContainer.x = 20;
  outerContainer.y = 20;
  outerContainer.resize(460, 360);
  outerContainer.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 1 } }];
  outerContainer.cornerRadius = 16;

  // 中层容器
  const middleContainer = figma.createFrame();
  middleContainer.name = 'Middle Container';
  middleContainer.x = 40;
  middleContainer.y = 40;
  middleContainer.resize(420, 320);
  middleContainer.fills = [{ type: 'SOLID', color: { r: 1, g: 0.9, b: 0.9 } }];
  middleContainer.cornerRadius = 12;

  // 内层容器
  const innerContainer = figma.createFrame();
  innerContainer.name = 'Inner Container';
  innerContainer.x = 60;
  innerContainer.y = 60;
  innerContainer.resize(380, 280);
  innerContainer.fills = [{ type: 'SOLID', color: { r: 0.9, g: 1, b: 0.9 } }];
  innerContainer.cornerRadius = 8;

  // 内容元素
  const content1 = figma.createRectangle();
  content1.name = 'Content 1';
  content1.x = 80;
  content1.y = 80;
  content1.resize(160, 100);
  content1.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 0.8 } }];

  const content2 = figma.createRectangle();
  content2.name = 'Content 2';
  content2.x = 260;
  content2.y = 80;
  content2.resize(160, 100);
  content2.fills = [{ type: 'SOLID', color: { r: 0.8, g: 1, b: 1 } }];

  const content3 = figma.createRectangle();
  content3.name = 'Content 3';
  content3.x = 80;
  content3.y = 200;
  content3.resize(340, 120);
  content3.fills = [{ type: 'SOLID', color: { r: 1, g: 0.8, b: 1 } }];

  // 组装结构
  testFrame.appendChild(outerContainer);
  outerContainer.appendChild(middleContainer);
  middleContainer.appendChild(innerContainer);
  innerContainer.appendChild(content1);
  innerContainer.appendChild(content2);
  innerContainer.appendChild(content3);

  figma.currentPage.appendChild(testFrame);
}

// 测试用例3: 水平Flex布局
async function createFlexHorizontalTest(): Promise<void> {
  const testFrame = figma.createFrame();
  testFrame.name = '🧪 Flex Horizontal Test';
  testFrame.x = 100;
  testFrame.y = 650;
  testFrame.resize(600, 200);
  testFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];

  // 水平容器
  const horizontalContainer = figma.createFrame();
  horizontalContainer.name = 'Horizontal Container';
  horizontalContainer.x = 20;
  horizontalContainer.y = 20;
  horizontalContainer.resize(560, 160);
  horizontalContainer.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  horizontalContainer.cornerRadius = 12;

  // 水平排列的元素
  const item1 = figma.createRectangle();
  item1.name = 'Item 1';
  item1.x = 40;
  item1.y = 40;
  item1.resize(120, 120);
  item1.fills = [{ type: 'SOLID', color: { r: 1, g: 0.8, b: 0.8 } }];
  item1.cornerRadius = 8;

  const item2 = figma.createRectangle();
  item2.name = 'Item 2';
  item2.x = 180;
  item2.y = 40;
  item2.resize(120, 120);
  item2.fills = [{ type: 'SOLID', color: { r: 0.8, g: 1, b: 0.8 } }];
  item2.cornerRadius = 8;

  const item3 = figma.createRectangle();
  item3.name = 'Item 3';
  item3.x = 320;
  item3.y = 40;
  item3.resize(120, 120);
  item3.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 1 } }];
  item3.cornerRadius = 8;

  const item4 = figma.createRectangle();
  item4.name = 'Item 4';
  item4.x = 460;
  item4.y = 40;
  item4.resize(120, 120);
  item4.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 0.8 } }];
  item4.cornerRadius = 8;

  // 组装结构
  testFrame.appendChild(horizontalContainer);
  horizontalContainer.appendChild(item1);
  horizontalContainer.appendChild(item2);
  horizontalContainer.appendChild(item3);
  horizontalContainer.appendChild(item4);

  figma.currentPage.appendChild(testFrame);
}

// 测试用例4: 垂直Flex布局
async function createFlexVerticalTest(): Promise<void> {
  const testFrame = figma.createFrame();
  testFrame.name = '🧪 Flex Vertical Test';
  testFrame.x = 750;
  testFrame.y = 650;
  testFrame.resize(200, 600);
  testFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];

  // 垂直容器
  const verticalContainer = figma.createFrame();
  verticalContainer.name = 'Vertical Container';
  verticalContainer.x = 20;
  verticalContainer.y = 20;
  verticalContainer.resize(160, 560);
  verticalContainer.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  verticalContainer.cornerRadius = 12;

  // 垂直排列的元素
  const item1 = figma.createRectangle();
  item1.name = 'Item A';
  item1.x = 40;
  item1.y = 40;
  item1.resize(120, 100);
  item1.fills = [{ type: 'SOLID', color: { r: 1, g: 0.8, b: 0.8 } }];
  item1.cornerRadius = 8;

  const item2 = figma.createRectangle();
  item2.name = 'Item B';
  item2.x = 40;
  item2.y = 160;
  item2.resize(120, 100);
  item2.fills = [{ type: 'SOLID', color: { r: 0.8, g: 1, b: 0.8 } }];
  item2.cornerRadius = 8;

  const item3 = figma.createRectangle();
  item3.name = 'Item C';
  item3.x = 40;
  item3.y = 280;
  item3.resize(120, 100);
  item3.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 1 } }];
  item3.cornerRadius = 8;

  const item4 = figma.createRectangle();
  item4.name = 'Item D';
  item4.x = 40;
  item4.y = 400;
  item4.resize(120, 100);
  item4.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 0.8 } }];
  item4.cornerRadius = 8;

  // 组装结构
  testFrame.appendChild(verticalContainer);
  verticalContainer.appendChild(item1);
  verticalContainer.appendChild(item2);
  verticalContainer.appendChild(item3);
  verticalContainer.appendChild(item4);

  figma.currentPage.appendChild(testFrame);
}

// 测试用例5: 重叠冲突
async function createOverlapConflictTest(): Promise<void> {
  const testFrame = figma.createFrame();
  testFrame.name = '🧪 Overlap Conflict Test';
  testFrame.x = 1000;
  testFrame.y = 650;
  testFrame.resize(400, 400);
  testFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];

  // 基础容器
  const baseContainer = figma.createFrame();
  baseContainer.name = 'Base Container';
  baseContainer.x = 20;
  baseContainer.y = 20;
  baseContainer.resize(360, 360);
  baseContainer.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  baseContainer.cornerRadius = 12;

  // 正常包含的元素
  const normalElement = figma.createRectangle();
  normalElement.name = 'Normal Element';
  normalElement.x = 40;
  normalElement.y = 40;
  normalElement.resize(150, 100);
  normalElement.fills = [{ type: 'SOLID', color: { r: 0.8, g: 1, b: 0.8 } }];
  normalElement.cornerRadius = 8;

  // 部分重叠的元素1 (与容器边界重叠)
  const overlapElement1 = figma.createRectangle();
  overlapElement1.name = 'Overlap Element 1';
  overlapElement1.x = 300;
  overlapElement1.y = 150;
  overlapElement1.resize(120, 120);
  overlapElement1.fills = [{ type: 'SOLID', color: { r: 1, g: 0.8, b: 0.8 } }];
  overlapElement1.cornerRadius = 8;

  // 部分重叠的元素2 (与元素1重叠)
  const overlapElement2 = figma.createRectangle();
  overlapElement2.name = 'Overlap Element 2';
  overlapElement2.x = 350;
  overlapElement2.y = 200;
  overlapElement2.resize(100, 100);
  overlapElement2.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 1 } }];
  overlapElement2.cornerRadius = 8;

  // 完全独立的元素
  const independentElement = figma.createRectangle();
  independentElement.name = 'Independent Element';
  independentElement.x = 40;
  independentElement.y = 280;
  independentElement.resize(150, 80);
  independentElement.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 0.8 } }];
  independentElement.cornerRadius = 8;

  // 组装结构
  testFrame.appendChild(baseContainer);
  baseContainer.appendChild(normalElement);
  baseContainer.appendChild(independentElement);

  // 重叠元素添加到testFrame而不是baseContainer
  testFrame.appendChild(overlapElement1);
  testFrame.appendChild(overlapElement2);

  figma.currentPage.appendChild(testFrame);
}

console.log('🚀 纯数学几何分组算法已加载');
