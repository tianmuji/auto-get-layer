import { 
  LayoutStructure,
  PositionRelationship,
  ConversionStep,
  ElementInfo
} from '../types/interfaces';
import { detectLayoutPattern } from './layout-detection';
import { getFlexItemBehavior } from '../utils/node-utils';

// 生成布局结构
export function generateLayoutStructure(
  relationships: PositionRelationship[],
  pattern: ReturnType<typeof detectLayoutPattern>
): LayoutStructure {
  switch (pattern.type) {
    case 'horizontal':
      return generateHorizontalLayout(relationships);
    case 'vertical':
      return generateVerticalLayout(relationships);
    case 'grid':
      return generateGridLayout(relationships, pattern.details);
    default:
      return generateMixedLayout(relationships);
  }
}

// 生成水平布局结构
function generateHorizontalLayout(relationships: PositionRelationship[]): LayoutStructure {
  // 按X坐标排序
  const sortedRelationships = [...relationships].sort(
    (a, b) => a.bounds.minX - b.bounds.minX
  );

  // 计算间距
  const spacings: number[] = [];
  for (let i = 0; i < sortedRelationships.length - 1; i++) {
    const current = sortedRelationships[i];
    const next = sortedRelationships[i + 1];
    spacings.push(next.bounds.minX - current.bounds.maxX);
  }

  const averageSpacing = spacings.length > 0
    ? Math.round(spacings.reduce((a, b) => a + b) / spacings.length)
    : 0;

  // 检测对齐方式
  const topAligned = relationships.every(rel =>
    Math.abs(rel.bounds.minY - relationships[0].bounds.minY) < 1
  );
  const bottomAligned = relationships.every(rel =>
    Math.abs(rel.bounds.maxY - relationships[0].bounds.maxY) < 1
  );
  const centerAligned = relationships.every(rel =>
    Math.abs(rel.bounds.centerY - relationships[0].bounds.centerY) < 1
  );

  const verticalAlignment = centerAligned ? 'CENTER' : bottomAligned ? 'MAX' : 'MIN';

  return {
    rootId: 'root',
    layoutType: 'horizontal',
    children: sortedRelationships.map(rel => ({
      elementId: rel.elementId,
      elementName: rel.elementName,
      nodeType: rel.containment.isContainer ? 'container' : 'leaf',
      layoutRole: determineLayoutRole(rel),
      sizing: determineSizing(rel, 'horizontal')
    })),
    spacing: {
      horizontal: averageSpacing,
      vertical: 0
    },
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    alignment: {
      horizontal: 'MIN',
      vertical: verticalAlignment
    }
  };
}

// 生成垂直布局结构
function generateVerticalLayout(relationships: PositionRelationship[]): LayoutStructure {
  // 按Y坐标排序
  const sortedRelationships = [...relationships].sort(
    (a, b) => a.bounds.minY - b.bounds.minY
  );

  // 计算间距
  const spacings: number[] = [];
  for (let i = 0; i < sortedRelationships.length - 1; i++) {
    const current = sortedRelationships[i];
    const next = sortedRelationships[i + 1];
    spacings.push(next.bounds.minY - current.bounds.maxY);
  }

  const averageSpacing = spacings.length > 0
    ? Math.round(spacings.reduce((a, b) => a + b) / spacings.length)
    : 0;

  // 检测对齐方式
  const leftAligned = relationships.every(rel =>
    Math.abs(rel.bounds.minX - relationships[0].bounds.minX) < 1
  );
  const rightAligned = relationships.every(rel =>
    Math.abs(rel.bounds.maxX - relationships[0].bounds.maxX) < 1
  );
  const centerAligned = relationships.every(rel =>
    Math.abs(rel.bounds.centerX - relationships[0].bounds.centerX) < 1
  );

  const horizontalAlignment = centerAligned ? 'CENTER' : rightAligned ? 'MAX' : 'MIN';

  return {
    rootId: 'root',
    layoutType: 'vertical',
    children: sortedRelationships.map(rel => ({
      elementId: rel.elementId,
      elementName: rel.elementName,
      nodeType: rel.containment.isContainer ? 'container' : 'leaf',
      layoutRole: determineLayoutRole(rel),
      sizing: determineSizing(rel, 'vertical')
    })),
    spacing: {
      horizontal: 0,
      vertical: averageSpacing
    },
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    alignment: {
      horizontal: horizontalAlignment,
      vertical: 'MIN'
    }
  };
}

