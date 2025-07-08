import { 
  ElementInfo,
  NodeSnapshot,
  ResponsiveConfig,
  SizingMode
} from '../types/interfaces';
import { isInteractiveElement, isStretchableElement } from '../utils/node-utils';

// 分析元素的响应式配置
export function analyzeResponsiveConfig(
  element: ElementInfo,
  parentSnapshot: NodeSnapshot | null,
  siblings: ElementInfo[]
): ResponsiveConfig {
  const config: ResponsiveConfig = {
    horizontalSizing: determineSizingMode(element, 'horizontal', parentSnapshot, siblings),
    verticalSizing: determineSizingMode(element, 'vertical', parentSnapshot, siblings),
    constraints: determineConstraints(element, parentSnapshot),
    breakpoints: determineBreakpoints(element, parentSnapshot),
    recommendations: []
  };

  // 生成建议
  generateSizingRecommendations(config, element, parentSnapshot);

  return config;
}

// 确定尺寸模式
function determineSizingMode(
  element: ElementInfo,
  direction: 'horizontal' | 'vertical',
  parentSnapshot: NodeSnapshot | null,
  siblings: ElementInfo[]
): SizingMode {
  // 默认使用自适应模式
  let mode: SizingMode = 'HUG';

  // 检查是否为交互元素
  if (isInteractiveElement(element)) {
    mode = 'FIXED';
  }
  // 检查是否为可拉伸元素
  else if (isStretchableElement(element)) {
    mode = 'FILL';
  }
  // 检查父容器布局模式
  else if (parentSnapshot?.type === 'FRAME' && 'layoutMode' in parentSnapshot) {
    const isMainAxis = (direction === 'horizontal' && parentSnapshot.layoutMode === 'HORIZONTAL') ||
                      (direction === 'vertical' && parentSnapshot.layoutMode === 'VERTICAL');
    
    if (isMainAxis) {
      // 在主轴方向上，检查是否需要填充
      const totalSiblingSpace = siblings.reduce((sum, sibling) => 
        sum + (direction === 'horizontal' ? sibling.width : sibling.height), 0
      );
      const containerSize = direction === 'horizontal' ? parentSnapshot.width : parentSnapshot.height;
      
      if (totalSiblingSpace < containerSize * 0.9) {
        mode = 'FILL';
      }
    } else {
      // 在交叉轴方向上，通常使用自适应或固定尺寸
      mode = 'HUG';
    }
  }
  // 检查元素内容
  else if ('characters' in element) {
    mode = 'HUG'; // 文本元素通常使用自适应尺寸
  }

  return mode;
}

// 确定约束条件
function determineConstraints(
  element: ElementInfo,
  parentSnapshot: NodeSnapshot | null
): {
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'SCALE' | 'STRETCH';
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'SCALE' | 'STRETCH';
} {
  const constraints = {
    horizontal: 'SCALE' as const,
    vertical: 'SCALE' as const
  };

  if (!parentSnapshot) {
    return constraints;
  }

  // 检查水平约束
  const elementCenterX = element.x + element.width / 2;
  const parentCenterX = parentSnapshot.width / 2;
  const horizontalThreshold = parentSnapshot.width * 0.1;

  if (Math.abs(element.x) < horizontalThreshold) {
    constraints.horizontal = 'LEFT';
  } else if (Math.abs(parentSnapshot.width - (element.x + element.width)) < horizontalThreshold) {
    constraints.horizontal = 'RIGHT';
  } else if (Math.abs(elementCenterX - parentCenterX) < horizontalThreshold) {
    constraints.horizontal = 'CENTER';
  } else if (element.width / parentSnapshot.width > 0.9) {
    constraints.horizontal = 'STRETCH';
  }

  // 检查垂直约束
  const elementCenterY = element.y + element.height / 2;
  const parentCenterY = parentSnapshot.height / 2;
  const verticalThreshold = parentSnapshot.height * 0.1;

  if (Math.abs(element.y) < verticalThreshold) {
    constraints.vertical = 'TOP';
  } else if (Math.abs(parentSnapshot.height - (element.y + element.height)) < verticalThreshold) {
    constraints.vertical = 'BOTTOM';
  } else if (Math.abs(elementCenterY - parentCenterY) < verticalThreshold) {
    constraints.vertical = 'CENTER';
  } else if (element.height / parentSnapshot.height > 0.9) {
    constraints.vertical = 'STRETCH';
  }

  return constraints;
}

// 确定断点配置
function determineBreakpoints(
  element: ElementInfo,
  parentSnapshot: NodeSnapshot | null
): {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
} {
  const breakpoints = {};

  // 如果是交互元素，设置最小尺寸以保持可点击性
  if (isInteractiveElement(element)) {
    breakpoints['minWidth'] = 32;
    breakpoints['minHeight'] = 32;
  }

  // 如果是文本元素，根据内容设置最小宽度
  if ('characters' in element) {
    const avgCharWidth = element.fontSize ? element.fontSize * 0.6 : 10;
    const minTextWidth = Math.min(
      element.width,
      Math.ceil(element.characters.length * avgCharWidth)
    );
    breakpoints['minWidth'] = minTextWidth;
  }

  // 如果元素占据父容器大部分空间，设置最大尺寸
  if (parentSnapshot) {
    if (element.width / parentSnapshot.width > 0.8) {
      breakpoints['maxWidth'] = element.width;
    }
    if (element.height / parentSnapshot.height > 0.8) {
      breakpoints['maxHeight'] = element.height;
    }
  }

  return breakpoints;
}

