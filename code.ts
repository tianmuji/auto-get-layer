// This plugin will open a tab that indicates that it will monitor the current
// selection on the page. It cannot change the document itself.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 380, height: 520 });

// 具备 children 的节点类型（递归/分组/结构检查专用，官方 ChildrenMixin 类型）
const CHILDREN_NODE_TYPES = [
  "FRAME",
  "COMPONENT",
  "COMPONENT_SET",
  "INSTANCE",
  "PAGE",
  "DOCUMENT",
  "SECTION",
  "TABLE",
  "TABLE_CELL",
  "BOOLEAN_OPERATION"
] as const;

// === CSS Flexbox 规范对应的节点分类 ===

// 支持自动布局的节点类型 (CSS Flexbox 容器)
const FLEX_CONTAINER_TYPES = [
  "FRAME",
  "COMPONENT", 
  "INSTANCE"
] as const;

// 交互元素类型 (通常需要固定尺寸，对应 CSS flex-shrink: 0)
const INTERACTIVE_ELEMENT_TYPES = [
  "COMPONENT",      // 组件
  "INSTANCE"        // 组件实例
] as const;

// 文本类元素 (对应 CSS align-items: baseline，但Figma用center代替)
const TEXT_LIKE_TYPES = [
  "TEXT",
  "CODE_BLOCK",
  "SHAPE_WITH_TEXT"
] as const;

// 可拉伸的图形元素 (对应 CSS flex-grow: 1)
const STRETCHABLE_TYPES = [
  "RECTANGLE",
  "ELLIPSE", 
  "VECTOR",
  "POLYGON",
  "STAR"
] as const;

// 类型检查函数
function hasChildren(nodeType: string): boolean {
  return (CHILDREN_NODE_TYPES as readonly string[]).includes(nodeType);
}

// === CSS Flexbox 规范对应的类型检查函数 ===

// 检查是否可以作为 Flexbox 容器 (display: flex)
function canBeFlexContainer(nodeType: string): boolean {
  return (FLEX_CONTAINER_TYPES as readonly string[]).includes(nodeType);
}

// 检查是否为交互元素 (flex-shrink: 0)
function isInteractiveElement(node: SceneNode): boolean {
  if ((INTERACTIVE_ELEMENT_TYPES as readonly string[]).includes(node.type)) {
    return true;
  }
  
  // 基于名称检查是否为交互元素
  const name = node.name.toLowerCase();
  const interactiveKeywords = [
    'button', 'btn', 'input', 'field', 'checkbox', 'radio', 'switch', 'slider',
    '按钮', '输入', '复选', '单选', '开关', '滑块', 'toggle', 'dropdown', 'select'
  ];
  
  return interactiveKeywords.some(keyword => name.includes(keyword));
}

// 检查是否为文本类元素 (align-items: baseline -> center)
function isTextLikeElement(nodeType: string): boolean {
  return (TEXT_LIKE_TYPES as readonly string[]).includes(nodeType);
}

// 检查是否为可拉伸元素 (flex-grow: 1)
function isStretchableElement(node: SceneNode): boolean {
  if ((STRETCHABLE_TYPES as readonly string[]).includes(node.type)) {
    return true;
  }
  
  // 基于名称检查是否为可拉伸元素
  const name = node.name.toLowerCase();
  const stretchKeywords = [
    'spacer', 'divider', 'separator', 'fill', 'stretch', 'expand',
    '占位', '分隔', '填充', '拉伸', '扩展'
  ];
  
  return stretchKeywords.some(keyword => name.includes(keyword));
}

// 获取节点的 CSS Flexbox 行为配置
function getFlexItemBehavior(node: SceneNode): {
  flexGrow: number;
  flexShrink: number;
  alignSelf: 'MIN' | 'CENTER' | 'MAX' | 'auto';
  sizingMode: 'FIXED' | 'HUG' | 'FILL';
} {
  const behavior: {
    flexGrow: number;
    flexShrink: number;
    alignSelf: 'MIN' | 'CENTER' | 'MAX' | 'auto';
    sizingMode: 'FIXED' | 'HUG' | 'FILL';
  } = {
    flexGrow: 0,
    flexShrink: 1,
    alignSelf: 'auto',
    sizingMode: 'HUG'
  };
  
  // 交互元素：固定尺寸，不收缩 (flex-shrink: 0)
  if (isInteractiveElement(node)) {
    behavior.flexShrink = 0;
    behavior.sizingMode = 'FIXED';
  }
  
  // 可拉伸元素：可增长 (flex-grow: 1)
  if (isStretchableElement(node)) {
    behavior.flexGrow = 1;
    behavior.sizingMode = 'FILL';
  }
  
  // 文本类元素：居中对齐 (align-items: center)
  if (isTextLikeElement(node.type)) {
    behavior.alignSelf = 'CENTER';
  }
  
  return behavior;
}

// 安全序列化函数，移除所有不可序列化的数据
// todo 支持循环引用对象
interface SerializableData {
  [key: string]: string | number | boolean | null | undefined | SerializableData | SerializableData[];
}

function safeSerialize(obj: SerializableData): SerializableData {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(safeSerialize).filter(item => item !== undefined);
  }

  if (typeof obj === 'object') {
    const result: SerializableData = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
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

// UI规范检查结果接口
interface DesignRuleViolation {
  nodeId: string;
  nodeName: string;
  type: string;
  violations: string[];
  suggestions: string[];
}

interface FixResult {
  nodeId: string;
  nodeName: string;
  originalType: string;
  newType?: string;
  fixes: string[];
  success: boolean;
  error?: string;
}

// 精简的节点信息接口
interface Fill {
  type: string;
  color?: { r: number; g: number; b: number; a: number };
  opacity?: number;
}

interface Stroke {
  type: string;
  color?: { r: number; g: number; b: number; a: number };
  weight?: number;
}

interface FontName {
  family: string;
  style: string;
}

interface SimpleNodeInfo {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  locked?: boolean;
  // Frame特有属性
  layoutMode?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  // 位置和尺寸
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // 填充和描边
  fills?: Fill[];
  strokes?: Stroke[];
  // 文本特有属性
  characters?: string;
  fontSize?: number;
  fontName?: FontName;
  textStyleId?: string;
  // 子节点
  children?: SimpleNodeInfo[];
}

// 提取节点精简信息的函数
function extractSimpleNodeInfo(node: SceneNode): SimpleNodeInfo {
  const info: SimpleNodeInfo = {
    id: node.id,
    name: node.name || 'Unnamed',
    type: node.type,
    visible: node.visible,
    locked: node.locked
  };

  // 添加位置和尺寸信息
  if ('x' in node) info.x = Math.round(node.x * 100) / 100;
  if ('y' in node) info.y = Math.round(node.y * 100) / 100;
  if ('width' in node) info.width = Math.round(node.width * 100) / 100;
  if ('height' in node) info.height = Math.round(node.height * 100) / 100;

  // Frame/Component特有属性
  if (hasChildren(node.type) && 'layoutMode' in node) {
    const frameNode = node as FrameNode;
    if (frameNode.layoutMode !== 'NONE') {
      info.layoutMode = frameNode.layoutMode;
      info.itemSpacing = frameNode.itemSpacing;
      info.paddingLeft = frameNode.paddingLeft;
      info.paddingRight = frameNode.paddingRight;
      info.paddingTop = frameNode.paddingTop;
      info.paddingBottom = frameNode.paddingBottom;
    }
  }

  // 文本特有属性
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    info.characters = textNode.characters;
    info.fontSize = textNode.fontSize as number;
    // 安全地序列化fontName，避免Symbol
    if (textNode.fontName && typeof textNode.fontName === 'object') {
      info.fontName = {
        family: textNode.fontName.family,
        style: textNode.fontName.style
      };
    }
    info.textStyleId = textNode.textStyleId && textNode.textStyleId !== figma.mixed ? textNode.textStyleId : undefined;
  }

  // 填充和描边信息（简化，避免Symbol序列化问题）
  if ('fills' in node && node.fills && Array.isArray(node.fills)) {
    try {
      const fills = node.fills as Paint[];
      info.fills = fills.map(fill => {
        if (fill.type === 'SOLID') {
          return {
            type: 'SOLID',
            color: fill.color ? {
              r: Number(fill.color.r) || 0,
              g: Number(fill.color.g) || 0,
              b: Number(fill.color.b) || 0
            } : { r: 0, g: 0, b: 0 },
            opacity: Number(fill.opacity) || 1
          };
        }
        return { type: fill.type };
      });
    } catch (e) {
      console.warn('处理fills时出错:', e);
      info.fills = [];
    }
  }

  if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
    try {
      const strokes = node.strokes as Paint[];
      if (strokes.length > 0) {
        info.strokes = strokes.map(stroke => ({
          type: stroke.type,
          color: stroke.type === 'SOLID' && stroke.color ? {
            r: Number(stroke.color.r) || 0,
            g: Number(stroke.color.g) || 0,
            b: Number(stroke.color.b) || 0
          } : undefined
        }));
      }
    } catch (e) {
      console.warn('处理strokes时出错:', e);
      info.strokes = [];
    }
  }

  // 递归处理子节点
  if (hasChildren(node.type) && 'children' in node && node.children.length > 0) {
    info.children = node.children.map(child => extractSimpleNodeInfo(child as SceneNode));
  }

  return info;
}

// 下载节点图片的函数
async function downloadNodeImage(node: SceneNode): Promise<string | null> {
  try {
    const imageData = await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 }
    });
    
    // 将图片数据转换为base64
    const base64 = figma.base64Encode(imageData);
    return base64;
  } catch (error) {
    console.warn('下载节点图片失败:', error);
    return null;
  }
}

// 校验节点下所有节点是否都使用了自动布局
function checkAllNodesAutoLayout(node: SceneNode): DesignRuleViolation[] {
  const violations: DesignRuleViolation[] = [];
  
  // 支持自动布局的节点类型（根据 Figma 官方文档）
  const AUTO_LAYOUT_CAPABLE_TYPES = ['FRAME', 'COMPONENT', 'INSTANCE'];

  // 判断是否为纯图标型INSTANCE（只包含VECTOR或GROUP）
  function isPureIconInstance(node: SceneNode): boolean {
    if (node.type !== 'INSTANCE' || !('children' in node)) return false;
    const children = node.children as SceneNode[];
    if (!children || children.length === 0) return false;
    return children.every(c => c.type === 'VECTOR' || c.type === 'GROUP');
  }

  // 判断是否为素材型容器（通过节点名称识别）
  function isMaterialContainer(node: SceneNode): boolean {
    const nodeName = (node.name || '').toLowerCase();
    const materialKeywords = [
      'cs_ic', 'icon', '图标', '素材', 'decoration', 'vector', '图形',
      '预览图', '缩略图', 'thumbnail', 'preview', 'image', '背景', 'background',
      '角标', 'badge', 'logo', '徽标', '装饰'
    ];
    return materialKeywords.some(keyword => nodeName.includes(keyword));
  }
  
  function recursiveCheck(currentNode: SceneNode, path: string[] = []): void {
    // 图标型INSTANCE豁免自动布局检查
    if (currentNode.type === 'INSTANCE' && isPureIconInstance(currentNode)) {
      return;
    }
    
    // 素材型容器豁免自动布局检查，且不递归检查子节点
    if (isMaterialContainer(currentNode)) {
      return;
    }
    // 检查当前节点是否支持自动布局
    if (AUTO_LAYOUT_CAPABLE_TYPES.includes(currentNode.type)) {
      const frameNode = currentNode as FrameNode | ComponentNode | InstanceNode;
      
      // 检查是否有子节点且未启用自动布局
      if ('children' in frameNode && frameNode.children && frameNode.children.length > 0) {
        const hasLayoutMode = 'layoutMode' in frameNode;
        const layoutMode = hasLayoutMode ? (frameNode as any).layoutMode : 'NONE';
        
        if (!hasLayoutMode || layoutMode === 'NONE') {
          const nodePath = [...path, currentNode.name || 'Unnamed'].join(' > ');
          violations.push({
            nodeId: currentNode.id,
            nodeName: currentNode.name || 'Unnamed',
            type: currentNode.type,
            violations: [`路径 "${nodePath}" 中的 ${currentNode.type} 节点未启用自动布局`],
            suggestions: ['建议启用自动布局以提高响应性和维护性']
          });
        }
      }
    }
    
    // 递归检查子节点
    if (hasChildren(currentNode.type) && 'children' in currentNode) {
      const childrenNode = currentNode as SceneNode & { children: SceneNode[] };
      if (childrenNode.children) {
        for (const child of childrenNode.children) {
          recursiveCheck(child, [...path, currentNode.name || 'Unnamed']);
        }
      }
    }
  }
  
  // 开始递归检查
  recursiveCheck(node);
  
  return violations;
}

// 检查根Frame分组结构
function checkRootGrouping(root: FrameNode): DesignRuleViolation[] {
  const children = root.children;
  const atomicTypes = ['TEXT', 'VECTOR', 'RECTANGLE', 'ELLIPSE', 'IMAGE', 'INSTANCE'];
  const nonGroupCount = children.filter(child => atomicTypes.includes(child.type)).length;
  const groupCount = children.filter(child => hasChildren(child.type)).length;
  const violations: DesignRuleViolation[] = [];

  if (children.length > 5 && groupCount === 0) {
    violations.push({
      nodeId: root.id,
      nodeName: root.name || 'Unnamed',
      type: root.type,
      violations: ['根Frame下元素过多，建议分组管理'],
      suggestions: ['请将相关元素用Frame/Component进行分组，提升结构清晰度和可维护性']
    });
  }
  if (nonGroupCount === children.length && children.length > 2) {
    violations.push({
      nodeId: root.id,
      nodeName: root.name || 'Unnamed',
      type: root.type,
      violations: ['根Frame下全为原子元素，建议分组'],
      suggestions: ['请将同类元素用Frame/Component进行分组，提升结构清晰度']
    });
  }
  // 子节点过多
  if (children.length > 20) {
    violations.push({
      nodeId: root.id,
      nodeName: root.name || 'Unnamed',
      type: root.type,
      violations: ['子节点数量过多，建议分组优化'],
      suggestions: ['建议将子节点分组，避免单层过多元素导致维护困难']
    });
  }
  return violations;
}

// 递归分析节点是否符合UI规范，增加 depth 和 rootAncestor 参数
function analyzeDesignRules(node: SceneNode, violations: DesignRuleViolation[] = [], depth = 1, rootAncestor?: SceneNode): DesignRuleViolation[] {
  const nodeViolations: string[] = [];
  const suggestions: string[] = [];

  // 记录递归的最远公共祖先（本次 analyzeDesignRules 的 root）
  const ancestor = rootAncestor || node;

  // 素材型节点类型，这些节点不需要检查任何UI规范
  const MATERIAL_NODE_TYPES = ['VECTOR', 'RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'LINE', 'SHAPE_WITH_TEXT', 'IMAGE'];

  // 判断是否为素材型容器（通过节点名称识别）
  function isMaterialContainer(node: SceneNode): boolean {
    const nodeName = (node.name || '').toLowerCase();
    const materialKeywords = [
      'cs_ic', 'icon', '图标', '素材', 'decoration', 'vector', '图形',
      '预览图', '缩略图', 'thumbnail', 'preview', 'image', '背景', 'background',
      '角标', 'badge', 'logo', '徽标', '装饰'
    ];
    return materialKeywords.some(keyword => nodeName.includes(keyword));
  }

  // 对于素材型节点，直接跳过所有UI规范检查，只递归检查子节点
  if (MATERIAL_NODE_TYPES.includes(node.type)) {
    // 递归检查子节点
    if (hasChildren(node.type) && 'children' in node) {
      for (const child of node.children) {
        analyzeDesignRules(child as SceneNode, violations, depth + 1, ancestor);
      }
    }
    return violations;
  }

  // 对于素材型容器，跳过所有UI规范检查，且不递归检查子节点
  if (isMaterialContainer(node)) {
    return violations;
  }

  // 层级过深检查 - 只对容器类节点检查，叶子节点无法控制层级
  const isContainerNode = hasChildren(node.type);
  if (isContainerNode && depth > 6) {
    nodeViolations.push('节点层级过深，建议简化结构');
    suggestions.push('建议减少嵌套层级，提升可维护性和性能');
  }

  // 检查自动布局规范 - 只对明显应该使用自动布局的容器检查
  if (hasChildren(node.type) && 'children' in node && node.children.length > 1) { // 至少2个子元素
    if (["FRAME", "COMPONENT"].includes(node.type)) {
      const frameNode = node as FrameNode;
      if (!frameNode.layoutMode || frameNode.layoutMode === 'NONE') {
        // 检查是否是应该使用自动布局的场景
        const childrenTypes = node.children.map(child => child.type);
        const hasMultipleTextOrButtons = childrenTypes.filter(type => 
          type === 'TEXT' || type === 'INSTANCE' || type === 'COMPONENT'
        ).length > 1;
        
        // 只对明显的列表、按钮组、菜单等结构建议使用自动布局
        if (hasMultipleTextOrButtons && node.children.length > 2) {
          nodeViolations.push('包含多个交互元素的容器建议使用自动布局');
          suggestions.push('建议启用自动布局以提高响应性和维护性');
        }
      }
    }
    // 子节点过多
    if (node.children.length > 20) {
      nodeViolations.push('子节点数量过多，建议分组优化');
      suggestions.push('建议将子节点分组，避免单层过多元素导致维护困难');
    }
    // --- 素材型节点命名检查 ---
    // 如果当前节点或祖先节点已经是素材型容器，跳过检查
    const currentNodeName = (node.name || '').toLowerCase();
    const ancestorName = (ancestor?.name || '').toLowerCase();
    const allMaterialKeywords = ['cs_ic', 'icon', '图标', '素材', 'decoration', 'vector', '图形', '预览图', '缩略图', 'thumbnail', 'preview', 'image', '背景', 'background', '角标', 'badge', 'logo', '徽标', '装饰'];
    
    const isCurrentNodeMaterial = allMaterialKeywords.some(keyword => currentNodeName.includes(keyword));
    const isAncestorMaterial = allMaterialKeywords.some(keyword => ancestorName.includes(keyword));
    
    if (!isCurrentNodeMaterial && !isAncestorMaterial) {
      const vectorTypes = ['VECTOR', 'ELLIPSE', 'RECTANGLE', 'POLYGON', 'STAR', 'LINE', 'SHAPE_WITH_TEXT'];
      const vectorCount = node.children.filter(child => vectorTypes.includes(child.type)).length;
      if (node.children.length > 5 && vectorCount / node.children.length > 0.8) {
        // 检查最远公共祖先（本次 analyzeDesignRules 的 root）
        const basicKeywords = ['icon', '素材', 'decoration', 'vector', '图形'];
        if (!basicKeywords.some(k => ancestorName.includes(k))) {
          nodeViolations.push('大量矢量子元素，建议最外层分组命名中包含"icon/素材/decoration/vector/图形"等标识');
          suggestions.push('请为最外层分组命名加上"icon/素材/decoration/vector/图形"等关键词，便于识别素材类分组');
        }
      }
    }
  }

  // 检查分层规范
  if (node.type === 'GROUP') {
    nodeViolations.push('使用了Group而非Frame');
    suggestions.push('建议将Group转换为Frame并使用自动布局');
  }

  // 检查文本节点规范 - 暂时跳过文本样式检查（历史原因）
  // if (node.type === 'TEXT') {
  //   if (!node.textStyleId) {
  //     nodeViolations.push('文本未使用文本样式');
  //     suggestions.push('建议使用预定义的文本样式以保持一致性');
  //   }
  // }

  // 检查颜色规范 - 暂时跳过（很多团队不使用Variables）
  // if ('fills' in node && node.fills && Array.isArray(node.fills)) {
  //   const fills = node.fills as Paint[];
  //   fills.forEach(fill => {
  //     if (fill.type === 'SOLID' && !fill.boundVariables) {
  //       nodeViolations.push('颜色未使用设计token');
  //       suggestions.push('建议使用变量(Variables)或样式(Styles)来管理颜色');
  //     }
  //   });
  // }

  // 检查间距规范 - 暂时禁用（很多设计场景下itemSpacing为0是合理的）
  // 例如：菜单、导航栏、紧密排列的卡片等都可能需要无间距设计
  // if ('children' in node && node.children.length > 4) { 
  //   if ((node.type === 'FRAME' || node.type === 'COMPONENT') && 'layoutMode' in node && 'itemSpacing' in node) {
  //     if (node.layoutMode !== 'NONE') {
  //       // 排除菜单、导航等常见的无间距设计场景
  //       const isMenuLike = node.name.includes('菜单') || node.name.includes('Menu') || 
  //                         node.name.includes('导航') || node.name.includes('Nav');
  //       const hasVeryManyElements = node.children.length > 6;
        
  //       if (node.itemSpacing === 0 && hasVeryManyElements && !isMenuLike) {
  //         nodeViolations.push('容器内多个元素可考虑设置间距');
  //         suggestions.push('可考虑为多个并列元素设置合适的间距，提升视觉层次');
  //       }
  //     }
  //   }
  // }

  // 检查命名规范 - 只检查复杂的布局容器
  const isImportantNode = ['FRAME', 'COMPONENT', 'INSTANCE'].includes(node.type);
  const hasChildrenNodes = hasChildren(node.type) && 'children' in node && node.children.length > 0;
  const isDefaultName = !node.name || 
    (node.name.startsWith('Rectangle') && node.type !== 'RECTANGLE') ||
    (node.name.startsWith('Ellipse') && node.type !== 'ELLIPSE') ||
    (node.name.startsWith('Frame') && isImportantNode);
  
  // 只检查复杂的布局容器，过滤简单组件
  if (isImportantNode && hasChildrenNodes && isDefaultName) {
    // 判断是否为复杂容器
    const hasMultipleChildren = node.children.length > 3;  // 提高到3+个子元素
    const isLargeContainer = ('width' in node && 'height' in node && 
                             (node.width > 200 || node.height > 150));  // 提高尺寸阈值
    const childTypes = node.children.map(child => child.type);
    const hasVariedChildTypes = new Set(childTypes).size > 2;  // 需要3+种不同类型
    
    // 排除常见的简单组合模式
    const isSimpleIconTextCombo = node.children.length === 2 && 
      childTypes.includes('TEXT') && 
      (childTypes.includes('FRAME') || childTypes.includes('INSTANCE') || childTypes.includes('VECTOR'));
    
    // 只对真正复杂的布局容器检查命名，排除简单组合
    if ((hasMultipleChildren || isLargeContainer || hasVariedChildTypes) && !isSimpleIconTextCombo) {
      nodeViolations.push('复杂布局容器建议使用语义化命名');
      suggestions.push('建议为复杂容器使用描述性命名，如 "NavigationBar" 或 "ProductCard"');
    }
  }

  // 如果有违规，添加到结果中
  if (nodeViolations.length > 0) {
    violations.push({
      nodeId: node.id,
      nodeName: node.name || 'Unnamed',
      type: node.type,
      violations: nodeViolations,
      suggestions: suggestions
    });
  }

  // 递归检查子节点
  if (hasChildren(node.type) && 'children' in node) {
    for (const child of node.children) {
      analyzeDesignRules(child as SceneNode, violations, depth + 1, ancestor);
    }
  }

  return violations;
}

// === 自动修复功能 ===

// 样式快照接口
interface StyleSnapshot {
  containerBounds: { x: number; y: number; width: number; height: number };
  childrenBounds: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    relativeX: number;
    relativeY: number;
  }>;
  measuredSpacing: {
    horizontal: number[];
    vertical: number[];
    averageHorizontal: number;
    averageVertical: number;
    mostCommonHorizontal: number;
    mostCommonVertical: number;
  };
  measuredPadding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  detectedAlignment: {
    horizontal: 'MIN' | 'CENTER' | 'MAX';
    vertical: 'MIN' | 'CENTER' | 'MAX';
  };
  detectedDirection: 'HORIZONTAL' | 'VERTICAL';
}

