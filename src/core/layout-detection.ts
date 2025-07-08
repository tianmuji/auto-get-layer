import { 
  PositionRelationship,
  AlignmentInfo,
  LayoutStructure,
  ElementInfo,
  BoundingBox
} from '../types/interfaces';
import { calculateBoundingBox, isCompletelyContained } from '../utils/bounds';

// 分析所有位置关系
export function analyzeAllPositionRelationships(elements: ElementInfo[]): PositionRelationship[] {
  const relationships: PositionRelationship[] = elements.map(element => {
    const bounds = calculateBoundingBox(element);
    return {
      elementId: element.id,
      elementName: element.name,
      bounds,
      alignments: {
        horizontal: [],
        vertical: []
      },
      adjacencies: {
        left: [],
        right: [],
        top: [],
        bottom: []
      },
      containment: {
        isContainer: false,
        containedElements: []
      }
    };
  });

  // 分析每对元素之间的关系
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const rel1 = relationships[i];
      const rel2 = relationships[j];

      // 分析对齐关系
      const alignmentInfo = analyzeAlignment(rel1.bounds, rel2.bounds, 10);
      
      // 添加水平对齐关系
      alignmentInfo.horizontal.forEach(info => {
        rel1.alignments.horizontal.push({ ...info, targetElementId: rel2.elementId });
        rel2.alignments.horizontal.push({ ...info, targetElementId: rel1.elementId });
      });

      // 添加垂直对齐关系
      alignmentInfo.vertical.forEach(info => {
        rel1.alignments.vertical.push({ ...info, targetElementId: rel2.elementId });
        rel2.alignments.vertical.push({ ...info, targetElementId: rel1.elementId });
      });

      // 分析相邻关系
      const adjacencyInfo = analyzeAdjacency(rel1.bounds, rel2.bounds, 20);
      
      if (adjacencyInfo.isLeftOf) {
        rel1.adjacencies.right.push(rel2.elementId);
        rel2.adjacencies.left.push(rel1.elementId);
      }
      if (adjacencyInfo.isRightOf) {
        rel1.adjacencies.left.push(rel2.elementId);
        rel2.adjacencies.right.push(rel1.elementId);
      }
      if (adjacencyInfo.isAbove) {
        rel1.adjacencies.bottom.push(rel2.elementId);
        rel2.adjacencies.top.push(rel1.elementId);
      }
      if (adjacencyInfo.isBelow) {
        rel1.adjacencies.top.push(rel2.elementId);
        rel2.adjacencies.bottom.push(rel1.elementId);
      }

      // 分析包含关系
      if (isCompletelyContained(rel2.bounds, rel1.bounds)) {
        rel1.containment.isContainer = true;
        rel1.containment.containedElements.push(rel2.elementId);
        rel2.containment.parentContainer = rel1.elementId;
      } else if (isCompletelyContained(rel1.bounds, rel2.bounds)) {
        rel2.containment.isContainer = true;
        rel2.containment.containedElements.push(rel1.elementId);
        rel1.containment.parentContainer = rel2.elementId;
      }
    }
  }

  return relationships;
}

// 分析对齐关系
export function analyzeAlignment(
  bounds1: BoundingBox,
  bounds2: BoundingBox,
  threshold: number
): {
  horizontal: Omit<AlignmentInfo, 'targetElementId'>[];
  vertical: Omit<AlignmentInfo, 'targetElementId'>[];
} {
  const result = {
    horizontal: [] as Omit<AlignmentInfo, 'targetElementId'>[],
    vertical: [] as Omit<AlignmentInfo, 'targetElementId'>[]
  };

  // 检查水平对齐
  // 左边缘对齐
  const leftDeviation = Math.abs(bounds1.minX - bounds2.minX);
  if (leftDeviation <= threshold) {
    result.horizontal.push({
      alignmentType: 'left',
      deviation: leftDeviation,
      confidence: 1 - leftDeviation / threshold
    });
  }

  // 右边缘对齐
  const rightDeviation = Math.abs(bounds1.maxX - bounds2.maxX);
  if (rightDeviation <= threshold) {
    result.horizontal.push({
      alignmentType: 'right',
      deviation: rightDeviation,
      confidence: 1 - rightDeviation / threshold
    });
  }

  // 中心对齐
  const centerXDeviation = Math.abs(bounds1.centerX - bounds2.centerX);
  if (centerXDeviation <= threshold) {
    result.horizontal.push({
      alignmentType: 'center-x',
      deviation: centerXDeviation,
      confidence: 1 - centerXDeviation / threshold
    });
  }

  // 检查垂直对齐
  // 顶边对齐
  const topDeviation = Math.abs(bounds1.minY - bounds2.minY);
  if (topDeviation <= threshold) {
    result.vertical.push({
      alignmentType: 'top',
      deviation: topDeviation,
      confidence: 1 - topDeviation / threshold
    });
  }

  // 底边对齐
  const bottomDeviation = Math.abs(bounds1.maxY - bounds2.maxY);
  if (bottomDeviation <= threshold) {
    result.vertical.push({
      alignmentType: 'bottom',
      deviation: bottomDeviation,
      confidence: 1 - bottomDeviation / threshold
    });
  }

  // 中心对齐
  const centerYDeviation = Math.abs(bounds1.centerY - bounds2.centerY);
  if (centerYDeviation <= threshold) {
    result.vertical.push({
      alignmentType: 'center-y',
      deviation: centerYDeviation,
      confidence: 1 - centerYDeviation / threshold
    });
  }

  return result;
}

