import { 
  ElementInfo,
  NodeSnapshot,
  StyleSnapshot,
  AnalysisResult
} from '../types/interfaces';
import { createStyleSnapshot } from '../utils/style-analysis';
import { hasChildren, isInteractiveElement } from '../utils/node-utils';
import { calculateBoundingBox } from '../utils/bounds';

// 分析节点及其子节点
export function analyzeNode(node: SceneNode): AnalysisResult {
  const elementInfo = extractElementInfo(node);
  const styleSnapshot = createStyleSnapshot(node);
  const nodeSnapshot = createNodeSnapshot(node);
  const childrenAnalysis = analyzeChildren(node);

  return {
    elementInfo,
    styleSnapshot,
    nodeSnapshot,
    childrenAnalysis,
    recommendations: generateRecommendations(elementInfo, styleSnapshot, nodeSnapshot)
  };
}

// 提取元素信息
function extractElementInfo(node: SceneNode): ElementInfo {
  const info: ElementInfo = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    visible: node.visible,
    locked: node.locked
  };

  // 添加布局相关属性
  if ('layoutMode' in node) {
    info.layoutMode = node.layoutMode;
    info.itemSpacing = node.itemSpacing;
    info.paddingLeft = node.paddingLeft;
    info.paddingRight = node.paddingRight;
    info.paddingTop = node.paddingTop;
    info.paddingBottom = node.paddingBottom;
  }

  // 添加填充和描边属性
  if ('fills' in node) {
    info.fills = node.fills;
  }
  if ('strokes' in node) {
    info.strokes = node.strokes;
  }

  // 添加文本特有属性
  if ('characters' in node) {
    info.characters = node.characters;
    info.fontSize = node.fontSize;
    info.fontName = node.fontName;
    info.textStyleId = node.textStyleId;
  }

  // 添加约束属性
  if ('constraints' in node) {
    info.constraints = node.constraints;
  }

  return info;
}

// 创建节点快照
function createNodeSnapshot(node: SceneNode): NodeSnapshot {
  const bounds = calculateBoundingBox({
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height
  });

  const snapshot: NodeSnapshot = {
    id: node.id,
    name: node.name,
    type: node.type,
    bounds,
    visible: node.visible,
    locked: node.locked,
    children: []
  };

  if (hasChildren(node.type) && 'children' in node) {
    snapshot.children = (node.children as SceneNode[]).map(child => 
      createNodeSnapshot(child)
    );
  }

  return snapshot;
}

// 分析子节点
function analyzeChildren(node: SceneNode): {
  count: number;
  types: { [key: string]: number };
  maxDepth: number;
  interactiveElements: string[];
  layoutInfo?: {
    type: string;
    direction?: string;
    spacing?: number;
    alignment?: string;
  };
} {
  if (!('children' in node) || !node.children) {
    return {
      count: 0,
      types: {},
      maxDepth: 0,
      interactiveElements: []
    };
  }

  const children = node.children as SceneNode[];
  const analysis = {
    count: children.length,
    types: {} as { [key: string]: number },
    maxDepth: 1,
    interactiveElements: [] as string[],
    layoutInfo: undefined as any
  };

  // 统计节点类型
  children.forEach(child => {
    analysis.types[child.type] = (analysis.types[child.type] || 0) + 1;
    
    if (isInteractiveElement(child)) {
      analysis.interactiveElements.push(child.id);
    }

    if (hasChildren(child.type) && 'children' in child) {
      const childAnalysis = analyzeChildren(child);
      analysis.maxDepth = Math.max(analysis.maxDepth, childAnalysis.maxDepth + 1);
    }
  });

  // 分析布局信息
  if ('layoutMode' in node) {
    analysis.layoutInfo = {
      type: 'AUTO_LAYOUT',
      direction: node.layoutMode,
      spacing: node.itemSpacing,
      alignment: 'primaryAxisAlignItems' in node ? node.primaryAxisAlignItems : undefined
    };
  }

  return analysis;
}