// 创建样式快照
function createStyleSnapshot(node: SceneNode): StyleSnapshot | null {
  try {
    if (!hasChildren(node.type) || !('children' in node) || 
        !('x' in node) || !('y' in node) || !('width' in node) || !('height' in node)) {
      return null;
    }

    const children = node.children;
    if (children.length === 0) {
      return null;
    }

    // 记录容器边界
    const containerBounds = {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height
    };

    // 记录所有子节点的边界
    const childrenBounds = children.map(child => {
      if ('x' in child && 'y' in child && 'width' in child && 'height' in child) {
        // 计算相对坐标，确保是正确的相对位置
        let relativeX = child.x - node.x;
        let relativeY = child.y - node.y;
        
        // 如果相对坐标为负数，可能数据有问题，直接使用子元素坐标
        if (relativeX < 0) {
          console.warn(`子元素 ${child.id} 的相对X坐标为负数 (${relativeX})，使用绝对坐标 ${child.x}`);
          relativeX = child.x;
        }
        if (relativeY < 0) {
          console.warn(`子元素 ${child.id} 的相对Y坐标为负数 (${relativeY})，使用绝对坐标 ${child.y}`);
          relativeY = child.y;
        }
        
        return {
          id: child.id,
          x: child.x,
          y: child.y,
          width: child.width,
          height: child.height,
          relativeX: relativeX,
          relativeY: relativeY
        };
      }
      return null;
    }).filter(Boolean) as any[];

    // 测量实际间距
    const horizontalSpacing: number[] = [];
    const verticalSpacing: number[] = [];

    for (let i = 0; i < childrenBounds.length - 1; i++) {
      const current = childrenBounds[i];
      const next = childrenBounds[i + 1];

      // 计算水平间距
      const horizontalGap = next.x - (current.x + current.width);
      if (horizontalGap >= 0) {
        horizontalSpacing.push(horizontalGap);
      }

      // 计算垂直间距
      const verticalGap = next.y - (current.y + current.height);
      if (verticalGap >= 0) {
        verticalSpacing.push(verticalGap);
      }
    }

    // 计算最常见的间距
    const getMostCommon = (arr: number[]): number => {
      if (arr.length === 0) return 0;
      const frequency: { [key: number]: number } = {};
      arr.forEach(val => {
        const rounded = Math.round(val);
        frequency[rounded] = (frequency[rounded] || 0) + 1;
      });
      return Number(Object.keys(frequency).reduce((a, b) => frequency[Number(a)] > frequency[Number(b)] ? a : b));
    };

    const measuredSpacing = {
      horizontal: horizontalSpacing,
      vertical: verticalSpacing,
      averageHorizontal: horizontalSpacing.length > 0 ? horizontalSpacing.reduce((a, b) => a + b, 0) / horizontalSpacing.length : 0,
      averageVertical: verticalSpacing.length > 0 ? verticalSpacing.reduce((a, b) => a + b, 0) / verticalSpacing.length : 0,
      mostCommonHorizontal: getMostCommon(horizontalSpacing),
      mostCommonVertical: getMostCommon(verticalSpacing)
    };

    // 测量实际填充
    const leftPadding = Math.max(0, Math.min(...childrenBounds.map(child => child.relativeX)));
    const topPadding = Math.max(0, Math.min(...childrenBounds.map(child => child.relativeY)));
    const maxRightEdge = Math.max(...childrenBounds.map(child => child.relativeX + child.width));
    const maxBottomEdge = Math.max(...childrenBounds.map(child => child.relativeY + child.height));
    const rightPadding = Math.max(0, containerBounds.width - maxRightEdge);
    const bottomPadding = Math.max(0, containerBounds.height - maxBottomEdge);
    
    console.log('Padding 计算调试信息:', {
      containerWidth: containerBounds.width,
      containerHeight: containerBounds.height,
      containerPosition: { x: containerBounds.x, y: containerBounds.y },
      childrenAbsolutePositions: childrenBounds.map(child => ({ id: child.id, x: child.x, y: child.y, width: child.width, height: child.height })),
      childrenRelativePositions: childrenBounds.map(child => ({ id: child.id, relativeX: child.relativeX, relativeY: child.relativeY })),
      maxRightEdge,
      maxBottomEdge,
      计算出的填充: { leftPadding, topPadding, rightPadding, bottomPadding }
    });

    // 验证 padding 值的合理性
    if (leftPadding > containerBounds.width * 0.8 || rightPadding > containerBounds.width * 0.8 ||
        topPadding > containerBounds.height * 0.8 || bottomPadding > containerBounds.height * 0.8) {
      console.warn('检测到异常的 padding 值，可能是坐标计算问题');
      // 使用保守的默认值
      const measuredPadding = {
        left: 10,
        top: 10,
        right: 10,
        bottom: 10
      };
      console.log('使用默认 padding 值:', measuredPadding);
      return {
        containerBounds,
        childrenBounds,
        measuredSpacing,
        measuredPadding,
        detectedAlignment: {
          horizontal: 'CENTER',
          vertical: 'MIN'
        },
        detectedDirection: 'VERTICAL'
      };
    }

    const measuredPadding = {
      left: leftPadding,
      top: topPadding,
      right: rightPadding,
      bottom: bottomPadding
    };

    // 检测实际对齐方式
    const tolerance = 2; // 2px容差
    const containerCenterX = containerBounds.width / 2;
    const containerCenterY = containerBounds.height / 2;

    // 检测水平对齐
    let horizontalAlignment: 'MIN' | 'CENTER' | 'MAX' = 'MIN';
    const childCentersX = childrenBounds.map(child => child.relativeX + child.width / 2);
    const childRights = childrenBounds.map(child => child.relativeX + child.width);

    if (childCentersX.every(centerX => Math.abs(centerX - containerCenterX) <= tolerance)) {
      horizontalAlignment = 'CENTER';
    } else if (childRights.every(right => Math.abs(right - containerBounds.width) <= tolerance)) {
      horizontalAlignment = 'MAX';
    }

    // 检测垂直对齐
    let verticalAlignment: 'MIN' | 'CENTER' | 'MAX' = 'MIN';
    const childCentersY = childrenBounds.map(child => child.relativeY + child.height / 2);
    const childBottoms = childrenBounds.map(child => child.relativeY + child.height);

    if (childCentersY.every(centerY => Math.abs(centerY - containerCenterY) <= tolerance)) {
      verticalAlignment = 'CENTER';
    } else if (childBottoms.every(bottom => Math.abs(bottom - containerBounds.height) <= tolerance)) {
      verticalAlignment = 'MAX';
    }

    // 基于实际位置检测布局方向
    let detectedDirection: 'HORIZONTAL' | 'VERTICAL' = 'VERTICAL';
    
    if (horizontalSpacing.length > 0 && verticalSpacing.length > 0) {
      // 比较水平和垂直间距的数量和一致性
      const horizontalConsistency = horizontalSpacing.filter(gap => Math.abs(gap - measuredSpacing.mostCommonHorizontal) <= 2).length;
      const verticalConsistency = verticalSpacing.filter(gap => Math.abs(gap - measuredSpacing.mostCommonVertical) <= 2).length;
      
      if (horizontalConsistency > verticalConsistency) {
        detectedDirection = 'HORIZONTAL';
      }
    } else if (horizontalSpacing.length > verticalSpacing.length) {
      detectedDirection = 'HORIZONTAL';
    }

    return {
      containerBounds,
      childrenBounds,
      measuredSpacing,
      measuredPadding,
      detectedAlignment: {
        horizontal: horizontalAlignment,
        vertical: verticalAlignment
      },
      detectedDirection
    };

  } catch (error) {
    console.error('创建样式快照失败:', error);
    return null;
  }
}

// 验证样式是否保持一致
function verifyStyleConsistency(node: SceneNode, originalSnapshot: StyleSnapshot | NodeSnapshot): { consistent: boolean; differences: string[] } {
  try {
    const differences: string[] = [];
    const tolerance = 2; // 2px容差，稍微宽松一点
    
    // 检查容器尺寸
    const originalWidth = 'width' in originalSnapshot ? originalSnapshot.width : 
                         ('containerBounds' in originalSnapshot ? originalSnapshot.containerBounds.width : node.width);
    const originalHeight = 'height' in originalSnapshot ? originalSnapshot.height : 
                          ('containerBounds' in originalSnapshot ? originalSnapshot.containerBounds.height : node.height);
    
    if (Math.abs(node.width - originalWidth) > tolerance ||
        Math.abs(node.height - originalHeight) > tolerance) {
      differences.push('容器尺寸发生变化');
    }

    // 如果是 NodeSnapshot，检查子节点位置
    if ('children' in originalSnapshot && hasChildren(node.type) && 'children' in node) {
      try {
        const currentChildren = node.children;
        const originalChildren = originalSnapshot.children;
        
        for (let i = 0; i < Math.min(currentChildren.length, originalChildren.length); i++) {
          const current = currentChildren[i];
          const original = originalChildren[i];

          if (Math.abs(current.x - original.x) > tolerance ||
              Math.abs(current.y - original.y) > tolerance) {
            differences.push(`子节点 ${i + 1} 位置发生变化`);
          }

          if (Math.abs(current.width - original.width) > tolerance ||
              Math.abs(current.height - original.height) > tolerance) {
            differences.push(`子节点 ${i + 1} 尺寸发生变化`);
          }
        }
      } catch (childError) {
        console.warn('检查子节点时出错:', childError);
        differences.push('子节点检查失败');
      }
    }
    
    // 如果是 StyleSnapshot，使用更详细的检查
    if ('containerBounds' in originalSnapshot) {
      const currentSnapshot = createStyleSnapshot(node);
      if (!currentSnapshot) {
        return { consistent: false, differences: ['无法创建当前样式快照'] };
      }

      // 检查子节点相对位置
      for (let i = 0; i < Math.min(currentSnapshot.childrenBounds.length, originalSnapshot.childrenBounds.length); i++) {
        const current = currentSnapshot.childrenBounds[i];
        const original = originalSnapshot.childrenBounds[i];

        if (Math.abs(current.relativeX - original.relativeX) > tolerance ||
            Math.abs(current.relativeY - original.relativeY) > tolerance) {
          differences.push(`子节点 ${i + 1} 相对位置发生变化`);
        }
      }
    }

    return {
      consistent: differences.length === 0,
      differences
    };

  } catch (error) {
    console.error('验证样式一致性失败:', error);
    return { consistent: false, differences: ['验证过程发生错误'] };
  }
}

// 基于样式快照计算精确间距
function calculateOptimalSpacing(snapshot: StyleSnapshot, direction: 'HORIZONTAL' | 'VERTICAL'): number {
  try {
    const spacing = direction === 'HORIZONTAL' ? 
      snapshot.measuredSpacing.mostCommonHorizontal : 
      snapshot.measuredSpacing.mostCommonVertical;
    
    // 使用最常见的间距值，这样能最好地保持原有样式
    if (spacing >= 0) {
      return Math.round(spacing);
    }
    
    // 如果没有有效的间距测量，使用平均值
    const avgSpacing = direction === 'HORIZONTAL' ? 
      snapshot.measuredSpacing.averageHorizontal : 
      snapshot.measuredSpacing.averageVertical;
    
    if (avgSpacing >= 0) {
      return Math.round(avgSpacing);
    }
    
    // 最后回退到默认值
    return 8;
  } catch (error) {
    console.warn('计算间距失败:', error);
    return 8;
  }
}

