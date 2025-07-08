// Figma 官方 node type 常量
export const ALL_NODE_TYPES = [
  "BOOLEAN_OPERATION",
  "CODE_BLOCK",
  "COMPONENT",
  "COMPONENT_SET",
  "CONNECTOR",
  "DOCUMENT",
  "ELLIPSE",
  "EMBED",
  "FRAME",
  "GROUP",
  "INSTANCE",
  "LINE",
  "LINK_UNFURL",
  "MEDIA",
  "PAGE",
  "POLYGON",
  "RECTANGLE",
  "SHAPE_WITH_TEXT",
  "SLICE",
  "STAMP",
  "STAR",
  "STICKY",
  "TABLE",
  "TABLE_CELL",
  "TEXT",
  "TEXT_PATH",
  "TRANSFORM_GROUP",
  "VECTOR",
  "WIDGET"
] as const;

// 具备 children 的节点类型
export const CHILDREN_NODE_TYPES = [
  "FRAME",
  "GROUP",
  "COMPONENT",
  "COMPONENT_SET",
  "INSTANCE",
  "PAGE",
  "DOCUMENT",
  "SECTION",
  "TABLE",
  "TABLE_CELL",
  "BOOLEAN_OPERATION",
  "TRANSFORM_GROUP"
] as const;

// CSS Flexbox 容器类型
export const FLEX_CONTAINER_TYPES = [
  "FRAME",
  "COMPONENT", 
  "INSTANCE"
] as const;

// 内容节点类型
export const FLEX_ITEM_TYPES = [
  "TEXT",           
  "RECTANGLE",      
  "ELLIPSE",        
  "VECTOR",         
  "POLYGON",        
  "STAR",           
  "LINE",           
  "CODE_BLOCK",     
  "EMBED",          
  "MEDIA",          
  "STICKY",         
  "SHAPE_WITH_TEXT",
  "BOOLEAN_OPERATION"
] as const;

// 交互元素类型
export const INTERACTIVE_ELEMENT_TYPES = [
  "COMPONENT",      
  "INSTANCE"        
] as const;

// 文本类元素
export const TEXT_LIKE_TYPES = [
  "TEXT",
  "CODE_BLOCK",
  "SHAPE_WITH_TEXT"
] as const;

// 可拉伸的图形元素
export const STRETCHABLE_TYPES = [
  "RECTANGLE",
  "ELLIPSE", 
  "VECTOR",
  "POLYGON",
  "STAR"
] as const;

// 交互元素关键词
export const INTERACTIVE_KEYWORDS = [
  'button', 'btn', 'input', 'field', 'checkbox', 'radio', 'switch', 'slider',
  '按钮', '输入', '复选', '单选', '开关', '滑块', 'toggle', 'dropdown', 'select'
];

// 可拉伸元素关键词
export const STRETCHABLE_KEYWORDS = [
  'spacer', 'divider', 'separator', 'fill', 'stretch', 'expand',
  '占位', '分隔', '填充', '拉伸', '扩展'
]; 