// 分析相邻关系
export function analyzeAdjacency(
  bounds1: BoundingBox,
  bounds2: BoundingBox,
  threshold: number
): {
  isLeftOf: boolean;
  isRightOf: boolean;
  isAbove: boolean;
  isBelow: boolean;
  distance: number;
} {
  const horizontalOverlap = !(bounds1.maxY < bounds2.minY || bounds1.minY > bounds2.maxY);
  const verticalOverlap = !(bounds1.maxX < bounds2.minX || bounds1.minX > bounds2.maxX);
  
  const result = {
    isLeftOf: false,
    isRightOf: false,
    isAbove: false,
    isBelow: false,
    distance: Infinity
  };

  if (horizontalOverlap) {
    const leftDistance = Math.abs(bounds1.maxX - bounds2.minX);
    const rightDistance = Math.abs(bounds2.maxX - bounds1.minX);
    
    if (leftDistance <= threshold && bounds1.maxX <= bounds2.minX) {
      result.isLeftOf = true;
      result.distance = Math.min(result.distance, leftDistance);
    }
    if (rightDistance <= threshold && bounds2.maxX <= bounds1.minX) {
      result.isRightOf = true;
      result.distance = Math.min(result.distance, rightDistance);
    }
  }

  if (verticalOverlap) {
    const topDistance = Math.abs(bounds1.maxY - bounds2.minY);
    const bottomDistance = Math.abs(bounds2.maxY - bounds1.minY);
    
    if (topDistance <= threshold && bounds1.maxY <= bounds2.minY) {
      result.isAbove = true;
      result.distance = Math.min(result.distance, topDistance);
    }
    if (bottomDistance <= threshold && bounds2.maxY <= bounds1.minY) {
      result.isBelow = true;
      result.distance = Math.min(result.distance, bottomDistance);
    }
  }

  return result;
}

// 检测布局模式
export function detectLayoutPattern(
  relationships: PositionRelationship[]
): {
  type: 'horizontal' | 'vertical' | 'grid' | 'absolute' | 'mixed';
  confidence: number;
  details: {
    rows?: number;
    columns?: number;
    primaryDirection?: 'horizontal' | 'vertical';
    spacing?: { horizontal: number; vertical: number };
  };
} {
  // 分析水平和垂直对齐的数量
  let horizontalAlignments = 0;
  let verticalAlignments = 0;
  let totalConfidence = 0;

  relationships.forEach(rel => {
    horizontalAlignments += rel.alignments.horizontal.length;
    verticalAlignments += rel.alignments.vertical.length;
    
    rel.alignments.horizontal.forEach(align => {
      totalConfidence += align.confidence;
    });
    rel.alignments.vertical.forEach(align => {
      totalConfidence += align.confidence;
    });
  });

  const avgConfidence = totalConfidence / (horizontalAlignments + verticalAlignments || 1);

  // 估算网格的行列数
  const rows = estimateGridRows(relationships);
  const columns = estimateGridColumns(relationships);
  const isGrid = rows > 1 && columns > 1;

  // 分析主要布局方向
  const primaryDirection = horizontalAlignments > verticalAlignments ? 'horizontal' : 'vertical';

  // 计算平均间距
  const spacing = {
    horizontal: calculateAverageSpacing(relationships, 'horizontal'),
    vertical: calculateAverageSpacing(relationships, 'vertical')
  };

  // 判断布局类型
  if (isGrid) {
    return {
      type: 'grid',
      confidence: avgConfidence,
      details: { rows, columns, spacing }
    };
  }

  if (horizontalAlignments === 0 && verticalAlignments === 0) {
    return {
      type: 'absolute',
      confidence: 1,
      details: {}
    };
  }

  if (horizontalAlignments > verticalAlignments * 2) {
    return {
      type: 'horizontal',
      confidence: avgConfidence,
      details: { primaryDirection: 'horizontal', spacing }
    };
  }

  if (verticalAlignments > horizontalAlignments * 2) {
    return {
      type: 'vertical',
      confidence: avgConfidence,
      details: { primaryDirection: 'vertical', spacing }
    };
  }

  return {
    type: 'mixed',
    confidence: avgConfidence,
    details: { primaryDirection, spacing }
  };
}

// 估算网格行数
function estimateGridRows(relationships: PositionRelationship[]): number {
  const uniqueYPositions = new Set<number>();
  relationships.forEach(rel => {
    uniqueYPositions.add(Math.round(rel.bounds.minY));
  });
  return uniqueYPositions.size;
}

// 估算网格列数
function estimateGridColumns(relationships: PositionRelationship[]): number {
  const uniqueXPositions = new Set<number>();
  relationships.forEach(rel => {
    uniqueXPositions.add(Math.round(rel.bounds.minX));
  });
  return uniqueXPositions.size;
}

// 计算平均间距
function calculateAverageSpacing(
  relationships: PositionRelationship[],
  direction: 'horizontal' | 'vertical'
): number {
  const spacings: number[] = [];

  relationships.forEach(rel => {
    const adjacencies = direction === 'horizontal'
      ? [...rel.adjacencies.left, ...rel.adjacencies.right]
      : [...rel.adjacencies.top, ...rel.adjacencies.bottom];

    adjacencies.forEach(adjId => {
      const adjRel = relationships.find(r => r.elementId === adjId);
      if (adjRel) {
        const distance = direction === 'horizontal'
          ? Math.abs(rel.bounds.centerX - adjRel.bounds.centerX)
          : Math.abs(rel.bounds.centerY - adjRel.bounds.centerY);
        spacings.push(distance);
      }
    });
  });

  return spacings.length > 0
    ? Math.round(spacings.reduce((a, b) => a + b) / spacings.length)
    : 0;
} 