// 基于样式快照计算精确填充
function calculateOptimalPadding(snapshot: StyleSnapshot): { top: number; right: number; bottom: number; left: number } {
  try {
    // 直接使用测量的填充值，确保保持原有样式
    return {
      top: Math.max(0, Math.round(snapshot.measuredPadding.top)),
      right: Math.max(0, Math.round(snapshot.measuredPadding.right)),
      bottom: Math.max(0, Math.round(snapshot.measuredPadding.bottom)),
      left: Math.max(0, Math.round(snapshot.measuredPadding.left))
    };
  } catch (error) {
    console.warn('计算填充失败:', error);
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
}

// 基于样式快照检测布局方向
function detectLayoutDirection(snapshot: StyleSnapshot): 'HORIZONTAL' | 'VERTICAL' {
  // 直接使用快照中检测到的方向，这是基于实际位置分析的
  return snapshot.detectedDirection;
}

// 为FRAME启用自动布局（事务性操作）
function enableAutoLayoutForFrame(frameNode: FrameNode): boolean {
  const initialSelection = [...figma.currentPage.selection];
  
  try {
    if (frameNode.layoutMode && frameNode.layoutMode !== 'NONE') {
      return true; // 已经启用
    }
    
    // 创建样式快照
    const originalSnapshot = createStyleSnapshot(frameNode);
    if (!originalSnapshot) {
      console.warn('无法创建样式快照，使用传统方法');
      return enableAutoLayoutForFrame(frameNode);
    }
    
    // 开始事务
    figma.commitUndo();
    console.log('开始为 Frame 启用自动布局（样式保持模式）:', frameNode.name);
    
    // 基于快照设置自动布局属性
    const direction = detectLayoutDirection(originalSnapshot);
    frameNode.layoutMode = direction;
    
    // 基于快照计算精确参数
    const spacing = calculateOptimalSpacing(originalSnapshot, direction);
    frameNode.itemSpacing = spacing;
    
    const padding = calculateOptimalPadding(originalSnapshot);
    frameNode.paddingTop = padding.top;
    frameNode.paddingRight = padding.right;
    frameNode.paddingBottom = padding.bottom;
    frameNode.paddingLeft = padding.left;
    
    console.log(`设置自动布局: ${direction}, 间距: ${spacing}, 填充: ${padding.top}/${padding.right}/${padding.bottom}/${padding.left}`);
    
    // 基于快照设置对齐
    setOptimalAlignment(frameNode, originalSnapshot);
    
    figma.commitUndo(); // 记录布局设置状态
    
    // 更保守地设置子节点约束
    const flexCount = setChildrenToFlexibleConservative(frameNode);
    if (flexCount > 0) {
      figma.commitUndo(); // 记录子节点设置状态
      console.log('设置', flexCount, '个子节点约束');
    }
    
    // 验证样式一致性
    const verification = verifyStyleConsistency(frameNode, originalSnapshot);
    if (!verification.consistent) {
      console.warn('样式一致性验证失败:', verification.differences);
      
      // 立即回滚
      console.log('开始回滚自动布局操作...');
      try {
        for (let i = 0; i < 10; i++) { // 回滚更多步骤
          figma.triggerUndo();
        }
        console.log('回滚完成，尝试重新修复...');
        
        // 重新尝试修复，使用改进的算法
        const nodeSnapshot = captureNodeSnapshot(frameNode);
        return enableAutoLayoutForFrame(frameNode);
      } catch (rollbackError) {
        console.error('回滚失败:', rollbackError);
        return false;
      }
    } else {
      console.log('样式一致性验证通过');
    }
    
    console.log('Frame 自动布局启用成功（样式保持）');
    return true;
    
  } catch (error) {
    console.error('启用自动布局失败:', error);
    
    // 回滚操作
    console.log('开始回滚自动布局操作...');
    try {
      for (let i = 0; i < 5; i++) { // 最多回滚 5 步
        figma.triggerUndo();
      }
      figma.currentPage.selection = initialSelection;
      console.log('自动布局回滚完成');
    } catch (undoError) {
      console.error('自动布局回滚失败:', undoError);
    }
    
    return false;
  }
}

// 通用的自动布局启用函数，支持Frame、Component、Instance
function enableAutoLayoutForNode(node: FrameNode | ComponentNode | InstanceNode): boolean {
  const initialSelection = [...figma.currentPage.selection];
  
  try {
    if (node.layoutMode && node.layoutMode !== 'NONE') {
      return true; // 已经启用
    }
    
    // 创建样式快照
    const originalSnapshot = createStyleSnapshot(node);
    if (!originalSnapshot) {
      console.warn('无法创建样式快照，使用传统方法');
      return enableAutoLayoutForNode(node);
    }
    
    // 开始事务
    figma.commitUndo();
    console.log('开始为节点启用自动布局（样式保持模式）:', node.name, node.type);
    
    // 基于快照设置自动布局属性
    const direction = detectLayoutDirection(originalSnapshot);
    node.layoutMode = direction;
    
    // 基于快照计算精确参数
    const spacing = calculateOptimalSpacing(originalSnapshot, direction);
    node.itemSpacing = spacing;
    
    const padding = calculateOptimalPadding(originalSnapshot);
    node.paddingTop = padding.top;
    node.paddingRight = padding.right;
    node.paddingBottom = padding.bottom;
    node.paddingLeft = padding.left;
    
    console.log(`设置自动布局: ${direction}, 间距: ${spacing}, 填充: ${padding.top}/${padding.right}/${padding.bottom}/${padding.left}`);
    
    // 基于快照设置对齐
    setOptimalAlignment(node, originalSnapshot);
    
    figma.commitUndo(); // 记录布局设置状态
    
    // 设置子元素的响应式尺寸（最佳实践）
    console.log('🚀 开始应用响应式尺寸最佳实践...');
    let responsiveCount = 0;
    if (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL') {
      responsiveCount = setChildrenResponsiveSizing(node, node.layoutMode);
      if (responsiveCount > 0) {
        figma.commitUndo();
        console.log('✅ 成功设置了', responsiveCount, '个子元素的响应式尺寸');
      } else {
        console.log('ℹ️ 无需设置响应式尺寸（子元素已是最佳状态或不支持）');
      }
    } else {
      console.log('⚠️ 跳过响应式尺寸设置（布局模式为 NONE）');
    }
    
    // 更保守地设置子节点约束
    const flexCount = setChildrenToFlexibleConservative(node);
    if (flexCount > 0) {
      figma.commitUndo(); // 记录子节点设置状态
      console.log('设置', flexCount, '个子节点约束');
    }
    
    // 验证样式一致性
    const verification = verifyStyleConsistency(node, originalSnapshot);
    if (!verification.consistent) {
      console.warn('样式一致性验证失败:', verification.differences);
      
      // 尝试微调以保持一致性
      const adjusted = adjustLayoutToMatchSnapshot(node, originalSnapshot);
      if (adjusted) {
        console.log('已调整布局以保持样式一致性');
      } else {
        console.warn('无法完全保持样式一致性，但已尽力接近原有样式');
      }
    } else {
      console.log('样式一致性验证通过');
    }
    
    console.log('节点自动布局启用成功（样式保持）');
    return true;
    
  } catch (error) {
    console.error('启用自动布局失败:', error);
    
    // 回滚操作
    console.log('开始回滚自动布局操作...');
    try {
      for (let i = 0; i < 5; i++) { // 最多回滚 5 步
        figma.triggerUndo();
      }
      figma.currentPage.selection = initialSelection;
      console.log('自动布局回滚完成');
    } catch (undoError) {
      console.error('自动布局回滚失败:', undoError);
    }
    
    return false;
  }
}

// 智能分析子元素特征，推断最佳的响应式尺寸设置
interface ResponsiveSizingAnalysis {
  childId: string;
  childName: string;
  childType: string;
  currentSize: { width: number; height: number };
  isIcon: boolean;
  isText: boolean;
  isMainContent: boolean;
  isDecorative: boolean;
  recommendedHorizontal: 'FIXED' | 'HUG' | 'FILL';
  recommendedVertical: 'FIXED' | 'HUG' | 'FILL';
  reasoning: string;
}

// 新增：布局上下文接口
interface LayoutContext {
  containerType: 'card' | 'sidebar' | 'header' | 'list' | 'toolbar' | 'dialog' | 'unknown';
  contentDensity: number;
  primaryContentElementId?: string;
  interactionPattern: 'read-only' | 'interactive' | 'mixed';
  layoutComplexity: number;
  direction: 'HORIZONTAL' | 'VERTICAL';
}

// 新增：尺寸影响因子接口
interface SizingInfluenceFactors {
  contentType: number;      // 内容类型权重 (文本、图片、按钮等)
  spatialPosition: number;  // 空间位置权重 (主内容区、边栏、工具栏等)
  semanticRole: number;     // 语义角色权重 (标题、正文、操作按钮等)
  userBehavior: number;     // 用户行为权重 (可交互、装饰性等)
  layoutDirection: number;  // 布局方向权重 (主轴、交叉轴适应)
}

// 新增：智能容器类型检测
function detectContainerType(node: SceneNode): LayoutContext['containerType'] {
  const name = node.name.toLowerCase();
  const children = hasChildren(node.type) && 'children' in node ? node.children : [];
  
  // 基于名称匹配
  if (name.includes('card') || name.includes('卡片')) return 'card';
  if (name.includes('sidebar') || name.includes('侧边栏') || name.includes('menu')) return 'sidebar';
  if (name.includes('header') || name.includes('头部') || name.includes('导航')) return 'header';
  if (name.includes('list') || name.includes('列表')) return 'list';
  if (name.includes('toolbar') || name.includes('工具栏')) return 'toolbar';
  if (name.includes('dialog') || name.includes('弹窗') || name.includes('modal')) return 'dialog';
  
  // 基于结构特征推断
  if (children.length > 5 && 'width' in node && 'height' in node) {
    const aspectRatio = node.width / node.height;
    if (aspectRatio > 2) return 'header'; // 宽高比大于2的可能是头部
    if (aspectRatio < 0.5) return 'sidebar'; // 宽高比小于0.5的可能是侧边栏
    if (aspectRatio > 0.8 && aspectRatio < 1.2) return 'card'; // 接近正方形的可能是卡片
  }
  
  return 'unknown';
}

// 新增：交互模式检测
function detectInteractionPattern(children: readonly SceneNode[]): LayoutContext['interactionPattern'] {
  let interactiveCount = 0;
  let readOnlyCount = 0;
  
  for (const child of children) {
    const name = child.name.toLowerCase();
    if (name.includes('button') || name.includes('input') || name.includes('link') || 
        name.includes('按钮') || name.includes('输入') || name.includes('链接')) {
      interactiveCount++;
    } else if (child.type === 'TEXT' || name.includes('text') || name.includes('label') ||
               name.includes('文本') || name.includes('标签')) {
      readOnlyCount++;
    }
  }
  
  if (interactiveCount === 0) return 'read-only';
  if (readOnlyCount === 0) return 'interactive';
  return 'mixed';
}

// 新增：增强的响应式尺寸分析
function analyzeChildrenForResponsiveSizingEnhanced(
  parentNode: SceneNode, 
  layoutDirection: 'HORIZONTAL' | 'VERTICAL'
): ResponsiveSizingAnalysis[] {
  // 首先分析布局上下文
  const context: LayoutContext = {
    containerType: detectContainerType(parentNode),
    contentDensity: 0,
    interactionPattern: 'mixed',
    layoutComplexity: 0,
    direction: layoutDirection
  };
  
  if (hasChildren(parentNode.type) && 'children' in parentNode) {
    const children = parentNode.children;
    const totalArea = children.reduce((sum, child) => 
      sum + ('width' in child && 'height' in child ? child.width * child.height : 0), 0);
    
    context.contentDensity = children.length / Math.max(1, totalArea / 10000);
    context.interactionPattern = detectInteractionPattern(children);
    context.layoutComplexity = Math.min(5, children.length / 3); // 简化的复杂度计算
    
    // 找到主要内容元素
    if (children.length > 0) {
      const largestChild = children.reduce((largest, child) => {
        const currentArea = 'width' in child && 'height' in child ? child.width * child.height : 0;
        const largestArea = 'width' in largest && 'height' in largest ? largest.width * largest.height : 0;
        return currentArea > largestArea ? child : largest;
      });
      context.primaryContentElementId = largestChild.id;
    }
  }
  
  // 定义影响因子权重（根据容器类型调整）
  const factors: SizingInfluenceFactors = getInfluenceFactors(context.containerType);
    
  // 使用增强分析替代原始分析
  console.log(`🧠 开始增强响应式尺寸分析 (容器类型: ${context.containerType}, 交互模式: ${context.interactionPattern})`);
  
  // 调用原有分析函数，后续可以用增强逻辑改进
  const basicAnalyses = analyzeChildrenForResponsiveSizing(parentNode, layoutDirection);
  
  // 基于上下文优化建议
  return basicAnalyses.map(analysis => optimizeAnalysisWithContext(analysis, context, factors));
}

// 新增：根据容器类型获取影响因子权重
function getInfluenceFactors(containerType: LayoutContext['containerType']): SizingInfluenceFactors {
  switch (containerType) {
    case 'card':
      return { contentType: 0.4, spatialPosition: 0.25, semanticRole: 0.2, userBehavior: 0.1, layoutDirection: 0.05 };
    case 'sidebar':
      return { contentType: 0.3, spatialPosition: 0.3, semanticRole: 0.25, userBehavior: 0.1, layoutDirection: 0.05 };
    case 'header':
      return { contentType: 0.25, spatialPosition: 0.35, semanticRole: 0.25, userBehavior: 0.1, layoutDirection: 0.05 };
    case 'list':
      return { contentType: 0.35, spatialPosition: 0.2, semanticRole: 0.3, userBehavior: 0.1, layoutDirection: 0.05 };
    case 'toolbar':
      return { contentType: 0.2, spatialPosition: 0.2, semanticRole: 0.3, userBehavior: 0.25, layoutDirection: 0.05 };
    case 'dialog':
      return { contentType: 0.4, spatialPosition: 0.2, semanticRole: 0.25, userBehavior: 0.1, layoutDirection: 0.05 };
    default:
      return { contentType: 0.35, spatialPosition: 0.25, semanticRole: 0.25, userBehavior: 0.1, layoutDirection: 0.05 };
  }
}

// 新增：基于上下文优化分析结果
function optimizeAnalysisWithContext(
  analysis: ResponsiveSizingAnalysis, 
  context: LayoutContext, 
  factors: SizingInfluenceFactors
): ResponsiveSizingAnalysis {
  const optimized = { ...analysis };
  
  // 根据容器类型调整建议
  if (context.containerType === 'sidebar' && context.direction === 'VERTICAL') {
    // 侧边栏垂直布局：强制宽度填充
    if (optimized.recommendedHorizontal !== 'FIXED' || optimized.isIcon) {
      optimized.recommendedHorizontal = 'FILL';
      optimized.reasoning += ' (侧边栏优化: 宽度填充)';
    }
  } else if (context.containerType === 'header' && context.direction === 'HORIZONTAL') {
    // 头部水平布局：主要内容拉伸，其他元素固定
    if (analysis.childId === context.primaryContentElementId) {
      optimized.recommendedHorizontal = 'FILL';
      optimized.reasoning += ' (头部主内容: 水平拉伸)';
        }
  } else if (context.containerType === 'card') {
    // 卡片布局：根据交互模式调整
    if (context.interactionPattern === 'interactive' && analysis.reasoning.includes('按钮')) {
      optimized.recommendedHorizontal = 'FILL';
      optimized.reasoning += ' (卡片交互元素: 宽度填充)';
    }
  }
  
  return optimized;
}

// 根据智能分析结果设置子元素的响应式尺寸
function setChildrenResponsiveSizingWithAnalysis(
  parentNode: SceneNode, 
  layoutDirection: 'HORIZONTAL' | 'VERTICAL',
  analyses: ResponsiveSizingAnalysis[]
): number {
  if (!hasChildren(parentNode.type) || !('children' in parentNode)) {
    return 0;
  }
  
  let count = 0;
  const children = parentNode.children;
  
  console.log(`🎯 开始应用智能响应式尺寸设置 (布局方向: ${layoutDirection})`);
  
  for (let i = 0; i < children.length && i < analyses.length; i++) {
    const child = children[i];
    const analysis = analyses[i];
    
    try {
      // 检查子节点是否支持 layout sizing 属性
      if (!('layoutSizingHorizontal' in child) || !('layoutSizingVertical' in child)) {
        console.log(`❌ 跳过不支持 layout sizing 的节点: ${child.name} (${child.type})`);
        continue;
      }

      // 检查节点类型是否支持响应式尺寸
      const supportedTypes = ['FRAME', 'COMPONENT', 'INSTANCE', 'TEXT'];
      if (!supportedTypes.includes(child.type)) {
        console.log(`❌ 跳过不支持响应式尺寸的节点类型: ${child.name} (${child.type})`);
        continue;
      }

      // 记录原始状态
      const originalHorizontal = child.layoutSizingHorizontal;
      const originalVertical = child.layoutSizingVertical;
      
      let modified = false;
      
      // 应用推荐的水平尺寸
      if (child.layoutSizingHorizontal !== analysis.recommendedHorizontal) {
        child.layoutSizingHorizontal = analysis.recommendedHorizontal;
        modified = true;
      }
      
      // 应用推荐的垂直尺寸
      if (child.layoutSizingVertical !== analysis.recommendedVertical) {
        child.layoutSizingVertical = analysis.recommendedVertical;
        modified = true;
      }
      
      if (modified) {
        count++;
        console.log(`✅ ${child.name}: ${analysis.reasoning}`);
        console.log(`   ${originalHorizontal}→${child.layoutSizingHorizontal}, ${originalVertical}→${child.layoutSizingVertical}`);
      } else {
        console.log(`⚪ ${child.name}: 尺寸已是最佳状态`);
      }
      
    } catch (error) {
      console.warn(`❌ 设置子节点 ${child.name} 的响应式尺寸失败:`, error);
      continue;
    }
  }
  
  console.log(`🎉 智能响应式尺寸设置完成！共修改了 ${count}/${children.length} 个子元素`);
  return count;
}

// 根据布局方向设置子元素的响应式尺寸（最佳实践）
function setChildrenResponsiveSizing(parentNode: SceneNode, layoutDirection: 'HORIZONTAL' | 'VERTICAL'): number {
  if (!hasChildren(parentNode.type) || !('children' in parentNode)) {
    return 0;
  }
  
  let count = 0;
  let children;
  
  try {
    children = parentNode.children;
  } catch (childrenError) {
    console.warn('无法访问父节点的子节点:', childrenError);
    return 0;
  }

  console.log(`🎯 开始设置 ${children.length} 个子元素的响应式尺寸 (布局方向: ${layoutDirection})`);
  
  for (const child of children) {
    try {
      // 检查子节点是否支持 layout sizing 属性
      if (!('layoutSizingHorizontal' in child) || !('layoutSizingVertical' in child)) {
        console.log(`❌ 跳过不支持 layout sizing 的节点: ${child.name} (${child.type})`);
        continue;
      }

      // 检查节点类型是否支持响应式尺寸
      const supportedTypes = ['FRAME', 'COMPONENT', 'INSTANCE', 'TEXT'];
      if (!supportedTypes.includes(child.type)) {
        console.log(`❌ 跳过不支持响应式尺寸的节点类型: ${child.name} (${child.type})`);
        continue;
      }

      // 记录原始状态
      const originalHorizontal = child.layoutSizingHorizontal;
      const originalVertical = child.layoutSizingVertical;
      
      console.log(`📋 ${child.name} (${child.type}) 原始尺寸: 水平=${originalHorizontal}, 垂直=${originalVertical}`);

      let modified = false;
      
      if (layoutDirection === 'VERTICAL') {
        // 垂直布局：宽度填充，高度自适应内容
        if (child.layoutSizingHorizontal !== 'FILL') {
          child.layoutSizingHorizontal = 'FILL';
          modified = true;
        }
        if (child.layoutSizingVertical !== 'HUG') {
          child.layoutSizingVertical = 'HUG';
          modified = true;
        }
      } else {
        // 水平布局：高度填充，宽度自适应内容
        if (child.layoutSizingHorizontal !== 'HUG') {
          child.layoutSizingHorizontal = 'HUG';
          modified = true;
        }
        if (child.layoutSizingVertical !== 'FILL') {
          child.layoutSizingVertical = 'FILL';
          modified = true;
        }
      }
      
      if (modified) {
        count++;
        console.log(`✅ ${child.name} 响应式尺寸已更新: ${originalHorizontal}→${child.layoutSizingHorizontal}, ${originalVertical}→${child.layoutSizingVertical}`);
      } else {
        console.log(`⚪ ${child.name} 尺寸无需更改 (已是最佳状态)`);
      }
      
    } catch (error) {
      console.warn(`❌ 设置子节点 ${child.name} 的响应式尺寸失败:`, error);
      continue;
    }
  }
  
  console.log(`🎉 响应式尺寸设置完成！共修改了 ${count}/${children.length} 个子元素`);
  console.log(`📊 布局方向: ${layoutDirection}, 预期效果: ${layoutDirection === 'VERTICAL' ? '子元素宽度填充父容器' : '子元素高度填充父容器'}`);
  return count;
}

// 基于 CSS Flexbox 规范智能设置子节点约束
function setChildrenToFlexible(parentNode: SceneNode): number {
  if (!hasChildren(parentNode.type) || !('children' in parentNode)) {
    return 0;
  }
  
  let count = 0;
  let children;
  
  try {
    children = parentNode.children;
  } catch (childrenError) {
    console.warn('无法访问父节点的子节点:', childrenError);
    return 0;
  }

  // 获取父节点的布局模式 (CSS flex-direction)
  const parentLayoutMode = ('layoutMode' in parentNode) ? parentNode.layoutMode : 'NONE';
  
  console.log(`设置 ${children.length} 个子节点的 CSS Flexbox 属性 (父容器: ${parentLayoutMode})`);
  
  for (const child of children) {
    try {
      // 检查子节点是否仍然有效
      if (!child) continue;
      
      // 获取子节点的 CSS Flexbox 行为配置
      const flexBehavior = getFlexItemBehavior(child as SceneNode);
      
      // 设置 CSS flex-grow 对应的 layoutGrow
      if ('layoutGrow' in child) {
        child.layoutGrow = flexBehavior.flexGrow;
      }
      
      // 设置 CSS flex-basis 和 flex-shrink 对应的 layoutSizing
      if ('layoutSizingHorizontal' in child && 'layoutSizingVertical' in child) {
        if (parentLayoutMode === 'HORIZONTAL') {
          // 水平布局 (flex-direction: row)
          // 主轴：根据 flex-grow 和 flex-shrink 设置
          child.layoutSizingHorizontal = flexBehavior.sizingMode === 'FILL' ? 'FILL' : 
                                        flexBehavior.sizingMode === 'FIXED' ? 'FIXED' : 'HUG';
          // 交叉轴：通常填充或拥抱内容
          child.layoutSizingVertical = isInteractiveElement(child as SceneNode) ? 'FIXED' : 'HUG';
        } else if (parentLayoutMode === 'VERTICAL') {
          // 垂直布局 (flex-direction: column)
          // 交叉轴：通常填充或拥抱内容
          child.layoutSizingHorizontal = flexBehavior.sizingMode === 'FILL' ? 'FILL' : 
                                        isInteractiveElement(child as SceneNode) ? 'FIXED' : 'HUG';
          // 主轴：根据 flex-grow 和 flex-shrink 设置
          child.layoutSizingVertical = flexBehavior.sizingMode === 'FILL' ? 'FILL' : 
                                      flexBehavior.sizingMode === 'FIXED' ? 'FIXED' : 'HUG';
        } else {
          // 非自动布局容器
          child.layoutSizingHorizontal = 'HUG';
          child.layoutSizingVertical = 'HUG';
        }
      }
      
      // 设置传统约束（向后兼容）
      if ('constraints' in child) {
        if (parentLayoutMode === 'HORIZONTAL') {
          child.constraints = {
            horizontal: flexBehavior.flexShrink === 0 ? 'MIN' : 'SCALE',
            vertical: 'SCALE'
          };
        } else if (parentLayoutMode === 'VERTICAL') {
          child.constraints = {
            horizontal: 'SCALE',
            vertical: flexBehavior.flexShrink === 0 ? 'MIN' : 'SCALE'
          };
        } else {
          child.constraints = {
            horizontal: 'MIN',
            vertical: 'MIN'
          };
        }
      }
      
      console.log(`  ${child.name} (${child.type}): grow=${flexBehavior.flexGrow}, shrink=${flexBehavior.flexShrink}, sizing=${flexBehavior.sizingMode}`);
      
      count++;
    } catch (error) {
      console.warn('设置子节点 CSS Flexbox 属性失败:', error);
      continue;
    }
  }
  
  return count;
}

// 更保守的子节点约束设置
function setChildrenToFlexibleConservative(parentNode: SceneNode): number {
  if (!hasChildren(parentNode.type) || !('children' in parentNode)) {
    return 0;
  }
  
  let count = 0;
  let children;
  
  try {
    children = parentNode.children;
  } catch (childrenError) {
    console.warn('无法访问父节点的子节点:', childrenError);
    return 0;
  }

  for (const child of children) {
    try {
      // 检查子节点是否仍然有效
      if (!child) continue;
      
      if ('constraints' in child) {
        // 更保守的约束设置，尽量保持原有尺寸
        const currentConstraints = child.constraints || { horizontal: 'MIN', vertical: 'MIN' };
        
        // 只有在原约束为SCALE时才保持SCALE，否则使用MIN
        child.constraints = {
          horizontal: currentConstraints.horizontal === 'SCALE' ? 'SCALE' : 'MIN',
          vertical: currentConstraints.vertical === 'SCALE' ? 'SCALE' : 'MIN'
        };
        
        count++;
      }
    } catch (error) {
      console.warn('设置子节点约束失败:', error);
      continue;
    }
  }
  
  return count;
}

// 调整布局以匹配快照
function adjustLayoutToMatchSnapshot(node: SceneNode, snapshot: StyleSnapshot): boolean {
  try {
    if (!('layoutMode' in node) || !node.layoutMode || node.layoutMode === 'NONE') {
      return false;
    }

    // 微调间距
    const currentSpacing = ('itemSpacing' in node) ? node.itemSpacing : 0;
    const targetSpacing = node.layoutMode === 'HORIZONTAL' ? 
      snapshot.measuredSpacing.mostCommonHorizontal : 
      snapshot.measuredSpacing.mostCommonVertical;
    
    if (Math.abs(currentSpacing - targetSpacing) > 1) {
      if ('itemSpacing' in node) {
        node.itemSpacing = Math.round(targetSpacing);
      }
    }

    // 微调填充
    if ('paddingTop' in node && 'paddingRight' in node && 'paddingBottom' in node && 'paddingLeft' in node) {
      const tolerance = 2;
      
      if (Math.abs(node.paddingTop - snapshot.measuredPadding.top) > tolerance) {
        node.paddingTop = Math.max(0, Math.round(snapshot.measuredPadding.top));
      }
      if (Math.abs(node.paddingRight - snapshot.measuredPadding.right) > tolerance) {
        node.paddingRight = Math.max(0, Math.round(snapshot.measuredPadding.right));
      }
      if (Math.abs(node.paddingBottom - snapshot.measuredPadding.bottom) > tolerance) {
        node.paddingBottom = Math.max(0, Math.round(snapshot.measuredPadding.bottom));
      }
      if (Math.abs(node.paddingLeft - snapshot.measuredPadding.left) > tolerance) {
        node.paddingLeft = Math.max(0, Math.round(snapshot.measuredPadding.left));
      }
    }

    return true;
  } catch (error) {
    console.warn('调整布局失败:', error);
    return false;
  }
}

// 传统的自动布局启用函数（作为备用）


// 基于样式快照设置精确对齐方式
function setOptimalAlignment(node: SceneNode, snapshot: StyleSnapshot): void {
  if (!('layoutMode' in node) || !node.layoutMode || node.layoutMode === 'NONE') {
    return;
  }

  try {
    const direction = snapshot.detectedDirection;
    
    // 基于实际检测到的对齐方式设置
    if (direction === 'HORIZONTAL') {
      // 水平布局：主轴通常是MIN，交叉轴基于检测结果
      if ('primaryAxisAlignItems' in node) {
        node.primaryAxisAlignItems = 'MIN'; // 水平布局通常从左开始
      }
      if ('counterAxisAlignItems' in node) {
        node.counterAxisAlignItems = snapshot.detectedAlignment.vertical;
      }
    } else {
      // 垂直布局：主轴通常是MIN，交叉轴基于检测结果
      if ('primaryAxisAlignItems' in node) {
        node.primaryAxisAlignItems = 'MIN'; // 垂直布局通常从上开始
      }
      if ('counterAxisAlignItems' in node) {
        node.counterAxisAlignItems = snapshot.detectedAlignment.horizontal;
      }
    }
    
    console.log(`基于快照设置对齐方式: ${node.name}, 方向: ${direction}, 主轴: ${('primaryAxisAlignItems' in node) ? node.primaryAxisAlignItems : 'N/A'}, 交叉轴: ${('counterAxisAlignItems' in node) ? node.counterAxisAlignItems : 'N/A'}`);
  } catch (error) {
    console.warn('设置对齐方式失败:', error);
  }
}





// 节点快照接口
interface NodeSnapshot {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}



// 捕获节点快照
function captureNodeSnapshot(node: SceneNode): NodeSnapshot {
  const snapshot: NodeSnapshot = {
    id: node.id,
    name: node.name,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    children: []
  };
  
  if (hasChildren(node.type) && 'children' in node) {
    try {
      snapshot.children = node.children.map(child => ({
        id: child.id,
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height
      }));
    } catch (error) {
      console.warn('无法捕获子节点快照:', error);
    }
  }
  
  return snapshot;
}

// 主自动修复函数 - 优先使用内置命令
function autoFixNode(node: SceneNode): FixResult {
  // 优先使用基于内置命令的方法
  return autoFixWithCommands(node);
}

// 批量自动修复选中的节点
function autoFixSelection(): FixResult[] {
  const selection = figma.currentPage.selection;
  const results: FixResult[] = [];
  
  for (const node of selection) {
    const result = autoFixNode(node);
    results.push(result);
  }
  
  return results;
}

// 检查是否有编辑权限
function checkEditPermission(): boolean {
  try {
    // 尝试创建和删除节点来检测完整编辑权限
    const testRect = figma.createRectangle();
    testRect.remove();
    console.log('编辑权限检测：完整权限');
    return true;
  } catch (e) {
    console.log('编辑权限检测：无法创建节点，错误信息:', e);
    // 检查是否至少可以修改现有节点
    try {
      const selection = figma.currentPage.selection;
      if (selection.length > 0) {
        const node = selection[0];
        const originalName = node.name;
        node.name = originalName; // 尝试设置相同的名称
        console.log('编辑权限检测：可以修改现有节点');
        return true; // 至少可以修改现有节点
      }
    } catch (modifyError) {
      console.log('编辑权限检测：完全只读，错误信息:', modifyError);
    }
    return false;
  }
}

// 修复特定问题
function fixSpecificIssue(node: SceneNode, fixType: string): { success: boolean; message?: string; error?: string } {
  // 首先检查编辑权限
  if (!checkEditPermission()) {
    return {
      success: false,
      error: '当前文件为只读模式，无法执行修复操作。请确保您有编辑权限。'
    };
  }

  try {
    switch (fixType) {
      case 'group-to-frame':
        if (node.type === 'GROUP') {
          const newFrame = convertGroupToAutoLayoutFrame(node as GroupNode);
          if (newFrame) {
            return { 
              success: true, 
              message: `已将Group "${node.name}"转换为Frame并启用自动布局` 
            };
          } else {
            return { 
              success: false, 
              error: 'Group转换为Frame失败' 
            };
          }
        } else {
          return { 
            success: false, 
            error: '只能对Group节点执行此操作' 
          };
        }
        
      case 'enable-auto-layout':
        if (node.type === 'FRAME') {
          const frameNode = node as FrameNode;
          // 检查是否已经启用了自动布局
          if (frameNode.layoutMode && frameNode.layoutMode !== 'NONE') {
            return { 
              success: true, 
              message: `Frame "${node.name}"已经启用了自动布局` 
            };
          }
          
          const success = enableAutoLayoutForFrame(frameNode);
          if (success) {
            return { 
              success: true, 
              message: `已为Frame "${node.name}"启用自动布局` 
            };
          } else {
            return { 
              success: false, 
              error: '启用自动布局失败，可能缺少编辑权限' 
            };
          }
        } else if (node.type === 'COMPONENT') {
          // Component也支持自动布局
          try {
            const componentNode = node as ComponentNode;
            
            // 检查是否已经启用了自动布局
            if (componentNode.layoutMode && componentNode.layoutMode !== 'NONE') {
              return { 
                success: true, 
                message: `Component "${node.name}"已经启用了自动布局` 
              };
            }
            
            // 使用新的样式保持自动布局启用方法
            const success = enableAutoLayoutForNode(componentNode);
            if (!success) {
              return { 
                success: false, 
                error: `为Component "${node.name}"启用自动布局失败` 
              };
            }
            
            return { 
              success: true, 
              message: `已为Component "${node.name}"启用自动布局` 
            };
          } catch (error) {
            return { 
              success: false, 
              error: `启用自动布局失败：${error}` 
            };
          }
        } else {
          return { 
            success: false, 
            error: '只能对Frame或Component节点启用自动布局' 
          };
        }
        
      case 'set-flexible':
        if (hasChildren(node.type)) {
          const count = setChildrenToFlexible(node);
          if (count > 0) {
            return { 
              success: true, 
              message: `已将 ${count} 个子节点设置为自适应` 
            };
          } else {
            return { 
              success: false, 
              error: '没有可设置的子节点' 
            };
          }
        } else {
          return { 
            success: false, 
            error: '此节点没有子节点' 
          };
        }
        
      default:
        return { 
          success: false, 
          error: `未知的修复类型: ${fixType}` 
        };
    }
  } catch (error) {
    return { 
      success: false, 
      error: `修复过程中发生错误: ${error}` 
    };
  }
}

// 处理选中节点的函数
async function processSelection() {
  console.log('--- 插件运行开始 ---');
  const selection = figma.currentPage.selection;
  console.log('当前选中节点:', selection.map(n => n.name || n.id));

  // 输出选中节点详细信息
  console.log('选中节点详细信息:');
  selection.forEach(n => {
    const info = {
      id: n.id,
      name: n.name,
      type: n.type,
      hasChildren: 'children' in n && n.children.length > 0
    };
    console.log(info);
  });

  // 检查编辑权限级别
  let canEdit = true;
  let canCreateNodes = true;
  try {
    const testRect = figma.createRectangle();
    testRect.remove();
    console.log('有完整编辑权限');
  } catch (e) {
    canCreateNodes = false;
    console.log('无法创建新节点，检查是否可以修改现有节点...');
    
    // 检查是否可以修改现有节点
    try {
      if (selection.length > 0) {
        const node = selection[0];
        const originalName = node.name;
        node.name = originalName; // 尝试设置相同的名称
        console.log('可以修改现有节点，受限编辑权限');
        canEdit = true;
      } else {
    canEdit = false;
        console.log('完全只读模式');
      }
    } catch (modifyError) {
      canEdit = false;
      console.log('完全只读模式，错误信息:', modifyError);
    }
  }

  // 发送权限检查结果到UI
  figma.ui.postMessage({
    type: 'permission-check-result',
    data: { hasPermission: canEdit }
  });

  // 执行智能分析并发送结果到UI
  const analysis = analyzeCurrentSelection();
  figma.ui.postMessage({
    type: 'analysis-result',
    data: analysis
  });

  // 如果只选中了一个文本节点，给出友好提示
  if (selection.length === 1 && selection[0].type === 'TEXT') {
    figma.ui.postMessage({
      onlyText: true
    });
    console.log('选中的是单个文本节点，无需分析。');
    return;
  }

  // 执行UI规范检查
  const designRuleViolations: DesignRuleViolation[] = [];
  const nodeImages: { [nodeId: string]: string } = {};

  console.log('开始执行UI规范检查...');
  
  for (const node of selection) {
    // 分组结构基础校验（仅对根Frame）
    if (node.type === 'FRAME') {
      const groupViolations = checkRootGrouping(node as FrameNode);
      if (groupViolations.length > 0) {
        designRuleViolations.push(...groupViolations);
      }
    }
    // 分析当前节点的规范
    const violations = analyzeDesignRules(node);
    designRuleViolations.push(...violations);

    // 下载节点图片
    console.log(`正在下载节点图片: ${node.name || node.id}`);
    const imageBase64 = await downloadNodeImage(node);
    if (imageBase64) {
      nodeImages[node.id] = imageBase64;
    }
  }

  console.log('UI规范检查完成，发现违规项:', designRuleViolations.length);

  // 生成节点JSON树形结构
  const nodeJsonStructure = selection.map(node => extractSimpleNodeInfo(node));
  console.log('节点JSON结构:', JSON.stringify(nodeJsonStructure, null, 2));

  // 获取 fileKey 和文件名，如果没有则 mock 一个用于开发
  let fileKey = figma.fileKey;
  let fileName = figma.root.name || 'Figma文件';
  if (!fileKey) {
    fileKey = 'MOCK_FILE_KEY_FOR_DEV';
    fileName = 'MOCK_FILE_NAME';
    console.warn('fileKey is undefined, using mock fileKey for development:', fileKey);
  }

  // 收集当前选中节点的信息用于复制功能
  const selectedNodesInfo = selection.map(node => {
    const encodedFileName = encodeURIComponent(fileName.replace(/\.fig$/i, ''));
    const hyphenNodeId = String(node.id).replace(/:/g, '-');
    const link = fileKey ? `https://www.figma.com/design/${fileKey}/${encodedFileName}?node-id=${hyphenNodeId}&m=dev` : '';
    return {
      id: node.id,
      name: node.name || 'Unnamed',
      type: node.type,
      link
    };
  });

  // 发送选中节点信息到UI（使用安全序列化）
  const messageData = safeSerialize({
    selectedNodesInfo,
    canEdit,
    canCreateNodes,
    fileName,
    designRuleViolations,
    nodeImages,
    nodeJsonStructure,
  });

  figma.ui.postMessage(messageData);

  console.log('--- 插件运行结束 ---');
}

// 插件启动时立即处理当前选中的节点
processSelection();

// 监听选择变化
figma.on('selectionchange', processSelection);

// 监听 UI 跳转请求
figma.ui.onmessage = async msg => {
  // 窗口大小调整
  if (msg.type === 'resize-window') {
    try {
      figma.ui.resize(msg.width || 380, msg.height || 520);
    } catch (e) {
      console.log('无法调整窗口大小:', e);
    }
    return;
  }

  // 权限检查
  if (msg.type === 'check-permissions') {
    const hasPermission = checkEditPermission();
    figma.ui.postMessage({
      type: 'permission-check-result',
      data: { hasPermission }
    });
    return;
  }

  if (msg.type === 'jump-to-node' && msg.nodeId) {
    try {
      const node = await figma.getNodeByIdAsync(msg.nodeId);
      if (node && 'visible' in node && node.visible) {
        figma.currentPage.selection = [node];
        figma.viewport.scrollAndZoomIntoView([node]);
      } else {
        figma.notify('未找到该节点或节点不可见');
      }
    } catch (e) {
      figma.notify('跳转失败，节点可能不存在');
    }
    return;
  }

  if (msg.type === 'apply-custom-layout') {
    console.log('开始应用自定义布局设置...');
    
    // 获取响应式尺寸选项
    const enableResponsiveSizing = msg.enableResponsiveSizing !== false; // 默认为true
    console.log('响应式尺寸设置:', enableResponsiveSizing ? '启用' : '禁用');
    
    // 获取当前选中的节点
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'layout-result',
        success: false,
        message: '请先选择要应用布局的节点'
      });
      return;
    }

    if (selection.length > 1) {
      figma.ui.postMessage({
        type: 'layout-result',
        success: false,
        message: '请只选择一个节点'
      });
      return;
    }

    const node = selection[0];
    
    // 检查是否为Frame类型
    if (node.type !== 'FRAME') {
      figma.ui.postMessage({
        type: 'layout-result',
        success: false,
        message: '只能对Frame节点应用自定义布局'
      });
      return;
    }

    try {
      const frameNode = node as FrameNode;
      const layoutConfig = msg.layoutConfig;
      
      // 开始事务
      figma.commitUndo();
      console.log('开始应用智能自定义布局:', layoutConfig);
      
      // 创建样式快照来分析现有布局
      const originalSnapshot = createStyleSnapshot(frameNode);
      if (!originalSnapshot) {
        console.warn('无法创建样式快照，使用默认值');
        // 使用默认值
        frameNode.layoutMode = layoutConfig.direction || 'VERTICAL';
        frameNode.itemSpacing = layoutConfig.spacing || 10;
        frameNode.paddingTop = layoutConfig.padding?.top || 10;
        frameNode.paddingRight = layoutConfig.padding?.right || 10;
        frameNode.paddingBottom = layoutConfig.padding?.bottom || 10;
        frameNode.paddingLeft = layoutConfig.padding?.left || 10;
      } else {
        // 基于样式快照计算最优参数
        const direction = layoutConfig.direction || detectLayoutDirection(originalSnapshot);
        const spacing = calculateOptimalSpacing(originalSnapshot, direction);
        const padding = calculateOptimalPadding(originalSnapshot);
        
        console.log('计算出的布局参数:', {
          direction,
          spacing,
          padding
        });
        
        // 应用计算出的参数
        frameNode.layoutMode = direction;
        frameNode.itemSpacing = spacing;
        frameNode.paddingTop = padding.top;
        frameNode.paddingRight = padding.right;
        frameNode.paddingBottom = padding.bottom;
        frameNode.paddingLeft = padding.left;
      }
      
      // 设置对齐方式
      if (frameNode.layoutMode === 'VERTICAL') {
        // 垂直布局：主轴对齐（垂直方向）和交叉轴对齐（水平方向）
        frameNode.primaryAxisAlignItems = layoutConfig.primaryAlign || 'MIN';
        frameNode.counterAxisAlignItems = layoutConfig.counterAlign || 'CENTER';
      } else {
        // 水平布局：主轴对齐（水平方向）和交叉轴对齐（垂直方向）
        frameNode.primaryAxisAlignItems = layoutConfig.primaryAlign || 'MIN';
        frameNode.counterAxisAlignItems = layoutConfig.counterAlign || 'CENTER';
      }
      
      // 记录布局设置
      figma.commitUndo();
      
      // 设置子元素的响应式尺寸（根据用户选择）
      let responsiveCount = 0;
      let responsiveSizingInfo = '';
      
      if (enableResponsiveSizing && (frameNode.layoutMode === 'HORIZONTAL' || frameNode.layoutMode === 'VERTICAL')) {
        console.log('🚀 开始应用智能响应式尺寸最佳实践...');
        
        // 智能分析子元素
        const analyses = analyzeChildrenForResponsiveSizingEnhanced(frameNode, frameNode.layoutMode);
        
        if (analyses.length > 0) {
          // 应用智能分析结果
          responsiveCount = setChildrenResponsiveSizingWithAnalysis(frameNode, frameNode.layoutMode, analyses);
          
          if (responsiveCount > 0) {
            figma.commitUndo();
            console.log('✅ 成功设置了', responsiveCount, '个子元素的智能响应式尺寸');
            
            // 生成详细的响应式尺寸信息
            const modifiedAnalyses = analyses.filter((_, index) => index < responsiveCount);
            const sizingDetails = modifiedAnalyses.map(analysis => 
              `${analysis.childName}: ${analysis.reasoning}`
            ).join('\n  ');
            
            responsiveSizingInfo = `\n\n📐 智能响应式尺寸设置 (${responsiveCount}/${analyses.length}个子元素):\n  ${sizingDetails}`;
          } else {
            console.log('ℹ️ 无需设置响应式尺寸（子元素已是最佳状态）');
            responsiveSizingInfo = '\n\n📐 响应式尺寸: 子元素已是最佳状态';
          }
        } else {
          console.log('ℹ️ 无法分析子元素响应式尺寸需求');
          responsiveSizingInfo = '\n\n📐 响应式尺寸: 无可分析的子元素';
        }
      } else if (enableResponsiveSizing) {
        console.log('⚠️ 跳过响应式尺寸设置（布局模式为 NONE）');
        responsiveSizingInfo = '\n\n📐 响应式尺寸: 跳过（需要自动布局）';
      } else {
        console.log('ℹ️ 用户选择禁用响应式尺寸设置');
        responsiveSizingInfo = '\n\n📐 响应式尺寸: 已禁用';
      }
      
      // 设置子节点约束（保守模式）
      const flexCount = setChildrenToFlexibleConservative(frameNode);
      if (flexCount > 0) {
        figma.commitUndo();
        console.log('设置了', flexCount, '个子节点约束');
      }
      
      figma.ui.postMessage({
        type: 'layout-result',
        success: true,
        message: `✅ 成功应用智能侧边栏布局！\n\n🎯 布局设置:\n  方向: ${frameNode.layoutMode}\n  间距: ${frameNode.itemSpacing}px\n  填充: ${frameNode.paddingTop}/${frameNode.paddingRight}/${frameNode.paddingBottom}/${frameNode.paddingLeft}px\n  对齐: ${frameNode.counterAxisAlignItems}${responsiveSizingInfo}`
      });
      
      console.log('智能自定义布局应用成功');
      
    } catch (error) {
      console.error('应用自定义布局失败:', error);
      
      // 回滚操作
      try {
        for (let i = 0; i < 3; i++) {
          figma.triggerUndo();
        }
        console.log('布局设置回滚完成');
      } catch (undoError) {
        console.error('回滚失败:', undoError);
      }
      
      figma.ui.postMessage({
        type: 'layout-result',
        success: false,
        message: `❌ 应用布局失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
    return;
  }

  if (msg.type === 'save-setting') {
    try {
      await figma.clientStorage.setAsync(msg.key, msg.value);
      console.log('设置已保存:', msg.key, msg.value);
    } catch (e) {
      console.error('保存设置失败:', e);
    }
    return;
  }

  if (msg.type === 'load-setting') {
    try {
      const value = await figma.clientStorage.getAsync(msg.key);
      figma.ui.postMessage({
        type: 'setting-loaded',
        key: msg.key,
        value: value || msg.defaultValue
      });
    } catch (e) {
      console.error('加载设置失败:', e);
      figma.ui.postMessage({
        type: 'setting-loaded',
        key: msg.key,
        value: msg.defaultValue
      });
    }
    return;
  }

  if (msg.type === 'check-auto-layout') {
    console.log('开始执行自动布局检查...');
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'auto-layout-check-result',
        violations: [],
        message: '请先选择要检查的节点'
      });
      return;
    }

    const autoLayoutViolations: DesignRuleViolation[] = [];
    
    for (const node of selection) {
      const violations = checkAllNodesAutoLayout(node);
      autoLayoutViolations.push(...violations);
    }

    console.log('自动布局检查完成，发现违规项:', autoLayoutViolations.length);
    
    figma.ui.postMessage({
      type: 'auto-layout-check-result',
      violations: autoLayoutViolations,
      message: autoLayoutViolations.length === 0 ? 
        '✅ 所有支持自动布局的节点都已正确配置！' : 
        `❌ 发现 ${autoLayoutViolations.length} 个节点未启用自动布局`
    });
    return;
  }



  if (msg.type === 'fix-frame-selection') {
    console.log('开始修复Frame Selection问题...');
    
    // 获取响应式尺寸选项
    const enableResponsiveSizing = msg.enableResponsiveSizing !== false; // 默认为true
    console.log('响应式尺寸设置:', enableResponsiveSizing ? '启用' : '禁用');
    
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'fix-result',
        success: false,
        message: '请先选择要修复的节点'
      });
      return;
    }

    // 执行Frame Selection修复，传递响应式尺寸选项
    const fixResults = fixFrameSelectionWithResponsiveSizing(selection, enableResponsiveSizing);
    
    figma.ui.postMessage({
      type: 'fix-result',
      success: fixResults.success,
      message: fixResults.message,
      violations: fixResults.violations
    });
    return;
  }

  // 创建测试节点的消息处理
  if (msg.type === 'create-test-groups') {
    createTestGroups().then(result => {
      figma.ui.postMessage({
        type: 'create-test-result',
        action: 'create-test-groups',
        success: result.success,
        message: result.message,
        details: result.details,
        nodeCount: result.nodeCount,
        error: result.error
      });
    }).catch(error => {
      figma.ui.postMessage({
        type: 'create-test-result',
        action: 'create-test-groups',
        success: false,
        message: '❌ 创建失败',
        error: `创建失败: ${error instanceof Error ? error.message : String(error)}`
      });
    });
    return;
  }

  if (msg.type === 'create-test-frames') {
    const result = createTestFrames();
    figma.ui.postMessage({
      type: 'create-test-result',
      action: 'create-test-frames',
      success: result.success,
      message: result.message,
      details: result.details,
      nodeCount: result.nodeCount,
      error: result.error
    });
    return;
  }

  if (msg.type === 'create-complex-structure') {
    createComplexStructure().then(result => {
      figma.ui.postMessage({
        type: 'create-test-result',
        action: 'create-complex-structure',
        success: result.success,
        message: result.message,
        details: result.details,
        nodeCount: result.nodeCount,
        error: result.error
      });
    }).catch(error => {
      figma.ui.postMessage({
        type: 'create-test-result',
        action: 'create-complex-structure',
        success: false,
        message: '❌ 创建失败',
        error: `创建失败: ${error instanceof Error ? error.message : String(error)}`
      });
    });
    return;
  }

  if (msg.type === 'clear-test-nodes') {
    const result = clearTestNodes();
    figma.ui.postMessage({
      type: 'create-test-result',
      action: 'clear-test-nodes',
      success: result.success,
      message: result.message,
      details: result.details,
      nodeCount: result.nodeCount,
      error: result.error
    });
    return;
  }

  if (msg.type === 'create-card-list') {
    createCardList().then(result => {
      figma.ui.postMessage({
        type: 'create-test-result',
        action: 'create-card-list',
        success: result.success,
        message: result.message,
        details: result.details,
        nodeCount: result.nodeCount,
        error: result.error
      });
    }).catch(error => {
      figma.ui.postMessage({
        type: 'create-test-result',
        action: 'create-card-list',
        success: false,
        message: '❌ 创建失败',
        error: `创建失败: ${error instanceof Error ? error.message : String(error)}`
      });
    });
    return;
  }

  if (msg.type === 'apply-smart-grouping') {
    console.log('🎯 开始应用智能分组...');
    console.log(`🧠 使用人工智能式分组算法`);
    
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'smart-grouping-result',
        result: {
          success: false,
          message: '❌ 请先选择要分组的节点',
          analyses: [],
          summary: {
            totalCards: 0,
            totalGroups: 0,
            avgEfficiency: 0,
            details: ['请选择包含卡片的容器或直接选择卡片']
          }
        }
      });
      return;
    }
    
    applySmartGrouping(selection).then(result => {
      figma.ui.postMessage({
        type: 'smart-grouping-result',
        result: result
      });
      console.log('📤 智能分组结果已发送到UI');
    }).catch(error => {
      figma.ui.postMessage({
        type: 'smart-grouping-result',
        result: {
          success: false,
          message: '❌ 智能分组失败',
          analyses: [],
          summary: {
            totalCards: 0,
            totalGroups: 0,
            avgEfficiency: 0,
            details: [`错误: ${error instanceof Error ? error.message : String(error)}`]
          }
        }
      });
    });
    return;
  }

  // 基于位置关系的布局转换
  if (msg.type === 'apply-position-layout') {
    console.log('📐 开始应用位置关系布局转换...');
    
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'position-layout-result',
        result: {
          success: false,
          message: '❌ 请先选择要转换的容器',
          details: []
        }
      });
      return;
    }
    
    convertToAutoLayoutBasedOnPositionRelationships(selection).then(result => {
      figma.ui.postMessage({
        type: 'position-layout-result',
        result: result
      });
      console.log('📤 位置关系布局转换结果已发送到UI');
    }).catch(error => {
      figma.ui.postMessage({
        type: 'position-layout-result',
        result: {
          success: false,
          message: '❌ 位置关系布局转换失败',
          details: [`错误: ${error instanceof Error ? error.message : String(error)}`]
        }
      });
    });
    return;
  }

  // 智能分析当前选择
  if (msg.type === 'analyze-selection') {
    const analysis = analyzeCurrentSelection();
    figma.ui.postMessage({
      type: 'analysis-result',
      data: analysis
    });
    return;
  }

  // 全面自动修复
  if (msg.type === 'auto-fix-all') {
    const result = performComprehensiveAutoFix(msg.settings || {});
    figma.ui.postMessage({
      type: 'fix-result',
      data: {
        success: result.success,
        message: result.message,
        details: result.details
      }
    });
    return;
  }

  // 转换Groups
  if (msg.type === 'convert-groups') {
    const result = convertSelectedGroups();
    figma.ui.postMessage({
      type: 'fix-result',
      data: {
        success: result.success,
        message: result.message,
        details: result.details
      }
    });
    return;
  }

  // 提取节点数据
  if (msg.type === 'extract-nodes') {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'extraction-result',
        data: {
          success: false,
          message: '请先选择要提取的节点'
        }
      });
      return;
    }

    try {
      const nodeData = selection.map(node => extractSimpleNodeInfo(node));
      figma.ui.postMessage({
        type: 'extraction-result',
        data: {
          success: true,
          message: `成功提取 ${selection.length} 个节点的信息`,
          nodeData: nodeData.length === 1 ? nodeData[0] : nodeData
        }
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'extraction-result',
        data: {
          success: false,
          message: `提取失败: ${error instanceof Error ? error.message : String(error)}`
        }
      });
    }
    return;
  }

  // 生成报告
  if (msg.type === 'generate-report') {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'report-result',
        data: {
          success: false,
          message: '请先选择要分析的节点'
        }
      });
      return;
    }

    try {
      const report = generateDetailedReport(selection);
      figma.ui.postMessage({
        type: 'report-result',
        data: {
          success: true,
          message: `成功生成详细报告`,
          report: report
        }
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'report-result',
        data: {
          success: false,
          message: `生成报告失败: ${error instanceof Error ? error.message : String(error)}`
        }
      });
    }
    return;
  }

  if (msg.type === 'copy-to-clipboard') {
    figma.clipboard.writeText(msg.text).then(() => {
      figma.ui.postMessage({ type: 'copy-to-clipboard-success' });
    }).catch(() => {
      figma.ui.postMessage({ type: 'copy-to-clipboard-fail' });
    });
    figma.notify('分组数据已复制到剪贴板！');
    return;
  }
};

// 处理智能命令（事务性操作）
function handleSmartCommands(selection: readonly SceneNode[]): any[] {
  const results: any[] = [];
  const initialSelection = [...figma.currentPage.selection];
  
  // 开始整体事务
  figma.commitUndo();
  console.log('开始批量智能命令处理，共', selection.length, '个节点');
  
  let hasErrors = false;
  
  for (const node of selection) {
    const result = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      actions: [] as string[],
      success: false
    };
    
    try {
      console.log('处理节点:', node.name, '类型:', node.type);
      
      // 根据节点类型执行不同的智能操作
      switch (node.type) {
        case 'GROUP':
          // Group 自动转换为 Frame + 自动布局
          const newFrame = convertGroupToAutoLayoutFrame(node as GroupNode);
          if (newFrame) {
            let message = '✅ GROUP转换为FRAME并启用自动布局（Frame Selection + Flatten）';
            // 检查是否进行了名称转换
            if (node.name.toLowerCase().includes('group')) {
              const newName = node.name.replace(/group/gi, 'frame');
              message += `，名称已更新：${node.name} → ${newName}`;
            }
            result.actions.push(message);
            result.success = true;
          } else {
            result.actions.push('❌ GROUP转换失败');
            hasErrors = true;
          }
          break;
          
        case 'FRAME':
          // Frame 启用自动布局（如果未启用）
          const frameNode = node as FrameNode;
          if (!frameNode.layoutMode || frameNode.layoutMode === 'NONE') {
            const success = enableAutoLayoutForFrame(frameNode);
            if (success) {
              result.actions.push('✅ 启用自动布局（事务性操作）');
              result.success = true;
            } else {
              result.actions.push('❌ 启用自动布局失败');
              hasErrors = true;
            }
          } else {
            result.actions.push('ℹ️ 已启用自动布局，跳过');
            result.success = true;
          }
          break;
          
        case 'COMPONENT':
        case 'INSTANCE':
          // 组件和实例节点，检查自动布局
          const componentNode = node as ComponentNode | InstanceNode;
          if ('layoutMode' in componentNode) {
            if (!componentNode.layoutMode || componentNode.layoutMode === 'NONE') {
              const success = enableAutoLayoutForNode(componentNode);
              if (success) {
                result.actions.push('✅ 组件启用自动布局');
                result.success = true;
              } else {
                result.actions.push('❌ 组件启用自动布局失败');
                hasErrors = true;
              }
            } else {
              result.actions.push('ℹ️ 组件已启用自动布局');
              result.success = true;
            }
          } else {
            result.actions.push('ℹ️ 组件不支持自动布局');
            result.success = true;
          }
          break;
          
        default:
          // 其他类型节点
          if (hasChildren(node.type)) {
            // 尝试设置子节点约束
            figma.commitUndo(); // 记录当前状态
            const flexCount = setChildrenToFlexible(node);
            if (flexCount > 0) {
              result.actions.push(`✅ ${flexCount}个子节点设置为自适应`);
              result.success = true;
              figma.commitUndo(); // 记录约束设置状态
            } else {
              result.actions.push('ℹ️ 无需设置子节点约束');
              result.success = true;
            }
          } else {
            result.actions.push('ℹ️ 叶子节点，无需处理');
            result.success = true;
          }
          break;
      }
    } catch (error) {
      console.error('处理节点失败:', node.name, error);
      result.actions.push(`❌ 处理失败: ${error instanceof Error ? error.message : String(error)}`);
      hasErrors = true;
    }
    
    results.push(result);
  }
  
  // 检查是否有错误，决定是否回滚
  if (hasErrors) {
    console.log('检测到错误，开始回滚所有操作...');
    try {
      // 回滚到初始状态
      for (let i = 0; i < 20; i++) { // 最多回滚 20 步
        figma.triggerUndo();
      }
      figma.currentPage.selection = initialSelection;
      console.log('批量操作回滚完成');
      
      // 标记所有结果为失败
      results.forEach(result => {
        if (result.success) {
          result.success = false;
          result.actions.push('⚠️ 由于其他节点处理失败，已回滚此操作');
        }
      });
      
    } catch (undoError) {
      console.error('批量回滚失败:', undoError);
    }
  } else {
    // 所有操作成功，提交最终状态
    figma.commitUndo();
    console.log('所有智能命令执行成功');
  }
  
  return results;
};

// 生成详细的测试报告
function generateDetailedReport(selection: readonly SceneNode[]): any {
  const report = {
    testTime: new Date().toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    fileName: figma.root.name || 'Unknown File',
    statistics: {
      totalNodes: 0,
      nodesByType: {} as Record<string, number>,
      autoLayoutCapableNodes: 0,
      autoLayoutEnabledNodes: 0,
      maxDepth: 0,
      nodesWithChildren: 0
    },
    violations: [] as DesignRuleViolation[],
    detailedNodes: [] as any[],
    summary: {
      totalNodes: 0,
      autoLayoutCapableNodes: 0,
      autoLayoutEnabledNodes: 0,
      violationsCount: 0,
      complianceRate: 0,
      passed: false
    }
  };

  // 分析所有选中的节点
  for (const node of selection) {
    analyzeNodeForReport(node, report, 0);
    
    // 运行自动布局检查
    const nodeViolations = checkAllNodesAutoLayout(node);
    report.violations.push(...nodeViolations);

    // 运行其他UI规范检查
    if (node.type === 'FRAME') {
      const groupViolations = checkRootGrouping(node as FrameNode);
      report.violations.push(...groupViolations);
    }
    const uiViolations = analyzeDesignRules(node);
    report.violations.push(...uiViolations);
  }

  // 生成摘要
  const autoLayoutViolationsCount = report.violations.filter(v => 
    v.violations.some(msg => msg.includes('自动布局'))
  ).length;
  
  report.summary = {
    totalNodes: report.statistics.totalNodes,
    autoLayoutCapableNodes: report.statistics.autoLayoutCapableNodes,
    autoLayoutEnabledNodes: report.statistics.autoLayoutEnabledNodes,
    violationsCount: report.violations.length,
    complianceRate: report.statistics.autoLayoutCapableNodes > 0 ? 
      Math.round(((report.statistics.autoLayoutCapableNodes - autoLayoutViolationsCount) / report.statistics.autoLayoutCapableNodes) * 10000) / 100 : 100,
    passed: report.violations.length === 0
  };

  return report;
}

// 递归分析节点用于报告生成
function analyzeNodeForReport(node: SceneNode, report: any, depth = 0): void {
  const AUTO_LAYOUT_CAPABLE_TYPES = ['FRAME', 'COMPONENT', 'INSTANCE'];
  
  report.statistics.totalNodes++;
  report.statistics.maxDepth = Math.max(report.statistics.maxDepth, depth);
  
  // 统计节点类型
  report.statistics.nodesByType[node.type] = (report.statistics.nodesByType[node.type] || 0) + 1;
  
  // 统计有子节点的节点
  if (hasChildren(node.type) && 'children' in node && node.children.length > 0) {
    report.statistics.nodesWithChildren++;
  }
  
  // 统计支持自动布局的节点
  if (AUTO_LAYOUT_CAPABLE_TYPES.includes(node.type) && 
      'children' in node && node.children && node.children.length > 0) {
    report.statistics.autoLayoutCapableNodes++;
    
    // 统计已启用自动布局的节点
    if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
      report.statistics.autoLayoutEnabledNodes++;
    }
    
    // 添加到详细节点列表
    report.detailedNodes.push({
      id: node.id,
      name: node.name || 'Unnamed',
      type: node.type,
      depth,
      hasChildren: true,
      childrenCount: node.children.length,
      supportsAutoLayout: true,
      layoutMode: ('layoutMode' in node ? node.layoutMode : 'NONE') || 'NONE',
      autoLayoutEnabled: 'layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE',
      dimensions: {
        width: 'width' in node ? Math.round(node.width * 100) / 100 : 0,
        height: 'height' in node ? Math.round(node.height * 100) / 100 : 0
      }
    });
  }
  
  // 递归分析子节点
  if (hasChildren(node.type) && 'children' in node && node.children) {
    for (const child of node.children) {
      analyzeNodeForReport(child as SceneNode, report, depth + 1);
    }
  }
}

// 测试Frame Selection功能
function testFrameSelection(selection: readonly SceneNode[]): { violations: DesignRuleViolation[], message: string } {
  const violations: DesignRuleViolation[] = [];
  let groupCount = 0;
  let frameCount = 0;
  let issueCount = 0;

  function analyzeNode(node: SceneNode, path: string = '') {
    const currentPath = path ? `${path} > ${node.name}` : node.name;
    
    if (node.type === 'GROUP') {
      groupCount++;
      
      // 检查Group是否应该转换为Frame
      if ('children' in node && node.children.length > 0) {
        const hasComplexChildren = node.children.some(child => 
          child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'INSTANCE'
        );
        
        if (hasComplexChildren || node.children.length >= 3) {
          issueCount++;
          violations.push({
            nodeId: node.id,
            nodeName: node.name || 'Unnamed Group',
            type: 'GROUP',
            violations: [
              '此Group包含复杂子元素，建议转换为Frame以获得更好的布局控制',
              `包含 ${node.children.length} 个子元素，其中有复杂组件`
            ],
            suggestions: [
              '使用Frame Selection + Flatten命令将Group转换为Frame',
              '转换后可以启用自动布局功能',
              '提高设计的可维护性和响应式布局能力'
            ]
          });
        }
      }
    } else if (node.type === 'FRAME') {
      frameCount++;
      
      // 检查Frame是否启用了自动布局
      if ('layoutMode' in node && node.layoutMode === 'NONE') {
        if ('children' in node && node.children.length >= 2) {
          violations.push({
            nodeId: node.id,
            nodeName: node.name || 'Unnamed Frame',
            type: 'FRAME',
            violations: [
              'Frame未启用自动布局，可能影响响应式设计',
              `包含 ${node.children.length} 个子元素但使用绝对定位`
            ],
            suggestions: [
              '启用自动布局以获得更好的响应式效果',
              '考虑使用水平或垂直排列方式',
              '设置适当的间距和对齐方式'
            ]
          });
        }
      }
    }
    
    // 递归检查子节点
    if (hasChildren(node.type) && 'children' in node) {
      for (const child of node.children) {
        analyzeNode(child as SceneNode, currentPath);
      }
    }
  }

  // 分析所有选中的节点
  for (const node of selection) {
    analyzeNode(node);
  }

  const message = violations.length === 0 
    ? `✅ Frame Selection测试通过！检查了 ${groupCount} 个Group和 ${frameCount} 个Frame，未发现问题。`
    : `🧪 Frame Selection测试完成：发现 ${violations.length} 个问题需要处理。共检查了 ${groupCount} 个Group和 ${frameCount} 个Frame。`;

  return { violations, message };
}

// 修复Frame Selection问题（支持响应式尺寸选项）
function fixFrameSelectionWithResponsiveSizing(
  selection: readonly SceneNode[], 
  enableResponsiveSizing: boolean = true
): { success: boolean; violations: DesignRuleViolation[]; message: string } {
  const violations: DesignRuleViolation[] = [];
  let fixedCount = 0;
  let errorCount = 0;
  let responsiveCount = 0;
  const results: string[] = [];

  // 开始事务
  figma.commitUndo();

  function fixNode(node: SceneNode): boolean {
    try {
      let nodeFixed = false;
      
      if (node.type === 'GROUP') {
        // 尝试将Group转换为Frame
        const newFrame = convertGroupToAutoLayoutFrame(node as GroupNode);
        if (newFrame) {
          results.push(`✅ ${node.name}: Group转换为Frame并启用自动布局`);
          nodeFixed = true;
          
          // 如果启用了响应式尺寸，应用智能分析
          if (enableResponsiveSizing && newFrame.layoutMode && newFrame.layoutMode !== 'NONE') {
            const analyses = analyzeChildrenForResponsiveSizing(newFrame, newFrame.layoutMode);
            const responsiveSetCount = setChildrenResponsiveSizingWithAnalysis(newFrame, newFrame.layoutMode, analyses);
            if (responsiveSetCount > 0) {
              responsiveCount += responsiveSetCount;
              results.push(`📐 ${node.name}: 设置了${responsiveSetCount}个子元素的智能响应式尺寸`);
            }
          }
        } else {
          results.push(`❌ ${node.name}: Group转换失败`);
          return false;
        }
      } else if (node.type === 'FRAME') {
        // 尝试为Frame启用自动布局
        const frameNode = node as FrameNode;
        if (frameNode.layoutMode === 'NONE' && 'children' in frameNode && frameNode.children.length >= 2) {
          const success = enableAutoLayoutForNode(frameNode);
          if (success) {
            results.push(`✅ ${node.name}: Frame启用自动布局`);
            nodeFixed = true;
            
            // 如果启用了响应式尺寸，应用智能分析
            if (enableResponsiveSizing && frameNode.layoutMode && frameNode.layoutMode !== 'NONE') {
              const analyses = analyzeChildrenForResponsiveSizing(frameNode, frameNode.layoutMode);
              const responsiveSetCount = setChildrenResponsiveSizingWithAnalysis(frameNode, frameNode.layoutMode, analyses);
              if (responsiveSetCount > 0) {
                responsiveCount += responsiveSetCount;
                results.push(`📐 ${node.name}: 设置了${responsiveSetCount}个子元素的智能响应式尺寸`);
              }
            }
          } else {
            results.push(`❌ ${node.name}: Frame自动布局启用失败`);
            return false;
          }
        } else if (frameNode.layoutMode !== 'NONE') {
          // Frame已有自动布局，只处理响应式尺寸
          if (enableResponsiveSizing && 'children' in frameNode && frameNode.children.length > 0) {
            const analyses = analyzeChildrenForResponsiveSizing(frameNode, frameNode.layoutMode);
            const responsiveSetCount = setChildrenResponsiveSizingWithAnalysis(frameNode, frameNode.layoutMode, analyses);
            if (responsiveSetCount > 0) {
              responsiveCount += responsiveSetCount;
              results.push(`📐 ${node.name}: 设置了${responsiveSetCount}个子元素的智能响应式尺寸`);
              nodeFixed = true;
            }
          }
        }
      }
      
      return nodeFixed || true; // 不需要修复的节点也返回true
    } catch (error) {
      results.push(`❌ ${node.name}: 修复失败 - ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  // 递归处理节点
  function processNode(node: SceneNode) {
    const success = fixNode(node);
    if (success) {
      fixedCount++;
    } else {
      errorCount++;
    }
    
    // 递归处理子节点
    if (hasChildren(node.type) && 'children' in node) {
      for (const child of node.children) {
        processNode(child as SceneNode);
      }
    }
  }

  // 处理所有选中的节点
  for (const node of selection) {
    processNode(node);
  }

  // 如果有错误，考虑回滚
  if (errorCount > 0 && fixedCount === 0) {
    try {
      figma.triggerUndo();
      results.push('⚠️ 所有修复都失败了，已回滚所有更改');
    } catch (undoError) {
      results.push('⚠️ 修复失败且无法回滚，请手动检查');
    }
  }

  // 生成修复结果的违规报告格式
  if (results.length > 0) {
    violations.push({
      nodeId: 'fix-results',
      nodeName: 'Frame Selection修复结果',
      type: 'REPORT',
      violations: results.filter(r => r.includes('❌')),
      suggestions: results.filter(r => r.includes('✅') || r.includes('📐'))
    });
  }

  const responsiveInfo = responsiveCount > 0 ? ` (包含${responsiveCount}个响应式尺寸设置)` : '';
  const responsiveStatus = enableResponsiveSizing ? '启用' : '禁用';
  
  const message = errorCount === 0 
    ? `🔧 Frame Selection修复完成！成功处理了 ${fixedCount} 个节点${responsiveInfo}。\n📐 响应式尺寸: ${responsiveStatus}`
    : `🔧 Frame Selection修复完成：成功 ${fixedCount} 个，失败 ${errorCount} 个${responsiveInfo}。\n📐 响应式尺寸: ${responsiveStatus}\n详情请查看结果列表。`;

  return { success: errorCount === 0, violations, message };
}

// 修复Frame Selection问题（原版本，保持向后兼容）
function fixFrameSelection(selection: readonly SceneNode[]): { violations: DesignRuleViolation[], message: string } {
  const violations: DesignRuleViolation[] = [];
  let fixedCount = 0;
  let errorCount = 0;
  const results: string[] = [];

  // 开始事务
  figma.commitUndo();

  function fixNode(node: SceneNode): boolean {
    try {
      if (node.type === 'GROUP') {
        // 尝试将Group转换为Frame
        const newFrame = convertGroupToAutoLayoutFrame(node as GroupNode);
        if (newFrame) {
          results.push(`✅ ${node.name}: Group转换为Frame并启用自动布局`);
          return true;
        } else {
          results.push(`❌ ${node.name}: Group转换失败`);
          return false;
        }
      } else if (node.type === 'FRAME') {
        // 尝试为Frame启用自动布局
        const frameNode = node as FrameNode;
        if (frameNode.layoutMode === 'NONE' && 'children' in frameNode && frameNode.children.length >= 2) {
          const success = enableAutoLayoutForNode(frameNode);
          if (success) {
            results.push(`✅ ${node.name}: Frame启用自动布局`);
            return true;
          } else {
            results.push(`❌ ${node.name}: Frame自动布局启用失败`);
            return false;
          }
        }
      }
      return true; // 不需要修复的节点
    } catch (error) {
      results.push(`❌ ${node.name}: 修复失败 - ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  // 递归处理节点
  function processNode(node: SceneNode) {
    const success = fixNode(node);
    if (success) {
      fixedCount++;
    } else {
      errorCount++;
    }
    
    // 递归处理子节点
    if (hasChildren(node.type) && 'children' in node) {
      for (const child of node.children) {
        processNode(child as SceneNode);
      }
    }
  }

  // 处理所有选中的节点
  for (const node of selection) {
    processNode(node);
  }

  // 如果有错误，考虑回滚
  if (errorCount > 0 && fixedCount === 0) {
    try {
      figma.triggerUndo();
      results.push('⚠️ 所有修复都失败了，已回滚所有更改');
    } catch (undoError) {
      results.push('⚠️ 修复失败且无法回滚，请手动检查');
    }
  }

  // 生成修复结果的违规报告格式
  if (results.length > 0) {
    violations.push({
      nodeId: 'fix-results',
      nodeName: 'Frame Selection修复结果',
      type: 'REPORT',
      violations: results.filter(r => r.includes('❌')),
      suggestions: results.filter(r => r.includes('✅'))
    });
  }

  const message = errorCount === 0 
    ? `🔧 Frame Selection修复完成！成功处理了 ${fixedCount} 个节点。`
    : `🔧 Frame Selection修复完成：成功 ${fixedCount} 个，失败 ${errorCount} 个。详情请查看结果列表。`;

  return { violations, message };
}

// 创建测试Frame节点（未启用自动布局的Frame）
function createTestFrames(): { success: boolean; message: string; details?: string[]; nodeCount?: number; error?: string } {
  try {
    if (!checkEditPermission()) {
      return {
        success: false,
        message: '❌ 创建失败',
        error: '当前文件为只读模式，无法创建测试节点。请确保您有编辑权限。'
      };
    }

    const details: string[] = [];
    let nodeCount = 0;

    // 创建测试Frame 1: 容器Frame
    const containerFrame = figma.createFrame();
    containerFrame.name = "Container Frame";
    containerFrame.resize(200, 150);
    containerFrame.x = 400;
    containerFrame.y = 0;
    containerFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
    // 故意不启用自动布局
    
    // 添加头部
    const header = figma.createFrame();
    header.name = "Header";
    header.resize(180, 40);
    header.x = 10;
    header.y = 10;
    header.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 1 } }];
    containerFrame.appendChild(header);
    
    // 添加内容区
    const content = figma.createFrame();
    content.name = "Content";
    content.resize(180, 60);
    content.x = 10;
    content.y = 60;
    content.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    containerFrame.appendChild(content);
    
    // 添加底部
    const footer = figma.createFrame();
    footer.name = "Footer";
    footer.resize(180, 30);
    footer.x = 10;
    footer.y = 130;
    footer.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    containerFrame.appendChild(footer);
    
    details.push("Container Frame - 包含Header/Content/Footer但未启用自动布局");
    nodeCount += 4;

    // 创建测试Frame 2: 侧边栏Frame
    const sidebarFrame = figma.createFrame();
    sidebarFrame.name = "Sidebar Frame";
    sidebarFrame.resize(150, 200);
    sidebarFrame.x = 620;
    sidebarFrame.y = 0;
    sidebarFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
    
    // 添加菜单项
    for (let i = 0; i < 4; i++) {
      const menuItem = figma.createRectangle();
      menuItem.name = `Menu Item ${i + 1}`;
      menuItem.resize(130, 30);
      menuItem.x = 10;
      menuItem.y = 10 + i * 40;
      menuItem.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      menuItem.cornerRadius = 4;
      sidebarFrame.appendChild(menuItem);
      nodeCount++;
    }
    
    details.push("Sidebar Frame - 包含多个菜单项但未启用自动布局");
    nodeCount += 1;

    // 创建测试Frame 3: 工具栏Frame
    const toolbarFrame = figma.createFrame();
    toolbarFrame.name = "Toolbar Frame";
    toolbarFrame.resize(300, 50);
    toolbarFrame.x = 400;
    toolbarFrame.y = 170;
    toolbarFrame.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    
    // 添加工具按钮
    for (let i = 0; i < 5; i++) {
      const toolButton = figma.createEllipse();
      toolButton.name = `Tool ${i + 1}`;
      toolButton.resize(30, 30);
      toolButton.x = 10 + i * 50;
      toolButton.y = 10;
      toolButton.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.7, b: 0.3 } }];
      toolbarFrame.appendChild(toolButton);
      nodeCount++;
    }
    
    details.push("Toolbar Frame - 包含多个工具按钮但未启用自动布局");
    nodeCount += 1;

    // 选中所有创建的Frame
    figma.currentPage.selection = [containerFrame, sidebarFrame, toolbarFrame];
    figma.viewport.scrollAndZoomIntoView([containerFrame, sidebarFrame, toolbarFrame]);

    return {
      success: true,
      message: "✅ 成功创建未启用自动布局的Frame节点！",
      details,
      nodeCount
    };

  } catch (error) {
    console.error('创建测试Frame失败:', error);
    return {
      success: false,
      message: '❌ 创建失败',
      error: `创建失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// 插件启动时立即处理当前选中的节点
processSelection();

// 监听选择变化
figma.on('selectionchange', () => {
  processSelection();
});

// 监听文件关闭
figma.on('close', () => {
  console.log('--- 插件运行结束 ---');
});

// 创建复杂的嵌套结构（混合Group和Frame的问题）
async function createComplexStructure(): Promise<{ success: boolean; message: string; details?: string[]; nodeCount?: number; error?: string }> {
  try {
    if (!checkEditPermission()) {
      return {
        success: false,
        message: '❌ 创建失败',
        error: '当前文件为只读模式，无法创建测试节点。请确保您有编辑权限。'
      };
    }

    const details: string[] = [];
    let nodeCount = 0;

    // 创建主容器Frame（未启用自动布局）
    const mainContainer = figma.createFrame();
    mainContainer.name = "Main Container";
    mainContainer.resize(400, 300);
    mainContainer.x = 0;
    mainContainer.y = 200;
    mainContainer.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
    
    // 在主容器中创建问题Group 1
    const headerGroup = figma.group([], mainContainer);
    headerGroup.name = "header group";  // 故意使用小写，测试名称转换
    
    const headerBg = figma.createRectangle();
    headerBg.name = "Header Background";
    headerBg.resize(380, 60);
    headerBg.x = 10;
    headerBg.y = 10;
    headerBg.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 } }];
    headerGroup.appendChild(headerBg);
    
    const headerTitle = figma.createText();
    headerTitle.name = "Header Title";
    await figma.loadFontAsync({ family: "Inter", style: "Regular" }).catch(() => {
      return figma.loadFontAsync(headerTitle.fontName as FontName);
    });
    headerTitle.characters = "复杂结构标题";
    headerTitle.x = 20;
    headerTitle.y = 25;
    headerTitle.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    headerGroup.appendChild(headerTitle);
    
    details.push("header group - 包含背景和标题的Group（需要转换为Frame）");
    nodeCount += 3;

    // 创建内容区域的Group（包含Frame子元素）
    const contentGroup = figma.group([], mainContainer);
    contentGroup.name = "content group";
    
    // 在Group中添加一个Frame（这会让Group变得复杂）
    const leftPanel = figma.createFrame();
    leftPanel.name = "Left Panel";
    leftPanel.resize(180, 150);
    leftPanel.x = 10;
    leftPanel.y = 80;
    leftPanel.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    contentGroup.appendChild(leftPanel);
    
    // 在左侧面板中添加一些元素
    for (let i = 0; i < 3; i++) {
      const item = figma.createRectangle();
      item.name = `Item ${i + 1}`;
      item.resize(160, 30);
      item.x = 10;
      item.y = 10 + i * 40;
      item.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
      item.cornerRadius = 4;
      leftPanel.appendChild(item);
      nodeCount++;
    }
    
    const rightPanel = figma.createFrame();
    rightPanel.name = "Right Panel";
    rightPanel.resize(180, 150);
    rightPanel.x = 200;
    rightPanel.y = 80;
    rightPanel.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    contentGroup.appendChild(rightPanel);
    
    details.push("content group - 包含Frame子元素的复杂Group");
    nodeCount += 3;

    // 创建底部的Group
    const footerGroup = figma.group([], mainContainer);
    footerGroup.name = "Footer Group";
    
    const footerBg = figma.createRectangle();
    footerBg.name = "Footer Background";
    footerBg.resize(380, 40);
    footerBg.x = 10;
    footerBg.y = 250;
    footerBg.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    footerGroup.appendChild(footerBg);
    
    // 添加多个按钮
    for (let i = 0; i < 4; i++) {
      const button = figma.createRectangle();
      button.name = `Footer Button ${i + 1}`;
      button.resize(60, 24);
      button.x = 20 + i * 80;
      button.y = 258;
      button.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 1 } }];
      button.cornerRadius = 4;
      footerGroup.appendChild(button);
      nodeCount++;
    }
    
    details.push("Footer Group - 包含多个按钮的Group");
    nodeCount += 5;

    // 在主容器外创建一个独立的问题Frame
    const problemFrame = figma.createFrame();
    problemFrame.name = "Problem Frame";
    problemFrame.resize(150, 100);
    problemFrame.x = 420;
    problemFrame.y = 200;
    problemFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 1 } }];
    // 故意不启用自动布局，但添加多个子元素
    
    for (let i = 0; i < 3; i++) {
      const element = figma.createEllipse();
      element.name = `Element ${i + 1}`;
      element.resize(30, 30);
      element.x = 10 + i * 40;
      element.y = 35;
      element.fills = [{ type: 'SOLID', color: { r: Math.random(), g: Math.random(), b: Math.random() } }];
      problemFrame.appendChild(element);
      nodeCount++;
    }
    
    details.push("Problem Frame - 包含多个元素但未启用自动布局的Frame");
    nodeCount += 4;

    // 选中所有创建的节点
    figma.currentPage.selection = [mainContainer, problemFrame];
    figma.viewport.scrollAndZoomIntoView([mainContainer, problemFrame]);

    return {
      success: true,
      message: "✅ 成功创建复杂的嵌套结构！",
      details,
      nodeCount
    };

  } catch (error) {
    console.error('创建复杂结构失败:', error);
    return {
      success: false,
      message: '❌ 创建失败',
      error: `创建失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// 清理测试节点
function clearTestNodes(): { success: boolean; message: string; details?: string[]; nodeCount?: number; error?: string } {
  try {
    if (!checkEditPermission()) {
      return {
        success: false,
        message: '❌ 清理失败',
        error: '当前文件为只读模式，无法删除测试节点。请确保您有编辑权限。'
      };
    }

    const details: string[] = [];
    let nodeCount = 0;

    // 查找并删除测试节点（根据名称模式识别）
    const testNodeNames = [
      "Button Group", "Navigation Group", "Card Group",
      "Container Frame", "Sidebar Frame", "Toolbar Frame",
      "Main Container", "Problem Frame",
      "header group", "content group", "Footer Group",
      "Card List Container"
    ];

    const allNodes = figma.currentPage.children;
    const nodesToDelete: SceneNode[] = [];

    for (const node of allNodes) {
      if (testNodeNames.includes(node.name)) {
        nodesToDelete.push(node);
      }
    }

    if (nodesToDelete.length === 0) {
      return {
        success: true,
        message: "ℹ️ 没有找到需要清理的测试节点",
        details: ["页面中没有找到测试节点"],
        nodeCount: 0
      };
    }

    // 删除找到的测试节点
    for (const node of nodesToDelete) {
      details.push(`删除: ${node.name} (${node.type})`);
      node.remove();
      nodeCount++;
    }

    // 清空选择
    figma.currentPage.selection = [];

    return {
      success: true,
      message: "✅ 成功清理测试节点！",
      details,
      nodeCount
    };

  } catch (error) {
    console.error('清理测试节点失败:', error);
    return {
      success: false,
      message: '❌ 清理失败',
      error: `清理失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// 智能自动修复功能 - 使用事务性内置命令
function autoFixWithCommands(node: SceneNode): FixResult {
  const result: FixResult = {
    nodeId: node.id,
    nodeName: node.name || 'Unnamed',
    originalType: node.type,
    fixes: [],
    success: false
  };
  
  try {
    // GROUP 转 FRAME + 自动布局
    if (node.type === 'GROUP') {
      const newFrame = convertGroupToAutoLayoutFrame(node as GroupNode);
      if (newFrame) {
        result.newType = 'FRAME';
        let message = 'GROUP转换为FRAME并启用自动布局（Frame Selection + Flatten）';
        // 检查是否进行了名称转换
        if (node.name.toLowerCase().includes('group')) {
          const newName = node.name.replace(/group/gi, 'frame');
          message += `，名称已更新：${node.name} → ${newName}`;
        }
        result.fixes.push(message);
        result.success = true;
        return result;
      } else {
        result.error = 'GROUP转换失败，已自动回滚';
        return result;
      }
    }
    
    // FRAME 启用自动布局
    if (node.type === 'FRAME') {
      const frameNode = node as FrameNode;
      const hasAutoLayout = frameNode.layoutMode && frameNode.layoutMode !== 'NONE';
      
      if (!hasAutoLayout) {
        const success = enableAutoLayoutForFrame(frameNode);
        if (success) {
          result.fixes.push('启用自动布局（事务性操作）');
          result.success = true;
        } else {
          result.error = '启用自动布局失败，已自动回滚';
          return result;
        }
      } else {
        result.fixes.push('已启用自动布局，无需处理');
        result.success = true;
      }
      
      return result;
    }
    
    // 其他类型节点
    result.fixes.push('节点类型无需特殊处理');
    result.success = true;
    return result;
    
  } catch (error) {
    console.error('自动修复失败:', error);
    result.error = `修复失败: ${error instanceof Error ? error.message : String(error)}`;
    return result;
  }
}

// 智能分析接口
interface AnalysisResult {
  hasSelection: boolean;
  nodeCount: number;
  issueCount: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    nodeId?: string;
    nodeName?: string;
  }>;
  canAutoFix: boolean;
  canApplyLayout: boolean;
  canConvertGroups: boolean;
  recommendations: string[];
}

// 智能分析当前选择
function analyzeCurrentSelection(): AnalysisResult {
  const selection = figma.currentPage.selection;
  
  const result: AnalysisResult = {
    hasSelection: selection.length > 0,
    nodeCount: 0,
    issueCount: 0,
    issues: [],
    canAutoFix: false,
    canApplyLayout: false,
    canConvertGroups: false,
    recommendations: []
  };

  if (selection.length === 0) {
    return result;
  }

  // 分析每个选中的节点
  const allNodes: SceneNode[] = [];
  
  function collectNodes(node: SceneNode) {
    allNodes.push(node);
    if (hasChildren(node.type) && 'children' in node) {
      for (const child of node.children) {
        collectNodes(child);
      }
    }
  }

  selection.forEach(node => collectNodes(node));
  result.nodeCount = allNodes.length;

  // 检测问题
  let hasGroups = false;
  let hasFramesWithoutAutoLayout = false;
  let hasLayoutIssues = false;
  let hasResponsiveSizingIssues = false;

  for (const node of allNodes) {
    // 检查Group节点
    if (node.type === 'GROUP') {
      hasGroups = true;
      result.issues.push({
        type: 'warning',
        message: `Group "${node.name}" 应该转换为Frame以支持自动布局`,
        nodeId: node.id,
        nodeName: node.name
      });
    }

    // 检查Frame自动布局
    if (node.type === 'FRAME') {
      const frame = node as FrameNode;
      const hasAutoLayout = frame.layoutMode && frame.layoutMode !== 'NONE';
      
      if (!hasAutoLayout && hasChildren(node.type) && 'children' in node && node.children.length > 1) {
        hasFramesWithoutAutoLayout = true;
        result.issues.push({
          type: 'error',
          message: `Frame "${node.name}" 包含多个子元素但未启用自动布局`,
          nodeId: node.id,
          nodeName: node.name
        });
      }

      // 检查响应式尺寸设置
      if (hasAutoLayout && 'children' in node) {
        for (const child of node.children) {
          if ('layoutSizingHorizontal' in child && 'layoutSizingVertical' in child) {
            const supportedTypes = ['FRAME', 'COMPONENT', 'INSTANCE', 'TEXT'];
            if (supportedTypes.includes(child.type)) {
              const horizontal = child.layoutSizingHorizontal;
              const vertical = child.layoutSizingVertical;
              
              // 检查是否使用了不合适的尺寸设置
              if (horizontal === 'FIXED' && vertical === 'FIXED' && child.type !== 'TEXT') {
                hasResponsiveSizingIssues = true;
                result.issues.push({
                  type: 'info',
                  message: `"${child.name}" 可以优化为响应式尺寸设置`,
                  nodeId: child.id,
                  nodeName: child.name
                });
              }
            }
          }
        }
      }
    }

    // 检查布局问题
    if (hasChildren(node.type) && 'children' in node && node.children.length > 0) {
      const violations = analyzeDesignRules(node);
      if (violations.length > 0) {
        hasLayoutIssues = true;
        violations.forEach(violation => {
          result.issues.push({
            type: 'warning',
            message: violation.violations[0] || '发现布局问题',
            nodeId: violation.nodeId,
            nodeName: violation.nodeName
          });
        });
      }
    }
  }

  result.issueCount = result.issues.length;

  // 确定可执行的操作
  result.canConvertGroups = hasGroups;
  result.canApplyLayout = hasFramesWithoutAutoLayout || hasResponsiveSizingIssues;
  result.canAutoFix = hasGroups || hasFramesWithoutAutoLayout || hasLayoutIssues;

  // 生成建议
  if (result.issues.length === 0) {
    result.recommendations.push('✅ 选中的节点布局状态良好，无需修复');
    result.recommendations.push('💡 可以使用工具提取数据或生成报告');
  } else {
    if (hasGroups) {
      result.recommendations.push('🔄 建议将Group转换为Frame以支持现代布局');
    }
    if (hasFramesWithoutAutoLayout) {
      result.recommendations.push('⚡ 建议为包含多个子元素的Frame启用自动布局');
    }
    if (hasResponsiveSizingIssues) {
      result.recommendations.push('📐 建议优化子元素的响应式尺寸设置');
    }
    if (hasLayoutIssues) {
      result.recommendations.push('🎯 建议应用智能布局以改善对齐和间距');
    }
  }

  return result;
}

// 执行全面自动修复
function performComprehensiveAutoFix(settings: any): { success: boolean; message: string; details: string[] } {
  const selection = figma.currentPage.selection;
  const details: string[] = [];
  let successCount = 0;
  let totalCount = 0;
  let responsiveCount = 0;

  // 默认启用响应式尺寸设置
  const enableResponsiveSizing = settings.enableResponsiveSizing !== false; // 默认为true

  if (selection.length === 0) {
    return {
      success: false,
      message: '没有选中任何节点',
      details: ['请先选择要修复的节点']
    };
  }

  details.push(`🚀 开始全面自动修复，共${selection.length}个节点`);
  details.push(`📐 响应式尺寸设置: ${enableResponsiveSizing ? '启用' : '禁用'}`);
  details.push('');

  try {
    // 递归处理所有节点，包括子节点
    function processNodeRecursively(node: SceneNode, depth: number = 0) {
      const indent = '  '.repeat(depth);
      totalCount++;
      
      if (node.type === 'GROUP') {
        const converted = convertGroupToAutoLayoutFrame(node as GroupNode);
        if (converted) {
          successCount++;
          details.push(`${indent}✅ ${node.name}: Group转换为Frame并启用自动布局`);
          
          // 应用智能响应式尺寸设置
          if (enableResponsiveSizing && converted.layoutMode && converted.layoutMode !== 'NONE') {
            const analyses = analyzeChildrenForResponsiveSizing(converted, converted.layoutMode);
            const count = setChildrenResponsiveSizingWithAnalysis(converted, converted.layoutMode, analyses);
            if (count > 0) {
              responsiveCount += count;
              details.push(`${indent}📐 ${node.name}: 设置了${count}个子元素的智能响应式尺寸`);
            }
          }
        } else {
          details.push(`${indent}❌ ${node.name}: Group转换失败`);
        }
      } else if (node.type === 'FRAME') {
        const frame = node as FrameNode;
        const hasAutoLayout = frame.layoutMode && frame.layoutMode !== 'NONE';
        
        if (!hasAutoLayout && 'children' in frame && frame.children.length > 1) {
          const success = enableAutoLayoutForNode(frame);
          if (success) {
            successCount++;
            details.push(`${indent}✅ ${node.name}: 启用自动布局`);
            
                      // 应用智能响应式尺寸设置
          if (enableResponsiveSizing && frame.layoutMode && frame.layoutMode !== 'NONE') {
            const layoutDirection = frame.layoutMode as 'HORIZONTAL' | 'VERTICAL';
            const analyses = analyzeChildrenForResponsiveSizing(frame, layoutDirection);
            const count = setChildrenResponsiveSizingWithAnalysis(frame, layoutDirection, analyses);
              if (count > 0) {
                responsiveCount += count;
                details.push(`${indent}📐 ${node.name}: 设置了${count}个子元素的智能响应式尺寸`);
              }
            }
          } else {
            details.push(`${indent}❌ ${node.name}: 启用自动布局失败`);
          }
        } else if (hasAutoLayout) {
          // 已有自动布局，优化响应式尺寸
          if (enableResponsiveSizing && 'children' in frame && frame.children.length > 0 && frame.layoutMode !== 'NONE') {
            const layoutDirection = frame.layoutMode as 'HORIZONTAL' | 'VERTICAL';
            const analyses = analyzeChildrenForResponsiveSizing(frame, layoutDirection);
            const count = setChildrenResponsiveSizingWithAnalysis(frame, layoutDirection, analyses);
            if (count > 0) {
              successCount++;
              responsiveCount += count;
              details.push(`${indent}📐 ${node.name}: 优化了${count}个子元素的智能响应式尺寸`);
            } else {
              details.push(`${indent}⚪ ${node.name}: 响应式尺寸已是最佳状态`);
            }
          }
        } else {
          details.push(`${indent}ℹ️ ${node.name}: Frame无需处理 (${frame.children?.length || 0}个子元素)`);
        }
      } else {
        details.push(`${indent}ℹ️ ${node.name}: ${node.type}类型无需特殊处理`);
      }

      // 递归处理子节点
      if (hasChildren(node.type) && 'children' in node) {
        for (const child of node.children) {
          processNodeRecursively(child as SceneNode, depth + 1);
        }
      }
    }

    // 处理所有选中的节点
    for (const node of selection) {
      processNodeRecursively(node);
    }

    details.push('');
    details.push(`🎯 修复总结:`);
    details.push(`  • 处理节点: ${totalCount} 个`);
    details.push(`  • 成功修复: ${successCount} 个`);
    if (enableResponsiveSizing && responsiveCount > 0) {
      details.push(`  • 响应式设置: ${responsiveCount} 个子元素`);
    }

    const message = `修复完成！成功处理 ${successCount}/${totalCount} 个节点${responsiveCount > 0 ? `，设置了${responsiveCount}个子元素的响应式尺寸` : ''}`;
    return {
      success: successCount > 0,
      message,
      details
    };

  } catch (error) {
    console.error('自动修复失败:', error);
    return {
      success: false,
      message: '自动修复过程中出现错误',
      details: [`错误: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

// 转换Groups为Frames
function convertSelectedGroups(): { success: boolean; message: string; details: string[] } {
  const selection = figma.currentPage.selection;
  const details: string[] = [];
  let convertedCount = 0;

  const groups = selection.filter(node => node.type === 'GROUP') as GroupNode[];
  
  if (groups.length === 0) {
    return {
      success: false,
      message: '没有找到需要转换的Group',
      details: ['请选择包含Group的节点']
    };
  }

  try {
    for (const group of groups) {
      const converted = convertGroupToAutoLayoutFrame(group);
      if (converted) {
        convertedCount++;
        details.push(`✅ ${group.name}: Group → Frame (自动布局已启用)`);
      } else {
        details.push(`❌ ${group.name}: 转换失败`);
      }
    }

    return {
      success: convertedCount > 0,
      message: `转换完成！成功转换 ${convertedCount}/${groups.length} 个Group`,
      details
    };

  } catch (error) {
    console.error('转换Groups失败:', error);
    return {
      success: false,
      message: '转换过程中出现错误',
      details: [`错误: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

// 创建复杂卡片列表
async function createCardList(): Promise<{ success: boolean; message: string; details?: string[]; nodeCount?: number; error?: string }> {
  try {
    if (!checkEditPermission()) {
      return {
        success: false,
        message: '❌ 创建失败',
        error: '当前文件为只读模式，无法创建测试节点。请确保您有编辑权限。'
      };
    }

    const details: string[] = [];
    let nodeCount = 0;

    // 预加载所有需要的字体
    try {
      await figma.loadFontAsync({ family: "Inter", style: "Bold" });
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    } catch (fontError) {
      console.warn('字体加载失败，使用默认字体:', fontError);
    }

    // 创建主容器Frame
    const mainContainer = figma.createFrame();
    mainContainer.name = "Card List Container";
    mainContainer.resize(600, 800);
    mainContainer.x = 0;
    mainContainer.y = 0;
    mainContainer.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96 } }];
    mainContainer.cornerRadius = 8;
    nodeCount++;

    // 创建标题区域 - 先创建背景元素
    const headerBg = figma.createRectangle();
    headerBg.name = "Header Background";
    headerBg.resize(580, 80);
    headerBg.x = 10;
    headerBg.y = 10;
    headerBg.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.2, b: 0.4 } }];
    headerBg.cornerRadius = 6;
    mainContainer.appendChild(headerBg);
    
    // 创建标题区域Frame
    const headerFrame = figma.createFrame();
    headerFrame.name = "Header Section";
    headerFrame.resize(580, 80);
    headerFrame.x = 10;
    headerFrame.y = 10;
    headerFrame.fills = [];
    mainContainer.appendChild(headerFrame);
    
    // 将背景移到headerFrame中
    headerBg.x = 0;
    headerBg.y = 0;
    headerFrame.appendChild(headerBg);
    
    const headerTitle = figma.createText();
    headerTitle.name = "Header Title";
    try {
      headerTitle.fontName = { family: "Inter", style: "Bold" };
    } catch (fontError) {
      console.warn('设置字体失败，使用默认字体:', fontError);
    }
    headerTitle.characters = "产品卡片列表";
    headerTitle.fontSize = 24;
    headerTitle.x = 20;
    headerTitle.y = 25;
    headerTitle.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    headerFrame.appendChild(headerTitle);
    
    const headerSubtitle = figma.createText();
    headerSubtitle.name = "Header Subtitle";
    try {
      headerSubtitle.fontName = { family: "Inter", style: "Regular" };
    } catch (fontError) {
      console.warn('设置字体失败，使用默认字体:', fontError);
    }
    headerSubtitle.characters = "包含多种信息的复杂卡片布局示例";
    headerSubtitle.fontSize = 14;
    headerSubtitle.x = 20;
    headerSubtitle.y = 45;
    headerSubtitle.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
    headerFrame.appendChild(headerSubtitle);
    
    details.push("Header Section - 包含标题和副标题的Group");
    nodeCount += 3;

    // 创建卡片列表容器Frame
    const cardListFrame = figma.createFrame();
    cardListFrame.name = "Card List";
    cardListFrame.resize(600, 700);
    cardListFrame.x = 0;
    cardListFrame.y = 100;
    cardListFrame.fills = [];
    mainContainer.appendChild(cardListFrame);

    // 卡片数据
    const cardData = [
      {
        title: "智能手机 Pro Max",
        subtitle: "最新旗舰产品",
        price: "¥8,999",
        status: "热销",
        rating: "4.8",
        description: "配备最新处理器，超长续航，专业摄影系统",
        image: { r: 0.2, g: 0.6, b: 1.0 },
        statusColor: { r: 1.0, g: 0.3, b: 0.3 }
      },
      {
        title: "无线耳机 Ultra",
        subtitle: "降噪黑科技",
        price: "¥2,499",
        status: "新品",
        rating: "4.6",
        description: "主动降噪，无线充电，音质卓越",
        image: { r: 0.8, g: 0.2, b: 0.8 },
        statusColor: { r: 0.2, g: 0.8, b: 0.2 }
      },
      {
        title: "智能手表 Series X",
        subtitle: "健康管理专家",
        price: "¥3,299",
        status: "预售",
        rating: "4.9",
        description: "全天候健康监测，运动追踪，智能提醒",
        image: { r: 1.0, g: 0.6, b: 0.2 },
        statusColor: { r: 0.9, g: 0.6, b: 0.1 }
      },
      {
        title: "平板电脑 Air",
        subtitle: "轻薄便携",
        price: "¥4,599",
        status: "现货",
        rating: "4.7",
        description: "超薄设计，高清屏幕，办公娱乐两不误",
        image: { r: 0.3, g: 0.8, b: 0.3 },
        statusColor: { r: 0.5, g: 0.5, b: 0.5 }
      },
      {
        title: "笔记本电脑 Pro",
        subtitle: "性能怪兽",
        price: "¥12,999",
        status: "定制",
        rating: "4.9",
        description: "顶级配置，专业显卡，创作者首选",
        image: { r: 0.6, g: 0.3, b: 0.9 },
        statusColor: { r: 0.3, g: 0.3, b: 0.8 }
      }
    ];

    // 创建每个卡片
    for (let i = 0; i < cardData.length; i++) {
      const card = cardData[i];
      const yOffset = 110 + i * 140;

      // 创建卡片背景
      const cardBg = figma.createRectangle();
      cardBg.name = "Card Background";
      cardBg.resize(560, 120);
      cardBg.x = 20;
      cardBg.y = yOffset;
      cardBg.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      cardBg.cornerRadius = 8;
      cardBg.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 2 },
        radius: 8,
        visible: true,
        blendMode: 'NORMAL'
      }];
      cardListFrame.appendChild(cardBg);

      // 创建卡片容器Frame
      const cardFrame = figma.createFrame();
      cardFrame.resize(560, 120);
      cardFrame.x = 20;
      cardFrame.y = yOffset - 100; // 相对于cardListFrame的位置
      cardFrame.fills = [];
      cardListFrame.appendChild(cardFrame);
      
      // 将背景移到cardFrame中
      cardBg.x = 0;
      cardBg.y = 0;
      cardFrame.appendChild(cardBg);
      cardFrame.name = `Product Card ${i + 1}`;

      // 产品图片
      const productImage = figma.createRectangle();
      productImage.name = "Product Image";
      productImage.resize(80, 80);
      productImage.x = 15;
      productImage.y = 20;
      productImage.fills = [{ type: 'SOLID', color: card.image }];
      productImage.cornerRadius = 6;
      cardFrame.appendChild(productImage);

      // 图片上的图标
      const imageIcon = figma.createEllipse();
      imageIcon.name = "Image Icon";
      imageIcon.resize(24, 24);
      imageIcon.x = 43;
      imageIcon.y = 48;
      imageIcon.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      cardFrame.appendChild(imageIcon);

      // 产品标题
      const title = figma.createText();
      title.name = "Product Title";
      try {
        title.fontName = { family: "Inter", style: "Bold" };
      } catch (fontError) {
        console.warn('设置字体失败，使用默认字体:', fontError);
      }
      title.characters = card.title;
      title.fontSize = 18;
      title.x = 110;
      title.y = 25;
      title.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
      cardFrame.appendChild(title);

      // 产品副标题
      const subtitle = figma.createText();
      subtitle.name = "Product Subtitle";
      try {
        subtitle.fontName = { family: "Inter", style: "Regular" };
      } catch (fontError) {
        console.warn('设置字体失败，使用默认字体:', fontError);
      }
      subtitle.characters = card.subtitle;
      subtitle.fontSize = 14;
      subtitle.x = 110;
      subtitle.y = 45;
      subtitle.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
      cardFrame.appendChild(subtitle);

      // 产品描述
      const description = figma.createText();
      description.name = "Product Description";
      try {
        description.fontName = { family: "Inter", style: "Regular" };
      } catch (fontError) {
        console.warn('设置字体失败，使用默认字体:', fontError);
      }
      description.characters = card.description;
      description.fontSize = 12;
      description.x = 110;
      description.y = 65;
      description.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
      cardFrame.appendChild(description);

      // 星级背景
      const starBg = figma.createRectangle();
      starBg.name = "Star Background";
      starBg.resize(60, 20);
      starBg.x = 110;
      starBg.y = 85;
      starBg.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
      starBg.cornerRadius = 10;
      cardFrame.appendChild(starBg);

      // 星星图标 (使用Rectangle避免被转换为Vector)
      for (let j = 0; j < 5; j++) {
        const star = figma.createRectangle();
        star.name = `Star ${j + 1}`;
        star.resize(8, 8);
        star.x = 115 + j * 10;
        star.y = 91;
        star.cornerRadius = 1;
        star.fills = [{ type: 'SOLID', color: j < 4 ? { r: 1, g: 0.8, b: 0 } : { r: 0.8, g: 0.8, b: 0.8 } }];
        cardFrame.appendChild(star);
      }

      // 评分文字
      const ratingText = figma.createText();
      ratingText.name = "Rating Text";
      try {
        ratingText.fontName = { family: "Inter", style: "Regular" };
      } catch (fontError) {
        console.warn('设置字体失败，使用默认字体:', fontError);
      }
      ratingText.characters = card.rating;
      ratingText.fontSize = 12;
      ratingText.x = 175;
      ratingText.y = 88;
      ratingText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
      cardFrame.appendChild(ratingText);

      // 价格
      const price = figma.createText();
      price.name = "Price";
      try {
        price.fontName = { family: "Inter", style: "Bold" };
      } catch (fontError) {
        console.warn('设置字体失败，使用默认字体:', fontError);
      }
      price.characters = card.price;
      price.fontSize = 20;
      price.x = 400;
      price.y = 30;
      price.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }];
      cardFrame.appendChild(price);

      // 状态标签
      const statusBg = figma.createRectangle();
      statusBg.name = "Status Background";
      statusBg.resize(50, 24);
      statusBg.x = 400;
      statusBg.y = 60;
      statusBg.fills = [{ type: 'SOLID', color: card.statusColor }];
      statusBg.cornerRadius = 12;
      cardFrame.appendChild(statusBg);

      const statusText = figma.createText();
      statusText.name = "Status Text";
      try {
        statusText.fontName = { family: "Inter", style: "Regular" };
      } catch (fontError) {
        console.warn('设置字体失败，使用默认字体:', fontError);
      }
      statusText.characters = card.status;
      statusText.fontSize = 12;
      statusText.x = 410;
      statusText.y = 66;
      statusText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      cardFrame.appendChild(statusText);

      // 查看详情按钮
      const detailBtn = figma.createRectangle();
      detailBtn.name = "Detail Button";
      detailBtn.resize(60, 28);
      detailBtn.x = 480;
      detailBtn.y = 25;
      detailBtn.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 1 } }];
      detailBtn.cornerRadius = 6;
      cardFrame.appendChild(detailBtn);

      const detailBtnText = figma.createText();
      detailBtnText.name = "Detail Button Text";
      try {
        detailBtnText.fontName = { family: "Inter", style: "Regular" };
      } catch (fontError) {
        console.warn('设置字体失败，使用默认字体:', fontError);
      }
      detailBtnText.characters = "详情";
      detailBtnText.fontSize = 12;
      detailBtnText.x = 500;
      detailBtnText.y = 33;
      detailBtnText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      cardFrame.appendChild(detailBtnText);

      // 加入购物车按钮
      const cartBtn = figma.createRectangle();
      cartBtn.name = "Cart Button";
      cartBtn.resize(60, 28);
      cartBtn.x = 480;
      cartBtn.y = 60;
      cartBtn.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.6, b: 0.1 } }];
      cartBtn.cornerRadius = 6;
      cardFrame.appendChild(cartBtn);

      const cartBtnText = figma.createText();
      cartBtnText.name = "Cart Button Text";
      try {
        cartBtnText.fontName = { family: "Inter", style: "Regular" };
      } catch (fontError) {
        console.warn('设置字体失败，使用默认字体:', fontError);
      }
      cartBtnText.characters = "购买";
      cartBtnText.fontSize = 12;
      cartBtnText.x = 500;
      cartBtnText.y = 68;
      cartBtnText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      cardFrame.appendChild(cartBtnText);

      details.push(`Product Card ${i + 1} - ${card.title}，包含图片、信息、评分、价格、状态、按钮等多个元素`);
      nodeCount += 20; // 每个卡片约20个元素
    }

    // 创建底部分页器Frame
    const paginationFrame = figma.createFrame();
    paginationFrame.name = "Pagination";
    paginationFrame.resize(560, 50);
    paginationFrame.x = 20;
    paginationFrame.y = 730;
    paginationFrame.fills = [];
    mainContainer.appendChild(paginationFrame);

    // 创建分页器背景
    const paginationBg = figma.createRectangle();
    paginationBg.name = "Pagination Background";
    paginationBg.resize(560, 50);
    paginationBg.x = 0;
    paginationBg.y = 0;
    paginationBg.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
    paginationBg.cornerRadius = 6;
    paginationFrame.appendChild(paginationBg);

    // 分页按钮
    const pageNumbers = ['1', '2', '3', '...', '10'];
    for (let i = 0; i < pageNumbers.length; i++) {
      const pageBtn = figma.createRectangle();
      pageBtn.name = `Page ${pageNumbers[i]}`;
      pageBtn.resize(36, 32);
      pageBtn.x = 180 + i * 45;
      pageBtn.y = 9;
      pageBtn.fills = [{ type: 'SOLID', color: i === 0 ? { r: 0.2, g: 0.6, b: 1 } : { r: 1, g: 1, b: 1 } }];
      pageBtn.cornerRadius = 4;
      paginationFrame.appendChild(pageBtn);

      const pageBtnText = figma.createText();
      pageBtnText.name = `Page ${pageNumbers[i]} Text`;
      try {
        pageBtnText.fontName = { family: "Inter", style: "Regular" };
      } catch (fontError) {
        console.warn('设置字体失败，使用默认字体:', fontError);
      }
      pageBtnText.characters = pageNumbers[i];
      pageBtnText.fontSize = 14;
      pageBtnText.x = 190 + i * 45;
      pageBtnText.y = 18;
      pageBtnText.fills = [{ type: 'SOLID', color: i === 0 ? { r: 1, g: 1, b: 1 } : { r: 0.4, g: 0.4, b: 0.4 } }];
      paginationFrame.appendChild(pageBtnText);
      nodeCount += 2;
    }

    details.push("Pagination - 分页导航组件");


    // 选中主容器
    figma.currentPage.selection = [mainContainer];
    figma.viewport.scrollAndZoomIntoView([mainContainer]);

    return {
      success: true,
      message: "✅ 成功创建复杂卡片列表！",
      details,
      nodeCount
    };

  } catch (error) {
    console.error('创建卡片列表失败:', error);
    return {
      success: false,
      message: '❌ 创建失败',
      error: `创建失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// 主要的智能分组函数
async function applySmartGrouping(
  selection: readonly SceneNode[]
): Promise<{ 
  success: boolean; 
  message: string; 
  analyses: SmartGroupingAnalysis[];
  summary: {
    totalCards: number;
    totalGroups: number;
    avgEfficiency: number;
    details: string[];
  };
}> {
  try {
    console.log('🎯 开始智能分组分析...');
    
    const analyses: SmartGroupingAnalysis[] = [];
    const details: string[] = [];
    let totalGroups = 0;
    let totalEfficiency = 0;

    // 查找所有卡片Frame
    const cardFrames: FrameNode[] = [];
    
    function findCardFrames(nodes: readonly SceneNode[]) {
      for (const node of nodes) {
        if (node.type === 'FRAME' && 
            node.name.toLowerCase().includes('card') &&
            'children' in node && node.children.length > 5) {
          cardFrames.push(node as FrameNode);
        } else if (hasChildren(node.type) && 'children' in node) {
          findCardFrames(node.children);
        }
      }
    }

    findCardFrames(selection);
    
    if (cardFrames.length === 0) {
      return {
        success: false,
        message: '❌ 未找到可分组的卡片',
        analyses: [],
        summary: {
          totalCards: 0,
          totalGroups: 0,
          avgEfficiency: 0,
          details: ['未找到包含5个以上子元素的卡片Frame']
        }
      };
    }

    console.log(`📋 找到 ${cardFrames.length} 个卡片进行分组`);

    // 分析并重构每个卡片
    for (const cardFrame of cardFrames) {
      try {
        // 使用人工智能式分组算法分析卡片结构
        const analysis = analyzeAndGroupCardElementsAdvanced(cardFrame);
        analyses.push(analysis);

        // 应用分组重构
        const result = await createOptimizedCardStructure(cardFrame, analysis);
        
        totalGroups += analysis.optimizedStructure.totalGroups;
        totalEfficiency += analysis.optimizedStructure.efficiency;

        details.push(`📦 ${cardFrame.name}:`);
        details.push(`  原始: ${analysis.originalStructure.totalElements} 个直接子元素`);
        details.push(`  优化: ${analysis.optimizedStructure.totalGroups} 个功能分组`);
        details.push(`  效率: ${analysis.optimizedStructure.efficiency}%`);
        details.push(...result.details.map(d => `  ${d}`));
        details.push('');

      } catch (error) {
        console.error(`处理卡片 ${cardFrame.name} 失败:`, error);
        details.push(`❌ ${cardFrame.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const avgEfficiency = cardFrames.length > 0 ? Math.round(totalEfficiency / cardFrames.length) : 0;

    return {
      success: true,
      message: `🎉 智能分组完成！处理了 ${cardFrames.length} 个卡片`,
      analyses,
      summary: {
        totalCards: cardFrames.length,
        totalGroups,
        avgEfficiency,
        details
      }
    };

  } catch (error) {
    console.error('智能分组失败:', error);
    return {
      success: false,
      message: '❌ 智能分组过程中发生错误',
      analyses: [],
      summary: {
        totalCards: 0,
        totalGroups: 0,
        avgEfficiency: 0,
        details: [`错误: ${error instanceof Error ? error.message : String(error)}`]
      }
    };
  }
}

// BFS几何分组相关接口和函数
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

interface SpatialCluster {
  id: string;
  elements: ElementWithBounds[];
  bounds: BoundingBox;
  density: number;
  semanticScore: number;
  totalScore: number;
}

function calculateBoundingBox(element: ElementInfo): BoundingBox {
  // 验证并处理NaN坐标
  const x = isNaN(element.x) ? 0 : element.x;
  const y = isNaN(element.y) ? 0 : element.y;
  const width = Math.max(isNaN(element.width) ? 1 : element.width, 1);
  const height = Math.max(isNaN(element.height) ? 1 : element.height, 1);
  
  return {
    minX: x,
    minY: y,
    maxX: x + width,
    maxY: y + height,
    width: width,
    height: height,
    centerX: x + width / 2,
    centerY: y + height / 2
  };
}

function calculateUnionBounds(elements: ElementWithBounds[]): BoundingBox {
  if (elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  const minX = Math.min(...elements.map(e => e.bounds.minX));
  const minY = Math.min(...elements.map(e => e.bounds.minY));
  const maxX = Math.max(...elements.map(e => e.bounds.maxX));
  const maxY = Math.max(...elements.map(e => e.bounds.maxY));
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  return {
    minX, minY, maxX, maxY, width, height,
    centerX: minX + width / 2,
    centerY: minY + height / 2
  };
}

function areBoxesNearby(box1: BoundingBox, box2: BoundingBox, threshold: number = 50): boolean {
  const horizontalDistance = Math.max(0, Math.max(box1.minX - box2.maxX, box2.minX - box1.maxX));
  const verticalDistance = Math.max(0, Math.max(box1.minY - box2.maxY, box2.minY - box1.maxY));
  return horizontalDistance <= threshold && verticalDistance <= threshold;
}

function calculateSemanticSimilarity(elem1: ElementWithBounds, elem2: ElementWithBounds): number {
  let score = 0;
  
  // 名称相似性 (30分)
  const name1 = elem1.name.toLowerCase();
  const name2 = elem2.name.toLowerCase();
  const commonKeywords = ['image', 'text', 'title', 'price', 'button', 'rating', 'star', 'content', 'description'];
  
  for (const keyword of commonKeywords) {
    if (name1.includes(keyword) && name2.includes(keyword)) {
      score += 30;
      break;
    }
  }
  
  // 类型相似性 (20分)
  if (elem1.type === elem2.type) {
    score += 20;
  }
  
  // 尺寸相似性 (15分)
  const width1 = Math.max(elem1.width, 1);
  const width2 = Math.max(elem2.width, 1);
  const height1 = Math.max(elem1.height, 1);
  const height2 = Math.max(elem2.height, 1);
  
  const widthRatio = Math.min(width1, width2) / Math.max(width1, width2);
  const heightRatio = Math.min(height1, height2) / Math.max(height1, height2);
  const avgRatio = (widthRatio + heightRatio) / 2;
  
  if (avgRatio > 0.8) score += 15;
  else if (avgRatio > 0.6) score += 10;
  else if (avgRatio > 0.4) score += 5;
  
  // 对齐相似性 (20分)
  const alignmentThreshold = 20;
  const leftAligned = Math.abs(elem1.bounds.minX - elem2.bounds.minX) <= alignmentThreshold;
  const rightAligned = Math.abs(elem1.bounds.maxX - elem2.bounds.maxX) <= alignmentThreshold;
  const topAligned = Math.abs(elem1.bounds.minY - elem2.bounds.minY) <= alignmentThreshold;
  const bottomAligned = Math.abs(elem1.bounds.maxY - elem2.bounds.maxY) <= alignmentThreshold;
  
  if (leftAligned || rightAligned) score += 10;
  if (topAligned || bottomAligned) score += 10;
  
  // 内容类元素额外加分
  if ((name1.includes('content') || name1.includes('text') || name1.includes('title')) &&
      (name2.includes('content') || name2.includes('text') || name2.includes('title'))) {
    score += 25;
  }
  
  return Math.min(score, 100);
}

function buildSpatialClustersWithBFS(elements: ElementInfo[]): SpatialCluster[] {
  const elementsWithBounds: ElementWithBounds[] = elements.map(elem => ({
    ...elem,
    bounds: calculateBoundingBox(elem)
  }));
  
  const visited = new Set<string>();
  const clusters: SpatialCluster[] = [];
  let clusterId = 0;
  
  console.log(`🔍 开始BFS空间聚类，共 ${elementsWithBounds.length} 个元素`);
  
  for (const startElement of elementsWithBounds) {
    if (visited.has(startElement.id)) continue;
    
    // BFS搜索相邻和相似的元素
    const cluster: ElementWithBounds[] = [];
    const queue: ElementWithBounds[] = [startElement];
    visited.add(startElement.id);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      cluster.push(current);
      
      // 寻找相邻的未访问元素
      for (const candidate of elementsWithBounds) {
        if (visited.has(candidate.id)) continue;
        
        const isNearby = areBoxesNearby(current.bounds, candidate.bounds, 50);
        const semanticScore = calculateSemanticSimilarity(current, candidate);
        
        // 判断是否应该加入聚类
        let shouldGroup = false;
        
        if (isNearby && semanticScore >= 45) {
          shouldGroup = true;
        } else if (isNearby && semanticScore >= 25) {
          // 检查是否是内容类元素，使用更低的阈值
          const isContentType = (elem: ElementWithBounds) => {
            const name = elem.name.toLowerCase();
            return name.includes('content') || name.includes('text') || name.includes('title') || name.includes('description');
          };
          
          if (isContentType(current) && isContentType(candidate)) {
            shouldGroup = true;
          }
        }
        
        if (shouldGroup) {
          visited.add(candidate.id);
          queue.push(candidate);
        }
      }
    }
    
    if (cluster.length > 0) {
      const bounds = calculateUnionBounds(cluster);
      const totalSemanticScore = cluster.reduce((sum, elem, index) => {
        if (index === 0) return 0;
        return sum + calculateSemanticSimilarity(cluster[0], elem);
      }, 0);
      
      clusters.push({
        id: `cluster_${clusterId++}`,
        elements: cluster,
        bounds,
        density: cluster.length / (bounds.width * bounds.height / 10000),
        semanticScore: cluster.length > 1 ? totalSemanticScore / (cluster.length - 1) : 0,
        totalScore: 0
      });
    }
  }
  
  console.log(`🎯 BFS聚类完成，生成 ${clusters.length} 个聚类`);
  return clusters;
}

function optimizeClusters(clusters: SpatialCluster[]): SpatialCluster[] {
  let optimizedClusters = [...clusters];
  
  // 1. 合并单元素聚类到最近的聚类
  const singleElementClusters = optimizedClusters.filter(c => c.elements.length === 1);
  const multiElementClusters = optimizedClusters.filter(c => c.elements.length > 1);
  
  for (const singleCluster of singleElementClusters) {
    let bestMatch: SpatialCluster | null = null;
    let bestScore = 0;
    
    for (const multiCluster of multiElementClusters) {
      const distance = Math.sqrt(
        Math.pow(singleCluster.bounds.centerX - multiCluster.bounds.centerX, 2) +
        Math.pow(singleCluster.bounds.centerY - multiCluster.bounds.centerY, 2)
      );
      
      const semanticScore = calculateSemanticSimilarity(
        singleCluster.elements[0],
        multiCluster.elements[0]
      );
      
      const score = semanticScore / (1 + distance / 100);
      
      if (score > bestScore && score > 20) {
        bestScore = score;
        bestMatch = multiCluster;
      }
    }
    
    if (bestMatch) {
      bestMatch.elements.push(singleCluster.elements[0]);
      bestMatch.bounds = calculateUnionBounds(bestMatch.elements);
    }
  }
  
  optimizedClusters = multiElementClusters;
  
  // 2. 分割过大的聚类
  const finalClusters: SpatialCluster[] = [];
  for (const cluster of optimizedClusters) {
    if (cluster.elements.length > 8) {
      const splitClusters = splitLargeCluster(cluster);
      finalClusters.push(...splitClusters);
    } else {
      finalClusters.push(cluster);
    }
  }
  
  console.log(`✨ 聚类优化完成，最终 ${finalClusters.length} 个聚类`);
  return finalClusters;
}

function splitLargeCluster(cluster: SpatialCluster): SpatialCluster[] {
  if (cluster.elements.length <= 8) return [cluster];
  
  // 按功能类型分组
  const groups: { [key: string]: ElementWithBounds[] } = {};
  
  for (const element of cluster.elements) {
    const name = element.name.toLowerCase();
    let category = 'other';
    
    if (name.includes('image') || name.includes('photo') || name.includes('picture')) {
      category = 'image';
    } else if (name.includes('title') || name.includes('heading')) {
      category = 'title';
    } else if (name.includes('content') || name.includes('description') || name.includes('text')) {
      category = 'content';
    } else if (name.includes('price') || name.includes('cost') || name.includes('amount')) {
      category = 'price';
    } else if (name.includes('rating') || name.includes('star') || name.includes('review')) {
      category = 'rating';
    } else if (name.includes('button') || name.includes('action') || name.includes('click')) {
      category = 'action';
    }
    
    if (!groups[category]) groups[category] = [];
    groups[category].push(element);
  }
  
  const splitClusters: SpatialCluster[] = [];
  let clusterId = 0;
  
  for (const [category, elements] of Object.entries(groups)) {
    if (elements.length > 0) {
      const bounds = calculateUnionBounds(elements);
      splitClusters.push({
        id: `split_${cluster.id}_${clusterId++}`,
        elements,
        bounds,
        density: elements.length / (bounds.width * bounds.height / 10000),
        semanticScore: cluster.semanticScore,
        totalScore: 0
      });
    }
  }
  
  return splitClusters.length > 1 ? splitClusters : [cluster];
}

function assignClusterNames(clusters: SpatialCluster[]): void {
  for (const cluster of clusters) {
    const elements = cluster.elements;
    const names = elements.map(e => e.name.toLowerCase());
    
    let clusterName = 'Mixed Section';
    
    if (names.some(n => n.includes('image') || n.includes('photo'))) {
      clusterName = 'Image Section';
    } else if (names.some(n => n.includes('title') || n.includes('heading'))) {
      clusterName = 'Title Section';
    } else if (names.some(n => n.includes('content') || n.includes('description'))) {
      clusterName = 'Content Section';
    } else if (names.some(n => n.includes('price') || n.includes('cost'))) {
      clusterName = 'Price Section';
    } else if (names.some(n => n.includes('rating') || n.includes('star'))) {
      clusterName = 'Rating Section';
    } else if (names.some(n => n.includes('button') || n.includes('action'))) {
      clusterName = 'Actions Section';
    }
    
    // 为cluster添加名称属性
    (cluster as any).name = clusterName;
  }
}

function applyGeometricGrouping(elements: ElementInfo[]): GroupingResult {
  console.log(`🔍 开始BFS几何分组，共 ${elements.length} 个元素`);
  
  // 使用BFS构建空间聚类
  let clusters = buildSpatialClustersWithBFS(elements);
  
  // 优化聚类
  clusters = optimizeClusters(clusters);
  
  // 分配语义名称
  assignClusterNames(clusters);
  
  // 转换为GroupingResult格式
  const groups = clusters.map(cluster => ({
    name: (cluster as any).name || 'Unknown Section',
    elements: cluster.elements,
    position: {
      x: cluster.bounds.minX,
      y: cluster.bounds.minY,
      width: cluster.bounds.width,
      height: cluster.bounds.height
    }
  }));
  
  const usedElementIds = new Set(clusters.flatMap(c => c.elements.map(e => e.id)));
  const ungroupedElements = elements.filter(e => !usedElementIds.has(e.id));
  
  console.log(`📊 BFS几何分组完成: ${groups.length} 个组, ${ungroupedElements.length} 个未分组元素`);
  
  return {
    originalCount: elements.length,
    groupedCount: elements.length - ungroupedElements.length,
    groups,
    ungroupedElements
  };
}

function analyzeAndGroupCardElementsAdvanced(
  cardFrame: FrameNode
): SmartGroupingAnalysis {
  console.log(`🔍 开始人工智能式分组分析: ${cardFrame.name}`);
  
  // 提取所有直接子元素
  const elements: ElementInfo[] = [];
  if ('children' in cardFrame) {
    for (const child of cardFrame.children) {
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
  }

  console.log(`📋 提取到 ${elements.length} 个子元素`);

  // 分析原始结构
  const originalStructure = {
    totalElements: elements.length,
    directChildren: elements.length,
    maxDepth: 1
  };

  // 使用人工智能式分组算法（基于用户的分组思维）
  const groupingResult = applyHumanLikeGrouping(elements);

  // 计算优化后的结构
  const totalGroups = groupingResult.groups.length;
  const avgElementsPerGroup = totalGroups > 0 ? 
    Math.round(groupingResult.groupedCount / totalGroups * 10) / 10 : 0;
  const maxElementsInGroup = totalGroups > 0 ? 
    Math.max(...groupingResult.groups.map(g => g.elements.length)) : 0;
  const efficiency = Math.round((groupingResult.groupedCount / elements.length) * 100);

  const optimizedStructure = {
    totalGroups,
    avgElementsPerGroup,
    maxElementsInGroup,
    efficiency
  };

  console.log(`✅ 分组分析完成: ${totalGroups} 个组, 效率 ${efficiency}%`);

  return {
    cardName: cardFrame.name,
    cardId: cardFrame.id,
    originalStructure,
    optimizedStructure,
    groupingResult
  };
}

// 贪心算法分组策略 - 逐层划定最优bounding box
function applyGreedyBoundingBoxGrouping(elements: ElementInfo[]): GroupingResult {
  console.log(`🎯 开始贪心bounding box分组，共 ${elements.length} 个元素`);
  
  const groups: GroupingResult['groups'] = [];
  const usedElements = new Set<string>();
  let iteration = 0;
  
  // 逐层贪心分组
  while (usedElements.size < elements.length && iteration < 10) { // 防止无限循环
    iteration++;
    console.log(`🔄 第 ${iteration} 轮贪心分组...`);
    
    const availableElements = elements.filter(e => !usedElements.has(e.id));
    if (availableElements.length === 0) break;
    
    // 找到本轮最优的bounding box
    const bestGroup = findOptimalBoundingBox(availableElements);
    
    if (bestGroup && bestGroup.elements.length > 1) {
      // 将找到的元素标记为已使用
      bestGroup.elements.forEach(e => usedElements.add(e.id));
      groups.push(bestGroup);
      
      console.log(`✅ 第 ${iteration} 轮找到最优分组: ${bestGroup.name} (${bestGroup.elements.length} 个元素)`);
    } else {
      // 如果没找到有效分组，跳出循环
      break;
    }
  }
  
  // 收集未分组的元素
  const ungroupedElements = elements.filter(e => !usedElements.has(e.id));
  
  console.log(`📊 贪心分组完成: ${groups.length} 个组, ${ungroupedElements.length} 个未分组元素`);
  
  return {
    originalCount: elements.length,
    groupedCount: elements.length - ungroupedElements.length,
    groups,
    ungroupedElements
  };
}

// 找到最优的bounding box - 贪心算法核心
function findOptimalBoundingBox(elements: ElementInfo[]): { name: string; elements: ElementInfo[]; position: { x: number; y: number; width: number; height: number } } | null {
  if (elements.length < 2) return null;
  
  let bestGroup: { elements: ElementInfo[]; score: number; bounds: any } | null = null;
  
  // 对每个元素作为起始点进行贪心搜索
  for (const startElement of elements) {
    const group = greedyExpansion(startElement, elements);
    
    if (group.elements.length > 1) {
      // 计算分组评分：元素数量 + 语义相似性 - 空间浪费
      const semanticScore = calculateGroupSemanticScore(group.elements);
      const densityScore = calculateGroupDensity(group.elements, group.bounds);
      const sizeBonus = group.elements.length * 10; // 鼓励更多元素
      
      const totalScore = sizeBonus + semanticScore * 0.5 + densityScore * 0.3;
      
      if (!bestGroup || totalScore > bestGroup.score) {
        bestGroup = { ...group, score: totalScore };
      }
    }
  }
  
  if (!bestGroup) return null;
  
  // 确定分组名称
  const groupName = determineGroupName(bestGroup.elements);
  
  return {
    name: groupName,
    elements: bestGroup.elements,
    position: {
      x: bestGroup.bounds.minX,
      y: bestGroup.bounds.minY,
      width: bestGroup.bounds.width,
      height: bestGroup.bounds.height
    }
  };
}

// 贪心扩展算法 - 从起始元素开始尽可能多地包含相邻元素
function greedyExpansion(startElement: ElementInfo, allElements: ElementInfo[]): { elements: ElementInfo[]; bounds: any } {
  const selectedElements = [startElement];
  const remainingElements = allElements.filter(e => e.id !== startElement.id);
  
  // 计算当前bounding box
  let currentBounds = calculateElementsBounds([startElement]);
  
  // 贪心扩展
  let improved = true;
  while (improved && remainingElements.length > 0) {
    improved = false;
    let bestCandidate: ElementInfo | null = null;
    let bestScore = -Infinity;
    let bestNewBounds: any = null;
    
    for (const candidate of remainingElements) {
      // 计算加入这个元素后的新bounding box
      const newBounds = calculateElementsBounds([...selectedElements, candidate]);
      
      // 评估加入这个元素的收益
      const expansionScore = evaluateExpansion(selectedElements, candidate, currentBounds, newBounds);
      
      if (expansionScore > bestScore && expansionScore > 0) {
        bestScore = expansionScore;
        bestCandidate = candidate;
        bestNewBounds = newBounds;
      }
    }
    
    // 如果找到了有收益的候选元素，添加它
    if (bestCandidate && bestNewBounds) {
      selectedElements.push(bestCandidate);
      remainingElements.splice(remainingElements.indexOf(bestCandidate), 1);
      currentBounds = bestNewBounds;
      improved = true;
    }
  }
  
  return {
    elements: selectedElements,
    bounds: currentBounds
  };
}

// 评估扩展收益 - 考虑语义相似性、空间效率和密度
function evaluateExpansion(currentElements: ElementInfo[], candidate: ElementInfo, currentBounds: any, newBounds: any): number {
  // 1. 语义相似性评分
  const semanticScore = Math.max(...currentElements.map(elem => 
    calculateElementSemanticSimilarity(elem, candidate)
  ));
  
  // 2. 空间效率评分 - 新增面积 vs 元素面积
  const currentArea = currentBounds.width * currentBounds.height;
  const newArea = newBounds.width * newBounds.height;
  const candidateArea = candidate.width * candidate.height;
  const areaExpansion = newArea - currentArea;
  
  // 空间效率：新增的元素面积 / 新增的bounding box面积
  const spaceEfficiency = areaExpansion > 0 ? (candidateArea / areaExpansion) : 1;
  
  // 3. 密度评分 - 元素数量 / bounding box面积
  const newDensity = (currentElements.length + 1) / (newArea / 10000); // 归一化到合理范围
  
  // 4. 距离惩罚 - 距离太远的元素应该被惩罚
  const centerX = currentBounds.minX + currentBounds.width / 2;
  const centerY = currentBounds.minY + currentBounds.height / 2;
  const candidateCenterX = candidate.x + candidate.width / 2;
  const candidateCenterY = candidate.y + candidate.height / 2;
  
  const distance = Math.sqrt(
    Math.pow(candidateCenterX - centerX, 2) + 
    Math.pow(candidateCenterY - centerY, 2)
  );
  
  const distancePenalty = Math.max(0, 1 - distance / 200); // 200px内没有惩罚
  
  // 综合评分
  const score = (
    semanticScore * 0.4 +          // 语义相似性权重40%
    spaceEfficiency * 30 +         // 空间效率权重30%
    newDensity * 20 +              // 密度权重20%
    distancePenalty * 10           // 距离权重10%
  );
  
  return score;
}

// 计算元素语义相似性
function calculateElementSemanticSimilarity(elem1: ElementInfo, elem2: ElementInfo): number {
  let score = 0;
  
  const name1 = elem1.name.toLowerCase();
  const name2 = elem2.name.toLowerCase();
  
  // 功能关键词匹配
  const keywords = [
    ['image', 'photo', 'picture', 'img'],
    ['title', 'heading', 'header', 'name'],
    ['content', 'text', 'description', 'desc'],
    ['price', 'cost', 'amount', 'money'],
    ['button', 'btn', 'action', 'click'],
    ['rating', 'star', 'review', 'score'],
    ['tag', 'label', 'badge', 'chip']
  ];
  
  for (const keywordGroup of keywords) {
    const elem1Match = keywordGroup.some(kw => name1.includes(kw));
    const elem2Match = keywordGroup.some(kw => name2.includes(kw));
    if (elem1Match && elem2Match) {
      score += 50; // 同类型元素高分
      break;
    }
  }
  
  // 类型相似性
  if (elem1.type === elem2.type) {
    score += 30;
  }
  
  // 尺寸相似性
  const width1 = Math.max(elem1.width, 1);
  const width2 = Math.max(elem2.width, 1);
  const height1 = Math.max(elem1.height, 1);
  const height2 = Math.max(elem2.height, 1);
  
  const widthRatio = Math.min(width1, width2) / Math.max(width1, width2);
  const heightRatio = Math.min(height1, height2) / Math.max(height1, height2);
  const sizeScore = (widthRatio + heightRatio) / 2 * 20;
  
  score += sizeScore;
  
  return Math.min(score, 100);
}

// 计算多个元素的边界框
function calculateElementsBounds(elements: ElementInfo[]): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  if (elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  const minX = Math.min(...elements.map(e => e.x));
  const minY = Math.min(...elements.map(e => e.y));
  const maxX = Math.max(...elements.map(e => e.x + e.width));
  const maxY = Math.max(...elements.map(e => e.y + e.height));
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// 计算分组语义评分
function calculateGroupSemanticScore(elements: ElementInfo[]): number {
  if (elements.length < 2) return 0;
  
  let totalScore = 0;
  let comparisons = 0;
  
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      totalScore += calculateElementSemanticSimilarity(elements[i], elements[j]);
      comparisons++;
    }
  }
  
  return comparisons > 0 ? totalScore / comparisons : 0;
}

// 计算分组密度
function calculateGroupDensity(elements: ElementInfo[], bounds: any): number {
  const totalElementArea = elements.reduce((sum, elem) => sum + (elem.width * elem.height), 0);
  const boundingBoxArea = bounds.width * bounds.height;
  
  return boundingBoxArea > 0 ? (totalElementArea / boundingBoxArea) * 100 : 0;
}

// 确定分组名称
function determineGroupName(elements: ElementInfo[]): string {
  const names = elements.map(e => e.name.toLowerCase());
  
  // 功能类型优先级
  const typePatterns = [
    { pattern: ['image', 'photo', 'picture'], name: 'Image Section' },
    { pattern: ['title', 'heading', 'header'], name: 'Title Section' },
    { pattern: ['content', 'description', 'text'], name: 'Content Section' },
    { pattern: ['price', 'cost', 'amount'], name: 'Price Section' },
    { pattern: ['rating', 'star', 'review'], name: 'Rating Section' },
    { pattern: ['button', 'btn', 'action'], name: 'Actions Section' },
    { pattern: ['tag', 'label', 'badge'], name: 'Tags Section' }
  ];
  
  for (const type of typePatterns) {
    if (type.pattern.some(pattern => names.some(name => name.includes(pattern)))) {
      return type.name;
    }
  }
  
  return 'Mixed Section';
}

// 主要的智能分组函数
async function applySmartGrouping(
  selection: readonly SceneNode[]
): Promise<{ 
  success: boolean;
  message: string;
  details?: string[];
  nodeCount?: number;
  error?: string;
}> {
  try {
    // 检查编辑权限
    if (!checkEditPermission()) {
      return {
        success: false,
        message: '❌ 分组失败',
        error: '当前文件为只读模式，无法进行分组。请确保您有编辑权限。'
      };
    }

    const details: string[] = [];
    let nodeCount = 0;

    // 处理每个选中的节点
    for (const node of selection) {
      if (node.type === 'FRAME' && !node.locked) {
        const frameNode = node as FrameNode;
        const analysis = analyzeAndGroupCardElements(frameNode);
        const result = await createOptimizedCardStructure(frameNode, analysis);
        details.push(...result.details);
        nodeCount += analysis.groupingResult.groups.length;
      }
    }

    return {
      success: true,
      message: '✅ 分组成功',
      details,
      nodeCount
    };

  } catch (error) {
    console.error('分组失败:', error);
    return {
      success: false,
      message: '❌ 分组失败',
      error: `分组失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// 插件启动时立即处理当前选中的节点
processSelection();

// 监听选择变化
figma.on('selectionchange', () => {
  processSelection();
});

// 监听文件关闭
figma.on('close', () => {
  console.log('--- 插件运行结束 ---');
});

// 分析对齐关系
function analyzeAlignment(bounds1: BoundingBox, bounds2: BoundingBox, threshold: number): {
  horizontal: Omit<AlignmentInfo, 'targetElementId'>[];
  vertical: Omit<AlignmentInfo, 'targetElementId'>[];
} {
  const horizontal = [];
  const vertical = [];
  
  // 水平对齐检测
  const leftDeviation = Math.abs(bounds1.minX - bounds2.minX);
  if (leftDeviation <= threshold) {
    horizontal.push({
      alignmentType: 'left' as const,
      deviation: leftDeviation,
      confidence: 1 - (leftDeviation / threshold)
    });
  }
  
  const rightDeviation = Math.abs(bounds1.maxX - bounds2.maxX);
  if (rightDeviation <= threshold) {
    horizontal.push({
      alignmentType: 'right' as const,
      deviation: rightDeviation,
      confidence: 1 - (rightDeviation / threshold)
    });
  }
  
  const centerXDeviation = Math.abs(bounds1.centerX - bounds2.centerX);
  if (centerXDeviation <= threshold) {
    horizontal.push({
      alignmentType: 'center-x' as const,
      deviation: centerXDeviation,
      confidence: 1 - (centerXDeviation / threshold)
    });
  }
  
  // 垂直对齐检测
  const topDeviation = Math.abs(bounds1.minY - bounds2.minY);
  if (topDeviation <= threshold) {
    vertical.push({
      alignmentType: 'top' as const,
      deviation: topDeviation,
      confidence: 1 - (topDeviation / threshold)
    });
  }
  
  const bottomDeviation = Math.abs(bounds1.maxY - bounds2.maxY);
  if (bottomDeviation <= threshold) {
    vertical.push({
      alignmentType: 'bottom' as const,
      deviation: bottomDeviation,
      confidence: 1 - (bottomDeviation / threshold)
    });
  }
  
  const centerYDeviation = Math.abs(bounds1.centerY - bounds2.centerY);
  if (centerYDeviation <= threshold) {
    vertical.push({
      alignmentType: 'center-y' as const,
      deviation: centerYDeviation,
      confidence: 1 - (centerYDeviation / threshold)
    });
  }
  
  return { horizontal, vertical };
}

// 分析相邻关系
function analyzeAdjacency(bounds1: BoundingBox, bounds2: BoundingBox, threshold: number): {
  isLeftOf: boolean;
  isRightOf: boolean;
  isAbove: boolean;
  isBelow: boolean;
  distance: number;
} {
  const horizontalDistance = Math.max(0, Math.max(bounds1.minX - bounds2.maxX, bounds2.minX - bounds1.maxX));
  const verticalDistance = Math.max(0, Math.max(bounds1.minY - bounds2.maxY, bounds2.minY - bounds1.maxY));
  
  const distance = Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);
  
  return {
    isLeftOf: bounds1.maxX <= bounds2.minX && distance <= threshold,
    isRightOf: bounds2.maxX <= bounds1.minX && distance <= threshold,
    isAbove: bounds1.maxY <= bounds2.minY && distance <= threshold,
    isBelow: bounds2.maxY <= bounds1.minY && distance <= threshold,
    distance
  };
}

// 检测布局模式
function detectLayoutPattern(relationships: PositionRelationship[]): {
  type: 'horizontal' | 'vertical' | 'grid' | 'absolute' | 'mixed';
  confidence: number;
  details: {
    rows?: number;
    columns?: number;
    primaryDirection?: 'horizontal' | 'vertical';
    spacing?: { horizontal: number; vertical: number };
  };
} {
  // 分析对齐模式
  const horizontalAlignments = relationships.reduce((sum, rel) => 
    sum + rel.alignments.horizontal.length, 0);
  const verticalAlignments = relationships.reduce((sum, rel) => 
    sum + rel.alignments.vertical.length, 0);
  
  // 分析相邻模式
  const horizontalAdjacencies = relationships.reduce((sum, rel) => 
    sum + rel.adjacencies.left.length + rel.adjacencies.right.length, 0);
  const verticalAdjacencies = relationships.reduce((sum, rel) => 
    sum + rel.adjacencies.top.length + rel.adjacencies.bottom.length, 0);
  
  // 判断布局类型
  if (horizontalAlignments > verticalAlignments * 2 && horizontalAdjacencies > verticalAdjacencies) {
    return {
      type: 'horizontal',
      confidence: 0.8,
      details: { primaryDirection: 'horizontal' }
    };
  } else if (verticalAlignments > horizontalAlignments * 2 && verticalAdjacencies > horizontalAdjacencies) {
    return {
      type: 'vertical',
      confidence: 0.8,
      details: { primaryDirection: 'vertical' }
    };
  } else if (horizontalAlignments > 0 && verticalAlignments > 0) {
    // 可能是网格布局
    const rows = estimateGridRows(relationships);
    const columns = estimateGridColumns(relationships);
    
    if (rows > 1 && columns > 1) {
      return {
        type: 'grid',
        confidence: 0.7,
        details: { rows, columns }
      };
    }
  }
  
  return {
    type: 'mixed',
    confidence: 0.5,
    details: {}
  };
}

// 估算网格行数
function estimateGridRows(relationships: PositionRelationship[]): number {
  const yPositions = relationships.map(rel => rel.bounds.minY).sort((a, b) => a - b);
  const uniqueRows = [];
  const threshold = 20;
  
  for (const y of yPositions) {
    if (!uniqueRows.find(row => Math.abs(row - y) <= threshold)) {
      uniqueRows.push(y);
    }
  }
  
  return uniqueRows.length;
}

// 估算网格列数
function estimateGridColumns(relationships: PositionRelationship[]): number {
  const xPositions = relationships.map(rel => rel.bounds.minX).sort((a, b) => a - b);
  const uniqueColumns = [];
  const threshold = 20;
  
  for (const x of xPositions) {
    if (!uniqueColumns.find(col => Math.abs(col - x) <= threshold)) {
      uniqueColumns.push(x);
    }
  }
  
  return uniqueColumns.length;
}

// 生成布局结构
function generateLayoutStructure(
  relationships: PositionRelationship[], 
  pattern: ReturnType<typeof detectLayoutPattern>
): LayoutStructure {
  // 根据检测到的模式生成对应的布局结构
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
  const sortedElements = relationships.sort((a, b) => a.bounds.minX - b.bounds.minX);
  
  const children: LayoutNode[] = sortedElements.map(rel => ({
    elementId: rel.elementId,
    elementName: rel.elementName,
    nodeType: rel.containment.isContainer ? 'container' : 'leaf',
    layoutRole: determineLayoutRole(rel),
    sizing: determineSizing(rel, 'horizontal')
  }));
  
  // 计算平均间距
  const spacings = [];
  for (let i = 1; i < sortedElements.length; i++) {
    const spacing = sortedElements[i].bounds.minX - sortedElements[i-1].bounds.maxX;
    if (spacing >= 0) spacings.push(spacing);
  }
  const averageSpacing = spacings.length > 0 ? Math.round(spacings.reduce((a, b) => a + b) / spacings.length) : 16;
  
  return {
    rootId: 'auto-layout-container',
    layoutType: 'horizontal',
    children,
    spacing: { horizontal: averageSpacing, vertical: 0 },
    padding: { top: 16, right: 16, bottom: 16, left: 16 },
    alignment: { horizontal: 'MIN', vertical: 'CENTER' }
  };
}

// 生成垂直布局结构
function generateVerticalLayout(relationships: PositionRelationship[]): LayoutStructure {
  // 按Y坐标排序
  const sortedElements = relationships.sort((a, b) => a.bounds.minY - b.bounds.minY);
  
  const children: LayoutNode[] = sortedElements.map(rel => ({
    elementId: rel.elementId,
    elementName: rel.elementName,
    nodeType: rel.containment.isContainer ? 'container' : 'leaf',
    layoutRole: determineLayoutRole(rel),
    sizing: determineSizing(rel, 'vertical')
  }));
  
  // 计算平均间距
  const spacings = [];
  for (let i = 1; i < sortedElements.length; i++) {
    const spacing = sortedElements[i].bounds.minY - sortedElements[i-1].bounds.maxY;
    if (spacing >= 0) spacings.push(spacing);
  }
  const averageSpacing = spacings.length > 0 ? Math.round(spacings.reduce((a, b) => a + b) / spacings.length) : 16;
  
  return {
    rootId: 'auto-layout-container',
    layoutType: 'vertical',
    children,
    spacing: { horizontal: 0, vertical: averageSpacing },
    padding: { top: 16, right: 16, bottom: 16, left: 16 },
    alignment: { horizontal: 'MIN', vertical: 'MIN' }
  };
}

// 生成网格布局结构（转换为嵌套的水平/垂直布局）
function generateGridLayout(
  relationships: PositionRelationship[], 
  details: { rows?: number; columns?: number }
): LayoutStructure {
  const { rows = 2, columns = 2 } = details;
  
  // 将元素分组到网格行中
  const gridRows = [];
  const sortedByY = relationships.sort((a, b) => a.bounds.minY - b.bounds.minY);
  
  const rowHeight = (sortedByY[sortedByY.length - 1].bounds.maxY - sortedByY[0].bounds.minY) / rows;
  
  for (let i = 0; i < rows; i++) {
    const rowMinY = sortedByY[0].bounds.minY + i * rowHeight;
    const rowMaxY = rowMinY + rowHeight;
    
    const rowElements = sortedByY.filter(rel => 
      rel.bounds.centerY >= rowMinY && rel.bounds.centerY < rowMaxY
    ).sort((a, b) => a.bounds.minX - b.bounds.minX);
    
    if (rowElements.length > 0) {
      gridRows.push(rowElements);
    }
  }
  
  // 创建行容器
  const children: LayoutNode[] = gridRows.map((rowElements, index) => ({
    elementId: `grid-row-${index}`,
    elementName: `网格行 ${index + 1}`,
    nodeType: 'container',
    layoutRole: 'secondary',
    sizing: { horizontal: 'FILL', vertical: 'HUG' },
    children: rowElements.map(rel => ({
      elementId: rel.elementId,
      elementName: rel.elementName,
      nodeType: 'leaf',
      layoutRole: determineLayoutRole(rel),
      sizing: determineSizing(rel, 'horizontal')
    }))
  }));
  
  return {
    rootId: 'auto-layout-container',
    layoutType: 'vertical',
    children,
    spacing: { horizontal: 16, vertical: 16 },
    padding: { top: 16, right: 16, bottom: 16, left: 16 },
    alignment: { horizontal: 'MIN', vertical: 'MIN' }
  };
}

// 生成混合布局结构
function generateMixedLayout(relationships: PositionRelationship[]): LayoutStructure {
  // 对于复杂布局，尝试识别主要的布局组
  const primaryElements = relationships.filter(rel => determineLayoutRole(rel) !== 'decorative');
  return generateVerticalLayout(primaryElements); // 默认使用垂直布局
}

// 确定布局角色
function determineLayoutRole(relationship: PositionRelationship): 'primary' | 'secondary' | 'decorative' {
  const name = relationship.elementName.toLowerCase();
  const bounds = relationship.bounds;
  
  // 主要内容判断
  if (name.includes('title') || name.includes('heading') || name.includes('main') ||
      name.includes('content') || name.includes('primary')) {
    return 'primary';
  }
  
  // 装饰性元素判断
  if (name.includes('icon') || name.includes('decoration') || name.includes('bg') ||
      name.includes('background') || bounds.width < 50 || bounds.height < 50) {
    return 'decorative';
  }
  
  return 'secondary';
}

// 确定尺寸模式
function determineSizing(
  relationship: PositionRelationship, 
  layoutDirection: 'horizontal' | 'vertical'
): { horizontal: 'FIXED' | 'HUG' | 'FILL'; vertical: 'FIXED' | 'HUG' | 'FILL' } {
  const name = relationship.elementName.toLowerCase();
  const bounds = relationship.bounds;
  
  // 文本元素通常使用HUG
  if (name.includes('text') || name.includes('title') || name.includes('label')) {
    return { horizontal: 'HUG', vertical: 'HUG' };
  }
  
  // 按钮元素
  if (name.includes('button') || name.includes('btn')) {
    if (layoutDirection === 'horizontal') {
      return { horizontal: 'HUG', vertical: 'FIXED' };
    } else {
      return { horizontal: 'FILL', vertical: 'HUG' };
    }
  }
  
  // 图片元素通常固定尺寸
  if (name.includes('image') || name.includes('img') || name.includes('icon')) {
    return { horizontal: 'FIXED', vertical: 'FIXED' };
  }
  
  // 容器元素
  if (relationship.containment.isContainer) {
    return { horizontal: 'FILL', vertical: 'HUG' };
  }
  
  // 默认策略
  if (layoutDirection === 'horizontal') {
    return { horizontal: 'HUG', vertical: 'FIXED' };
  } else {
    return { horizontal: 'FILL', vertical: 'HUG' };
  }
}

// 创建转换计划
function createConversionPlan(
  layoutStructure: LayoutStructure, 
  containerNode: FrameNode
): ConversionStep[] {
  const steps: ConversionStep[] = [];
  let order = 1;
  
  // 1. 启用自动布局
  steps.push({
    stepType: 'enable_auto_layout',
    targetId: containerNode.id,
    parameters: {
      layoutMode: layoutStructure.layoutType === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL'
    },
    description: `启用${layoutStructure.layoutType === 'horizontal' ? '水平' : '垂直'}自动布局`,
    order: order++
  });
  
  // 2. 设置间距
  steps.push({
    stepType: 'set_spacing',
    targetId: containerNode.id,
    parameters: {
      itemSpacing: layoutStructure.layoutType === 'horizontal' 
        ? layoutStructure.spacing.horizontal 
        : layoutStructure.spacing.vertical
    },
    description: `设置元素间距为 ${layoutStructure.layoutType === 'horizontal' 
      ? layoutStructure.spacing.horizontal 
      : layoutStructure.spacing.vertical}px`,
    order: order++
  });
  
  // 3. 设置内边距
  steps.push({
    stepType: 'set_padding',
    targetId: containerNode.id,
    parameters: layoutStructure.padding,
    description: `设置容器内边距`,
    order: order++
  });
  
  // 4. 设置对齐方式
  steps.push({
    stepType: 'set_alignment',
    targetId: containerNode.id,
    parameters: {
      primaryAxisAlignItems: layoutStructure.alignment.horizontal,
      counterAxisAlignItems: layoutStructure.alignment.vertical
    },
    description: `设置对齐方式`,
    order: order++
  });
  
  // 5. 为每个子元素设置尺寸
  for (const child of layoutStructure.children) {
    steps.push({
      stepType: 'set_sizing',
      targetId: child.elementId,
      parameters: child.sizing,
      description: `设置 ${child.elementName} 的尺寸模式`,
      order: order++
    });
  }
  
  return steps;
}

// 主入口函数：基于位置关系的智能布局转换
async function convertToAutoLayoutBasedOnPositionRelationships(
  selection: readonly SceneNode[]
): Promise<{ success: boolean; message: string; details: string[] }> {
  console.log('🚀 开始基于位置关系的智能布局转换');
  
  if (selection.length === 0) {
    return {
      success: false,
      message: '请先选择要转换的容器',
      details: []
    };
  }
  
  const results = [];
  
  for (const node of selection) {
    if (node.type === 'FRAME' || node.type === 'GROUP') {
      console.log(`🔍 分析容器: ${node.name}`);
      
      // 如果是GROUP，先转换为FRAME
      let containerFrame: FrameNode;
      if (node.type === 'GROUP') {
        containerFrame = convertGroupToAutoLayoutFrame(node as GroupNode);
        if (!containerFrame) {
          results.push(`❌ ${node.name}: 无法转换GROUP为FRAME`);
          continue;
        }
      } else {
        containerFrame = node as FrameNode;
      }
      
      // 分析位置关系并生成转换计划
      const analysis = analyzeAndGroupCardElements(containerFrame);
      
      // 执行转换
      const conversionResult = await createOptimizedCardStructure(containerFrame, analysis);
      
      results.push(`📊 ${node.name}:`);
      results.push(`  - 检测到布局模式: ${analysis.groupingResult.groups.length} 个分组`);
      results.push(`  - 分析了 ${analysis.groupingResult.originalCount} 个元素的位置关系`);
      results.push(`  - 生成了 ${conversionResult.details.length} 个转换步骤`);
      results.push(...conversionResult.details.map(d => `  - ${d}`));
      results.push('');
    }
  }
  
  return {
    success: true,
    message: `🎉 完成基于位置关系的布局转换！处理了 ${selection.length} 个容器`,
    details: results
  };
}

// 执行转换计划
async function executeConversionPlan(
  conversionPlan: ConversionStep[], 
  containerNode: FrameNode
): Promise<{ success: boolean; message: string; details: string[] }> {
  const details: string[] = [];
  
  try {
    // 按顺序执行转换步骤
    for (const step of conversionPlan.sort((a, b) => a.order - b.order)) {
      const result = await executeConversionStep(step, containerNode);
      details.push(`${step.order}. ${step.description}: ${result.success ? '✅' : '❌'}`);
      
      if (!result.success) {
        console.warn(`转换步骤失败: ${step.description}`, result.error);
      }
    }
    
    return {
      success: true,
      message: `🎉 基于位置关系的布局转换完成！`,
      details
    };
    
  } catch (error) {
    return {
      success: false,
      message: `❌ 转换过程中发生错误`,
      details: [...details, `错误: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

// 执行单个转换步骤
async function executeConversionStep(
  step: ConversionStep, 
  containerNode: FrameNode
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetNode = step.targetId === containerNode.id 
      ? containerNode 
      : containerNode.findChild(n => n.id === step.targetId);
      
    if (!targetNode) {
      return { success: false, error: `找不到目标节点: ${step.targetId}` };
    }
    
    switch (step.stepType) {
      case 'enable_auto_layout':
        if ('layoutMode' in targetNode) {
          targetNode.layoutMode = step.parameters.layoutMode;
        }
        break;
        
      case 'set_spacing':
        if ('itemSpacing' in targetNode) {
          targetNode.itemSpacing = step.parameters.itemSpacing;
        }
        break;
        
      case 'set_padding':
        if ('paddingLeft' in targetNode) {
          targetNode.paddingLeft = step.parameters.left;
          targetNode.paddingRight = step.parameters.right;
          targetNode.paddingTop = step.parameters.top;
          targetNode.paddingBottom = step.parameters.bottom;
        }
        break;
        
      case 'set_alignment':
        if ('primaryAxisAlignItems' in targetNode) {
          targetNode.primaryAxisAlignItems = step.parameters.primaryAxisAlignItems;
          targetNode.counterAxisAlignItems = step.parameters.counterAxisAlignItems;
        }
        break;
        
      case 'set_sizing':
        if ('layoutGrow' in targetNode) {
          targetNode.layoutGrow = step.parameters.horizontal === 'FILL' ? 1 : 0;
          // 设置其他尺寸属性...
        }
        break;
    }
    
    return { success: true };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}