// 生成建议
function generateRecommendations(
  elementInfo: ElementInfo,
  styleSnapshot: StyleSnapshot | null,
  nodeSnapshot: NodeSnapshot
): string[] {
  const recommendations: string[] = [];

  // 检查命名规范
  if (!elementInfo.name.match(/^[a-zA-Z][a-zA-Z0-9_-]*$/)) {
    recommendations.push('建议使用规范的命名格式：字母开头，可包含字母、数字、下划线和连字符');
  }

  // 检查尺寸是否为整数
  if (Math.round(elementInfo.width) !== elementInfo.width || 
      Math.round(elementInfo.height) !== elementInfo.height) {
    recommendations.push('建议将尺寸调整为整数值，避免出现小数');
  }

  // 检查是否需要自动布局
  if (!elementInfo.layoutMode && nodeSnapshot.children.length > 1) {
    recommendations.push('当前元素包含多个子元素，建议使用自动布局');
  }

  // 检查间距是否统一
  if (styleSnapshot) {
    const { measuredSpacing } = styleSnapshot;
    if (measuredSpacing.horizontal.length > 0 && 
        Math.max(...measuredSpacing.horizontal) - Math.min(...measuredSpacing.horizontal) > 2) {
      recommendations.push('水平间距不统一，建议统一调整');
    }
    if (measuredSpacing.vertical.length > 0 && 
        Math.max(...measuredSpacing.vertical) - Math.min(...measuredSpacing.vertical) > 2) {
      recommendations.push('垂直间距不统一，建议统一调整');
    }
  }

  // 检查对齐方式
  if (styleSnapshot?.detectedAlignment) {
    const { horizontal, vertical } = styleSnapshot.detectedAlignment;
    if (horizontal === 'MIN' && vertical === 'MIN') {
      recommendations.push('建议考虑使用更多样的对齐方式，如居中对齐或右对齐');
    }
  }

  // 检查嵌套深度
  if (nodeSnapshot.children.length > 0) {
    const maxDepth = calculateMaxDepth(nodeSnapshot);
    if (maxDepth > 3) {
      recommendations.push('层级嵌套过深，建议适当减少嵌套层级');
    }
  }

  return recommendations;
}

// 计算最大嵌套深度
function calculateMaxDepth(snapshot: NodeSnapshot): number {
  if (snapshot.children.length === 0) {
    return 0;
  }

  return 1 + Math.max(...snapshot.children.map(child => calculateMaxDepth(child)));
}

// 分析节点的响应式行为
export function analyzeResponsiveBehavior(node: SceneNode): {
  isResponsive: boolean;
  behavior: {
    horizontal: 'fixed' | 'flexible' | 'fill';
    vertical: 'fixed' | 'flexible' | 'fill';
  };
  constraints: {
    horizontal: string;
    vertical: string;
  };
  recommendations: string[];
} {
  const result = {
    isResponsive: false,
    behavior: {
      horizontal: 'fixed' as const,
      vertical: 'fixed' as const
    },
    constraints: {
      horizontal: 'SCALE',
      vertical: 'SCALE'
    },
    recommendations: [] as string[]
  };

  // 检查约束
  if ('constraints' in node) {
    const { horizontal, vertical } = node.constraints;
    result.constraints = { horizontal, vertical };

    if (horizontal !== 'SCALE' || vertical !== 'SCALE') {
      result.isResponsive = true;
    }
  }

  // 检查自动布局属性
  if ('layoutMode' in node) {
    result.isResponsive = true;

    if ('layoutSizingHorizontal' in node) {
      result.behavior.horizontal = node.layoutSizingHorizontal === 'FILL' ? 'fill' : 'flexible';
    }
    if ('layoutSizingVertical' in node) {
      result.behavior.vertical = node.layoutSizingVertical === 'FILL' ? 'fill' : 'flexible';
    }
  }

  // 生成建议
  if (!result.isResponsive) {
    result.recommendations.push('建议添加响应式约束或使用自动布局');
  }

  if (result.behavior.horizontal === 'fixed' && result.behavior.vertical === 'fixed') {
    result.recommendations.push('当前元素使用固定尺寸，可能不适合响应式布局');
  }

  if ('children' in node && node.children && node.children.length > 0) {
    if (!('layoutMode' in node)) {
      result.recommendations.push('包含子元素的容器建议使用自动布局');
    }
  }

  return result;
}

// 分析节点的交互状态
export function analyzeInteractionStates(node: SceneNode): {
  hasVariants: boolean;
  states: string[];
  missingStates: string[];
  recommendations: string[];
} {
  const result = {
    hasVariants: false,
    states: [] as string[],
    missingStates: [] as string[],
    recommendations: [] as string[]
  };

  // 检查是否为组件
  if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    result.hasVariants = true;
  }

  // 检查变体
  if ('variantProperties' in node) {
    const properties = node.variantProperties;
    if (properties) {
      result.states = Object.keys(properties);
    }
  }

  // 检查常见交互状态
  const commonStates = ['hover', 'pressed', 'focused', 'disabled'];
  result.missingStates = commonStates.filter(state => 
    !result.states.some(s => s.toLowerCase().includes(state))
  );

  // 生成建议
  if (isInteractiveElement(node)) {
    if (!result.hasVariants) {
      result.recommendations.push('交互元素建议创建组件并添加状态变体');
    }
    
    if (result.missingStates.length > 0) {
      result.recommendations.push(
        `建议添加以下交互状态：${result.missingStates.join(', ')}`
      );
    }
  }

  return result;
} 