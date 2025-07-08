import { StyleSnapshot, NodeSnapshot } from '../types/interfaces';
import { calculateElementsBounds } from './bounds';

// 创建样式快照
export function createStyleSnapshot(node: SceneNode): StyleSnapshot | null {
  if (!('children' in node) || !node.children) {
    return null;
  }

  const children = node.children as SceneNode[];
  if (children.length === 0) {
    return null;
  }

  // 计算容器边界
  const containerBounds = {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height
  };

  // 计算子元素边界
  const childrenBounds = children.map(child => ({
    id: child.id,
    x: child.x,
    y: child.y,
    width: child.width,
    height: child.height,
    relativeX: child.x - node.x,
    relativeY: child.y - node.y
  }));

  // 计算间距
  const horizontalSpacing: number[] = [];
  const verticalSpacing: number[] = [];

  // 按x坐标排序计算水平间距
  const sortedByX = [...childrenBounds].sort((a, b) => a.x - b.x);
  for (let i = 0; i < sortedByX.length - 1; i++) {
    const spacing = sortedByX[i + 1].x - (sortedByX[i].x + sortedByX[i].width);
    if (spacing > 0) {
      horizontalSpacing.push(spacing);
    }
  }

  // 按y坐标排序计算垂直间距
  const sortedByY = [...childrenBounds].sort((a, b) => a.y - b.y);
  for (let i = 0; i < sortedByY.length - 1; i++) {
    const spacing = sortedByY[i + 1].y - (sortedByY[i].y + sortedByY[i].height);
    if (spacing > 0) {
      verticalSpacing.push(spacing);
    }
  }

  // 计算平均间距
  const averageHorizontal = horizontalSpacing.length > 0
    ? horizontalSpacing.reduce((a, b) => a + b) / horizontalSpacing.length
    : 0;
  const averageVertical = verticalSpacing.length > 0
    ? verticalSpacing.reduce((a, b) => a + b) / verticalSpacing.length
    : 0;

  // 计算最常见间距
  const getMostCommon = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const rounded = arr.map(n => Math.round(n));
    const frequency: { [key: number]: number } = {};
    let maxFreq = 0;
    let mostCommon = rounded[0];

    rounded.forEach(n => {
      frequency[n] = (frequency[n] || 0) + 1;
      if (frequency[n] > maxFreq) {
        maxFreq = frequency[n];
        mostCommon = n;
      }
    });

    return mostCommon;
  };

  // 计算内边距
  const measuredPadding = {
    top: Math.min(...childrenBounds.map(b => b.relativeY)),
    right: Math.min(...childrenBounds.map(b => containerBounds.width - (b.relativeX + b.width))),
    bottom: Math.min(...childrenBounds.map(b => containerBounds.height - (b.relativeY + b.height))),
    left: Math.min(...childrenBounds.map(b => b.relativeX))
  };

  // 检测对齐方式
  const leftAligned = childrenBounds.every(b => Math.abs(b.relativeX - measuredPadding.left) < 1);
  const rightAligned = childrenBounds.every(b => 
    Math.abs((containerBounds.width - (b.relativeX + b.width)) - measuredPadding.right) < 1
  );
  const centerAligned = childrenBounds.every(b => {
    const centerX = b.relativeX + b.width / 2;
    const containerCenterX = containerBounds.width / 2;
    return Math.abs(centerX - containerCenterX) < 1;
  });

  const topAligned = childrenBounds.every(b => Math.abs(b.relativeY - measuredPadding.top) < 1);
  const bottomAligned = childrenBounds.every(b => 
    Math.abs((containerBounds.height - (b.relativeY + b.height)) - measuredPadding.bottom) < 1
  );
  const middleAligned = childrenBounds.every(b => {
    const centerY = b.relativeY + b.height / 2;
    const containerCenterY = containerBounds.height / 2;
    return Math.abs(centerY - containerCenterY) < 1;
  });

  const horizontalAlignment = centerAligned ? 'CENTER' : rightAligned ? 'MAX' : 'MIN';
  const verticalAlignment = middleAligned ? 'CENTER' : bottomAligned ? 'MAX' : 'MIN';

  // 检测主要布局方向
  const isHorizontal = averageHorizontal > averageVertical;

  return {
    containerBounds,
    childrenBounds,
    measuredSpacing: {
      horizontal: horizontalSpacing,
      vertical: verticalSpacing,
      averageHorizontal,
      averageVertical,
      mostCommonHorizontal: getMostCommon(horizontalSpacing),
      mostCommonVertical: getMostCommon(verticalSpacing)
    },
    measuredPadding,
    detectedAlignment: {
      horizontal: horizontalAlignment as 'MIN' | 'CENTER' | 'MAX',
      vertical: verticalAlignment as 'MIN' | 'CENTER' | 'MAX'
    },
    detectedDirection: isHorizontal ? 'HORIZONTAL' : 'VERTICAL'
  };
}

