import { 
  CHILDREN_NODE_TYPES,
  FLEX_CONTAINER_TYPES,
  INTERACTIVE_ELEMENT_TYPES,
  TEXT_LIKE_TYPES,
  STRETCHABLE_TYPES,
  INTERACTIVE_KEYWORDS,
  STRETCHABLE_KEYWORDS
} from '../types/constants';

// 类型检查函数
export function hasChildren(nodeType: string): boolean {
  return (CHILDREN_NODE_TYPES as readonly string[]).includes(nodeType);
}

// 检查是否可以作为 Flexbox 容器
export function canBeFlexContainer(nodeType: string): boolean {
  return (FLEX_CONTAINER_TYPES as readonly string[]).includes(nodeType);
}

// 检查是否为交互元素
export function isInteractiveElement(node: SceneNode): boolean {
  if ((INTERACTIVE_ELEMENT_TYPES as readonly string[]).includes(node.type)) {
    return true;
  }
  
  const name = node.name.toLowerCase();
  return INTERACTIVE_KEYWORDS.some(keyword => name.includes(keyword));
}

// 检查是否为文本类元素
export function isTextLikeElement(nodeType: string): boolean {
  return (TEXT_LIKE_TYPES as readonly string[]).includes(nodeType);
}

// 检查是否为可拉伸元素
export function isStretchableElement(node: SceneNode): boolean {
  if ((STRETCHABLE_TYPES as readonly string[]).includes(node.type)) {
    return true;
  }
  
  const name = node.name.toLowerCase();
  return STRETCHABLE_KEYWORDS.some(keyword => name.includes(keyword));
}

// 获取节点的 CSS Flexbox 行为配置
export function getFlexItemBehavior(node: SceneNode): {
  flexGrow: number;
  flexShrink: number;
  alignSelf: 'MIN' | 'CENTER' | 'MAX' | 'auto';
  sizingMode: 'FIXED' | 'HUG' | 'FILL';
} {
  const behavior = {
    flexGrow: 0,
    flexShrink: 1,
    alignSelf: 'auto' as const,
    sizingMode: 'HUG' as const
  };
  
  if (isInteractiveElement(node)) {
    behavior.flexShrink = 0;
    behavior.sizingMode = 'FIXED';
  }
  
  if (isStretchableElement(node)) {
    behavior.flexGrow = 1;
    behavior.sizingMode = 'FILL';
  }
  
  if (isTextLikeElement(node.type)) {
    behavior.alignSelf = 'CENTER';
  }
  
  return behavior;
}

// 安全序列化函数
export function safeSerialize(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'symbol' || typeof obj === 'function') {
    return undefined;
  }
  
  if (typeof obj === 'object') {
    if (obj instanceof Array) {
      return obj.map(item => safeSerialize(item)).filter(item => item !== undefined);
    }
    
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const serializedValue = safeSerialize(obj[key]);
        if (serializedValue !== undefined) {
          result[key] = serializedValue;
        }
      }
    }
    return result;
  }
  
  return obj;
}

// 提取简化的节点信息
export function extractSimpleNodeInfo(node: SceneNode): SimpleNodeInfo {
  const info: SimpleNodeInfo = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
    locked: node.locked,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height
  };

  if ('layoutMode' in node) {
    info.layoutMode = node.layoutMode;
    info.itemSpacing = node.itemSpacing;
    info.paddingLeft = node.paddingLeft;
    info.paddingRight = node.paddingRight;
    info.paddingTop = node.paddingTop;
    info.paddingBottom = node.paddingBottom;
  }

  if ('fills' in node) {
    info.fills = safeSerialize(node.fills);
  }

  if ('strokes' in node) {
    info.strokes = safeSerialize(node.strokes);
  }

  if ('characters' in node) {
    info.characters = node.characters;
    info.fontSize = node.fontSize;
    info.fontName = safeSerialize(node.fontName);
    info.textStyleId = node.textStyleId;
  }

  if ('children' in node) {
    info.children = (node.children as SceneNode[]).map(child => 
      extractSimpleNodeInfo(child)
    );
  }

  return info;
}

// 下载节点图片
export async function downloadNodeImage(node: SceneNode): Promise<string | null> {
  try {
    const bytes = await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 }
    });
    
    return `data:image/png;base64,${figma.base64Encode(bytes)}`;
  } catch (error) {
    console.error('Failed to download node image:', error);
    return null;
  }
} 