// 生成网格布局结构
function generateGridLayout(
  relationships: PositionRelationship[],
  details: { rows?: number; columns?: number }
): LayoutStructure {
  const { rows = 1, columns = 1 } = details;

  // 按Y坐标分组
  const sortedByY = [...relationships].sort((a, b) => a.bounds.minY - b.bounds.minY);
  const rowGroups: PositionRelationship[][] = [];
  
  for (let i = 0; i < rows; i++) {
    rowGroups.push(sortedByY.slice(i * columns, (i + 1) * columns));
  }

  // 计算行间距和列间距
  const rowSpacings: number[] = [];
  const colSpacings: number[] = [];

  rowGroups.forEach((row, i) => {
    if (i < rowGroups.length - 1) {
      const currentRowBottom = Math.max(...row.map(rel => rel.bounds.maxY));
      const nextRowTop = Math.min(...rowGroups[i + 1].map(rel => rel.bounds.minY));
      rowSpacings.push(nextRowTop - currentRowBottom);
    }

    for (let j = 0; j < row.length - 1; j++) {
      const current = row[j];
      const next = row[j + 1];
      if (current && next) {
        colSpacings.push(next.bounds.minX - current.bounds.maxX);
      }
    }
  });

  const averageRowSpacing = rowSpacings.length > 0
    ? Math.round(rowSpacings.reduce((a, b) => a + b) / rowSpacings.length)
    : 0;

  const averageColSpacing = colSpacings.length > 0
    ? Math.round(colSpacings.reduce((a, b) => a + b) / colSpacings.length)
    : 0;

  return {
    rootId: 'root',
    layoutType: 'grid',
    children: relationships.map(rel => ({
      elementId: rel.elementId,
      elementName: rel.elementName,
      nodeType: rel.containment.isContainer ? 'container' : 'leaf',
      layoutRole: determineLayoutRole(rel),
      sizing: determineSizing(rel, 'horizontal')
    })),
    spacing: {
      horizontal: averageColSpacing,
      vertical: averageRowSpacing
    },
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    alignment: {
      horizontal: 'MIN',
      vertical: 'MIN'
    }
  };
}

// 生成混合布局结构
function generateMixedLayout(relationships: PositionRelationship[]): LayoutStructure {
  // 默认使用垂直布局，但保持原有的相对位置
  return generateVerticalLayout(relationships);
}

// 确定布局角色
function determineLayoutRole(relationship: PositionRelationship): 'primary' | 'secondary' | 'decorative' {
  // 检查是否为主要内容
  const isMainContent = relationship.elementName.toLowerCase().includes('content') ||
    relationship.elementName.toLowerCase().includes('main');

  // 检查是否为装饰性元素
  const isDecorative = relationship.elementName.toLowerCase().includes('icon') ||
    relationship.elementName.toLowerCase().includes('decoration') ||
    relationship.elementName.toLowerCase().includes('background');

  return isMainContent ? 'primary' : isDecorative ? 'decorative' : 'secondary';
}

// 确定尺寸模式
function determineSizing(
  relationship: PositionRelationship,
  layoutDirection: 'horizontal' | 'vertical'
): { horizontal: 'FIXED' | 'HUG' | 'FILL'; vertical: 'FIXED' | 'HUG' | 'FILL' } {
  const result = {
    horizontal: 'HUG' as const,
    vertical: 'HUG' as const
  };

  // 检查是否有强对齐
  const hasStrongHorizontalAlignment = relationship.alignments.horizontal.some(
    align => align.confidence > 0.9
  );
  const hasStrongVerticalAlignment = relationship.alignments.vertical.some(
    align => align.confidence > 0.9
  );

  // 检查是否有相邻元素
  const hasHorizontalAdjacencies = relationship.adjacencies.left.length > 0 ||
    relationship.adjacencies.right.length > 0;
  const hasVerticalAdjacencies = relationship.adjacencies.top.length > 0 ||
    relationship.adjacencies.bottom.length > 0;

  // 主轴方向上的尺寸
  if (layoutDirection === 'horizontal') {
    if (hasStrongHorizontalAlignment && !hasHorizontalAdjacencies) {
      result.horizontal = 'FIXED';
    } else if (hasHorizontalAdjacencies) {
      result.horizontal = 'FILL';
    }
  } else {
    if (hasStrongVerticalAlignment && !hasVerticalAdjacencies) {
      result.vertical = 'FIXED';
    } else if (hasVerticalAdjacencies) {
      result.vertical = 'FILL';
    }
  }

  return result;
}