// 生成尺寸建议
function generateSizingRecommendations(
  config: ResponsiveConfig,
  element: ElementInfo,
  parentSnapshot: NodeSnapshot | null
): void {
  // 检查固定尺寸的合理性
  if (config.horizontalSizing === 'FIXED' && element.width > 500) {
    config.recommendations.push(
      '当前元素宽度较大且使用固定尺寸，建议考虑使用自适应或填充模式'
    );
  }
  if (config.verticalSizing === 'FIXED' && element.height > 500) {
    config.recommendations.push(
      '当前元素高度较大且使用固定尺寸，建议考虑使用自适应或填充模式'
    );
  }

  // 检查自适应尺寸的合理性
  if (config.horizontalSizing === 'HUG' && !('characters' in element)) {
    config.recommendations.push(
      '非文本元素使用自适应宽度，请确认是否合理'
    );
  }

  // 检查填充模式的合理性
  if (config.horizontalSizing === 'FILL' && isInteractiveElement(element)) {
    config.recommendations.push(
      '交互元素使用填充模式可能影响用户体验，建议考虑使用固定或自适应宽度'
    );
  }

  // 检查约束设置的合理性
  if (parentSnapshot) {
    if (config.constraints.horizontal === 'SCALE' && element.width > 100) {
      config.recommendations.push(
        '宽度较大的元素使用缩放约束可能导致不良的响应式效果，建议使用其他约束方式'
      );
    }
    if (config.constraints.vertical === 'SCALE' && element.height > 100) {
      config.recommendations.push(
        '高度较大的元素使用缩放约束可能导致不良的响应式效果，建议使用其他约束方式'
      );
    }
  }

  // 检查断点设置的合理性
  if ('minWidth' in config.breakpoints && config.breakpoints.minWidth < 32) {
    config.recommendations.push(
      '最小宽度过小可能影响可用性，建议设置不小于32px的最小宽度'
    );
  }
  if ('minHeight' in config.breakpoints && config.breakpoints.minHeight < 32) {
    config.recommendations.push(
      '最小高度过小可能影响可用性，建议设置不小于32px的最小高度'
    );
  }
}

// 应用响应式配置
export function applyResponsiveConfig(
  node: SceneNode,
  config: ResponsiveConfig
): { success: boolean; error?: string } {
  try {
    // 应用尺寸模式
    if ('layoutSizingHorizontal' in node && 'layoutSizingVertical' in node) {
      node.layoutSizingHorizontal = config.horizontalSizing;
      node.layoutSizingVertical = config.verticalSizing;
    }

    // 应用约束
    if ('constraints' in node) {
      node.constraints = {
        horizontal: config.constraints.horizontal,
        vertical: config.constraints.vertical
      };
    }

    // 应用断点配置
    if ('minWidth' in config.breakpoints && 'minWidth' in node) {
      node.minWidth = config.breakpoints.minWidth;
    }
    if ('maxWidth' in config.breakpoints && 'maxWidth' in node) {
      node.maxWidth = config.breakpoints.maxWidth;
    }
    if ('minHeight' in config.breakpoints && 'minHeight' in node) {
      node.minHeight = config.breakpoints.minHeight;
    }
    if ('maxHeight' in config.breakpoints && 'maxHeight' in node) {
      node.maxHeight = config.breakpoints.maxHeight;
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

// 验证响应式配置
export function validateResponsiveConfig(
  node: SceneNode,
  config: ResponsiveConfig
): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // 验证尺寸模式
  if ('layoutSizingHorizontal' in node && node.layoutSizingHorizontal !== config.horizontalSizing) {
    issues.push(`水平尺寸模式不匹配：期望 ${config.horizontalSizing}，实际 ${node.layoutSizingHorizontal}`);
  }
  if ('layoutSizingVertical' in node && node.layoutSizingVertical !== config.verticalSizing) {
    issues.push(`垂直尺寸模式不匹配：期望 ${config.verticalSizing}，实际 ${node.layoutSizingVertical}`);
  }

  // 验证约束
  if ('constraints' in node) {
    if (node.constraints.horizontal !== config.constraints.horizontal) {
      issues.push(`水平约束不匹配：期望 ${config.constraints.horizontal}，实际 ${node.constraints.horizontal}`);
    }
    if (node.constraints.vertical !== config.constraints.vertical) {
      issues.push(`垂直约束不匹配：期望 ${config.constraints.vertical}，实际 ${node.constraints.vertical}`);
    }
  }

  // 验证断点配置
  if ('minWidth' in config.breakpoints && 'minWidth' in node && 
      node.minWidth !== config.breakpoints.minWidth) {
    issues.push(`最小宽度不匹配：期望 ${config.breakpoints.minWidth}，实际 ${node.minWidth}`);
  }
  if ('maxWidth' in config.breakpoints && 'maxWidth' in node && 
      node.maxWidth !== config.breakpoints.maxWidth) {
    issues.push(`最大宽度不匹配：期望 ${config.breakpoints.maxWidth}，实际 ${node.maxWidth}`);
  }
  if ('minHeight' in config.breakpoints && 'minHeight' in node && 
      node.minHeight !== config.breakpoints.minHeight) {
    issues.push(`最小高度不匹配：期望 ${config.breakpoints.minHeight}，实际 ${node.minHeight}`);
  }
  if ('maxHeight' in config.breakpoints && 'maxHeight' in node && 
      node.maxHeight !== config.breakpoints.maxHeight) {
    issues.push(`最大高度不匹配：期望 ${config.breakpoints.maxHeight}，实际 ${node.maxHeight}`);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
} 