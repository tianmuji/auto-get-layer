import { BoundingBox, ElementInfo, ElementWithBounds } from '../types/interfaces';

// 计算单个元素的边界框
export function calculateBoundingBox(element: ElementInfo): BoundingBox {
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

// 计算多个元素的联合边界框
export function calculateUnionBounds(elements: ElementWithBounds[]): BoundingBox {
  if (elements.length === 0) {
    throw new Error('Cannot calculate bounds of empty elements array');
  }

  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    width: 0,
    height: 0,
    centerX: 0,
    centerY: 0
  };

  elements.forEach(element => {
    bounds.minX = Math.min(bounds.minX, element.bounds.minX);
    bounds.minY = Math.min(bounds.minY, element.bounds.minY);
    bounds.maxX = Math.max(bounds.maxX, element.bounds.maxX);
    bounds.maxY = Math.max(bounds.maxY, element.bounds.maxY);
  });

  bounds.width = bounds.maxX - bounds.minX;
  bounds.height = bounds.maxY - bounds.minY;
  bounds.centerX = bounds.minX + bounds.width / 2;
  bounds.centerY = bounds.minY + bounds.height / 2;

  return bounds;
}

// 检查两个边界框是否相邻
export function areBoxesNearby(box1: BoundingBox, box2: BoundingBox, threshold: number = 50): boolean {
  const horizontalOverlap = !(box1.maxX < box2.minX - threshold || box1.minX > box2.maxX + threshold);
  const verticalOverlap = !(box1.maxY < box2.minY - threshold || box1.minY > box2.maxY + threshold);
  return horizontalOverlap || verticalOverlap;
}

// 检查一个边界框是否完全包含另一个
export function isCompletelyContained(inner: BoundingBox, outer: BoundingBox): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY &&
    inner.maxY <= outer.maxY
  );
}

// 计算一组元素的边界
export function calculateElementsBounds(elements: ElementInfo[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (elements.length === 0) {
    throw new Error('Cannot calculate bounds of empty elements array');
  }

  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    width: 0,
    height: 0
  };

  elements.forEach(element => {
    bounds.minX = Math.min(bounds.minX, element.x);
    bounds.minY = Math.min(bounds.minY, element.y);
    bounds.maxX = Math.max(bounds.maxX, element.x + element.width);
    bounds.maxY = Math.max(bounds.maxY, element.y + element.height);
  });

  bounds.width = bounds.maxX - bounds.minX;
  bounds.height = bounds.maxY - bounds.minY;

  return bounds;
}

// 检查对齐关系
export function checkAlignment(
  elem1: ElementInfo,
  elem2: ElementInfo,
  threshold: number
): {
  isAligned: boolean;
  type: 'horizontal' | 'vertical' | 'both';
  distance: number;
} {
  const horizontalAligned = Math.abs(elem1.y - elem2.y) <= threshold;
  const verticalAligned = Math.abs(elem1.x - elem2.x) <= threshold;
  
  let type: 'horizontal' | 'vertical' | 'both' = 'horizontal';
  let distance = Math.abs(elem1.y - elem2.y);
  
  if (verticalAligned && !horizontalAligned) {
    type = 'vertical';
    distance = Math.abs(elem1.x - elem2.x);
  } else if (verticalAligned && horizontalAligned) {
    type = 'both';
    distance = Math.sqrt(
      Math.pow(elem1.x - elem2.x, 2) + Math.pow(elem1.y - elem2.y, 2)
    );
  }
  
  return {
    isAligned: horizontalAligned || verticalAligned,
    type,
    distance
  };
} 