// 创建转换计划
export function createConversionPlan(
  layoutStructure: LayoutStructure,
  containerNode: FrameNode
): ConversionStep[] {
  const steps: ConversionStep[] = [];

  // 步骤1：启用自动布局
  steps.push({
    stepType: 'enable_auto_layout',
    targetId: containerNode.id,
    parameters: {
      direction: layoutStructure.layoutType === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL'
    },
    description: `将容器 "${containerNode.name}" 转换为${layoutStructure.layoutType === 'horizontal' ? '水平' : '垂直'}自动布局`,
    order: 1
  });

  // 步骤2：设置间距
  steps.push({
    stepType: 'set_spacing',
    targetId: containerNode.id,
    parameters: {
      spacing: layoutStructure.layoutType === 'horizontal'
        ? layoutStructure.spacing.horizontal
        : layoutStructure.spacing.vertical
    },
    description: `设置元素间距为 ${layoutStructure.spacing.horizontal}px`,
    order: 2
  });

  // 步骤3：设置内边距
  steps.push({
    stepType: 'set_padding',
    targetId: containerNode.id,
    parameters: layoutStructure.padding,
    description: '设置容器内边距',
    order: 3
  });

  // 步骤4：设置对齐方式
  steps.push({
    stepType: 'set_alignment',
    targetId: containerNode.id,
    parameters: {
      primary: layoutStructure.layoutType === 'horizontal'
        ? layoutStructure.alignment.vertical
        : layoutStructure.alignment.horizontal,
      counter: layoutStructure.layoutType === 'horizontal'
        ? layoutStructure.alignment.horizontal
        : layoutStructure.alignment.vertical
    },
    description: '设置对齐方式',
    order: 4
  });

  // 步骤5：设置子元素尺寸
  layoutStructure.children.forEach((child, index) => {
    steps.push({
      stepType: 'set_sizing',
      targetId: child.elementId,
      parameters: {
        horizontal: child.sizing.horizontal,
        vertical: child.sizing.vertical
      },
      description: `设置元素 "${child.elementName}" 的尺寸模式`,
      order: 5 + index
    });
  });

  return steps;
}

// 执行转换步骤
export async function executeConversionStep(
  step: ConversionStep,
  containerNode: FrameNode
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (step.stepType) {
      case 'enable_auto_layout':
        if ('layoutMode' in containerNode) {
          containerNode.layoutMode = step.parameters.direction;
        }
        break;

      case 'set_spacing':
        if ('itemSpacing' in containerNode) {
          containerNode.itemSpacing = step.parameters.spacing;
        }
        break;

      case 'set_padding':
        if ('paddingLeft' in containerNode) {
          containerNode.paddingLeft = step.parameters.left;
          containerNode.paddingRight = step.parameters.right;
          containerNode.paddingTop = step.parameters.top;
          containerNode.paddingBottom = step.parameters.bottom;
        }
        break;

      case 'set_alignment':
        if ('primaryAxisAlignItems' in containerNode && 'counterAxisAlignItems' in containerNode) {
          containerNode.primaryAxisAlignItems = step.parameters.primary;
          containerNode.counterAxisAlignItems = step.parameters.counter;
        }
        break;

      case 'set_sizing':
        const targetNode = figma.getNodeById(step.targetId) as SceneNode;
        if (targetNode && 'layoutSizingHorizontal' in targetNode && 'layoutSizingVertical' in targetNode) {
          targetNode.layoutSizingHorizontal = step.parameters.horizontal;
          targetNode.layoutSizingVertical = step.parameters.vertical;
        }
        break;
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
} 