// 验证样式一致性
export function verifyStyleConsistency(
  node: SceneNode,
  originalSnapshot: StyleSnapshot | NodeSnapshot
): { consistent: boolean; differences: string[] } {
  const differences: string[] = [];
  
  // 检查基本属性
  if (node.width !== originalSnapshot.width) {
    differences.push(`Width changed from ${originalSnapshot.width} to ${node.width}`);
  }
  if (node.height !== originalSnapshot.height) {
    differences.push(`Height changed from ${originalSnapshot.height} to ${node.height}`);
  }
  
  // 如果是 StyleSnapshot，进行更详细的检查
  if ('detectedDirection' in originalSnapshot) {
    const currentSnapshot = createStyleSnapshot(node);
    if (!currentSnapshot) {
      differences.push('Failed to create current snapshot');
      return { consistent: false, differences };
    }
    
    // 检查对齐方式
    if (currentSnapshot.detectedAlignment.horizontal !== originalSnapshot.detectedAlignment.horizontal) {
      differences.push(
        `Horizontal alignment changed from ${originalSnapshot.detectedAlignment.horizontal} to ${currentSnapshot.detectedAlignment.horizontal}`
      );
    }
    if (currentSnapshot.detectedAlignment.vertical !== originalSnapshot.detectedAlignment.vertical) {
      differences.push(
        `Vertical alignment changed from ${originalSnapshot.detectedAlignment.vertical} to ${currentSnapshot.detectedAlignment.vertical}`
      );
    }
    
    // 检查间距
    const originalSpacing = originalSnapshot.measuredSpacing;
    const currentSpacing = currentSnapshot.measuredSpacing;
    if (Math.abs(originalSpacing.averageHorizontal - currentSpacing.averageHorizontal) > 1) {
      differences.push(
        `Average horizontal spacing changed from ${originalSpacing.averageHorizontal} to ${currentSpacing.averageHorizontal}`
      );
    }
    if (Math.abs(originalSpacing.averageVertical - currentSpacing.averageVertical) > 1) {
      differences.push(
        `Average vertical spacing changed from ${originalSpacing.averageVertical} to ${currentSpacing.averageVertical}`
      );
    }
    
    // 检查内边距
    const originalPadding = originalSnapshot.measuredPadding;
    const currentPadding = currentSnapshot.measuredPadding;
    ['top', 'right', 'bottom', 'left'].forEach(side => {
      if (Math.abs(originalPadding[side] - currentPadding[side]) > 1) {
        differences.push(
          `${side} padding changed from ${originalPadding[side]} to ${currentPadding[side]}`
        );
      }
    });
  }
  
  return {
    consistent: differences.length === 0,
    differences
  };
}

// 计算最优间距
export function calculateOptimalSpacing(
  snapshot: StyleSnapshot,
  direction: 'HORIZONTAL' | 'VERTICAL'
): number {
  const spacings = direction === 'HORIZONTAL'
    ? snapshot.measuredSpacing.horizontal
    : snapshot.measuredSpacing.vertical;

  if (spacings.length === 0) {
    return 0;
  }

  // 如果有最常见值且差异不大，使用最常见值
  const mostCommon = direction === 'HORIZONTAL'
    ? snapshot.measuredSpacing.mostCommonHorizontal
    : snapshot.measuredSpacing.mostCommonVertical;

  const average = direction === 'HORIZONTAL'
    ? snapshot.measuredSpacing.averageHorizontal
    : snapshot.measuredSpacing.averageVertical;

  if (Math.abs(mostCommon - average) < 5) {
    return mostCommon;
  }

  // 否则使用平均值
  return Math.round(average);
}

// 计算最优内边距
export function calculateOptimalPadding(
  snapshot: StyleSnapshot
): { top: number; right: number; bottom: number; left: number } {
  const { measuredPadding } = snapshot;
  
  // 对每个方向的内边距进行四舍五入
  return {
    top: Math.round(measuredPadding.top),
    right: Math.round(measuredPadding.right),
    bottom: Math.round(measuredPadding.bottom),
    left: Math.round(measuredPadding.left)
  };
}

// 检测布局方向
export function detectLayoutDirection(snapshot: StyleSnapshot): 'HORIZONTAL' | 'VERTICAL' {
  const { averageHorizontal, averageVertical } = snapshot.measuredSpacing;
  return averageHorizontal > averageVertical ? 'HORIZONTAL' : 'VERTICAL';
} 