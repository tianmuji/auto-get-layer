// 基础节点信息接口
export interface SimpleNodeInfo {
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
  fills?: any[];
  strokes?: any[];
  // 文本特有属性
  characters?: string;
  fontSize?: number;
  fontName?: any;
  textStyleId?: string;
  // 子节点
  children?: SimpleNodeInfo[];
}

// UI规范检查结果接口
export interface DesignRuleViolation {
  nodeId: string;
  nodeName: string;
  type: string;
  violations: string[];
  suggestions: string[];
}

// 修复结果接口
export interface FixResult {
  nodeId: string;
  nodeName: string;
  originalType: string;
  newType?: string;
  fixes: string[];
  success: boolean;
  error?: string;
}

// 样式快照接口
export interface StyleSnapshot {
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

// 响应式尺寸分析接口
export interface ResponsiveSizingAnalysis {
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

// 布局上下文接口
export interface LayoutContext {
  containerType: 'card' | 'sidebar' | 'header' | 'list' | 'toolbar' | 'dialog' | 'unknown';
  contentDensity: number;
  primaryContentElementId?: string;
  interactionPattern: 'read-only' | 'interactive' | 'mixed';
  layoutComplexity: number;
  direction: 'HORIZONTAL' | 'VERTICAL';
}

// 尺寸影响因子接口
export interface SizingInfluenceFactors {
  contentType: number;      // 内容类型权重
  spatialPosition: number;  // 空间位置权重
  semanticRole: number;     // 语义角色权重
  userBehavior: number;     // 用户行为权重
  layoutDirection: number;  // 布局方向权重
}

// 元素信息接口
export interface ElementInfo {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  node: SceneNode;
}

// 边界框接口
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

// 带边界的元素接口
export interface ElementWithBounds extends ElementInfo {
  bounds: BoundingBox;
}

// 空间聚类接口
export interface SpatialCluster {
  id: string;
  elements: ElementWithBounds[];
  bounds: BoundingBox;
  density: number;
  semanticScore: number;
  totalScore: number;
}

// 位置关系接口
export interface PositionRelationship {
  elementId: string;
  elementName: string;
  bounds: BoundingBox;
  // 对齐关系
  alignments: {
    horizontal: AlignmentInfo[];  // 水平对齐关系
    vertical: AlignmentInfo[];    // 垂直对齐关系
  };
  // 相邻关系
  adjacencies: {
    left: string[];      // 左侧相邻元素
    right: string[];     // 右侧相邻元素
    top: string[];       // 上方相邻元素
    bottom: string[];    // 下方相邻元素
  };
  // 包含关系
  containment: {
    isContainer: boolean;
    containedElements: string[];  // 包含的子元素
    parentContainer?: string;     // 父容器
  };
}

// 对齐信息接口
export interface AlignmentInfo {
  targetElementId: string;
  alignmentType: 'left' | 'right' | 'center-x' | 'top' | 'bottom' | 'center-y';
  deviation: number;  // 偏差值（像素）
  confidence: number; // 置信度 0-1
}

// 布局结构接口
export interface LayoutStructure {
  rootId: string;
  layoutType: 'horizontal' | 'vertical' | 'grid' | 'absolute' | 'mixed';
  children: LayoutNode[];
  spacing: {
    horizontal: number;
    vertical: number;
  };
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  alignment: {
    horizontal: 'MIN' | 'CENTER' | 'MAX';
    vertical: 'MIN' | 'CENTER' | 'MAX';
  };
}

// 布局节点接口
export interface LayoutNode {
  elementId: string;
  elementName: string;
  nodeType: 'leaf' | 'container';
  layoutRole: 'primary' | 'secondary' | 'decorative';
  sizing: {
    horizontal: 'FIXED' | 'HUG' | 'FILL';
    vertical: 'FIXED' | 'HUG' | 'FILL';
  };
  children?: LayoutNode[];
  constraints?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
}

// 转换步骤接口
export interface ConversionStep {
  stepType: 'enable_auto_layout' | 'set_spacing' | 'set_padding' | 'set_alignment' | 'set_sizing' | 'create_group';
  targetId: string;
  parameters: any;
  description: string;
  order: number;
}

// 分析结果接口
export interface AnalysisResult {
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

// 节点快照接口
export interface NodeSnapshot {
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