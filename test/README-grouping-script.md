# 智能分组脚本使用指南

## 🎯 概述

智能分组脚本是一个封装好的工具，可以将无序的设计元素转换为有序的分组结构。它提供了简洁的API接口，支持多种输出格式和配置选项。

## 🚀 快速开始

### 浏览器环境

```html
<!-- 引入依赖 -->
<script src="grouping-utils.js"></script>
<script src="grouping-script.js"></script>

<script>
// 定义元素数据
const elements = [
    { id: 'title', name: '标题', x: 20, y: 20, width: 200, height: 30, type: 'text' },
    { id: 'content', name: '内容', x: 20, y: 60, width: 200, height: 100, type: 'text' },
    { id: 'button', name: '按钮', x: 20, y: 180, width: 80, height: 30, type: 'button' }
];

// 快速分组
const result = quickGroup(elements);
console.log(result);

// 或者使用类实例
const grouper = new ElementGrouper({
    outputFormat: 'hierarchy',
    debug: true
});
const result2 = grouper.group(elements);
</script>
```

### Node.js 环境

```javascript
// 注意：需要先适配 grouping-utils.js 为 CommonJS 模块
const { ElementGrouper, quickGroup } = require('./grouping-script');

const elements = [
    { id: 'title', name: '标题', x: 20, y: 20, width: 200, height: 30 }
    // ... 更多元素
];

const result = quickGroup(elements);
console.log(result);
```

## 📊 输入数据格式

### 必需字段
```javascript
{
    x: number,        // X坐标
    y: number,        // Y坐标  
    width: number,    // 宽度
    height: number    // 高度
}
```

### 可选字段
```javascript
{
    id: string,       // 唯一标识符（自动生成）
    name: string,     // 元素名称（自动生成）
    type: string,     // 元素类型（自动检测）
    text: string,     // 文本内容（用于名称生成）
    label: string     // 标签（用于名称生成）
}
```

### 示例数据
```javascript
const elements = [
    {
        id: 'user_card_title',
        name: '用户信息',
        x: 20, y: 20, width: 200, height: 30,
        type: 'text'
    },
    {
        id: 'avatar',
        name: '头像',
        x: 30, y: 60, width: 60, height: 60,
        type: 'image'
    },
    {
        id: 'username',
        name: '张三',
        x: 100, y: 70, width: 100, height: 20,
        type: 'text'
    }
];
```

## ⚙️ 配置选项

### ElementGrouper 构造函数选项

```javascript
const options = {
    // 输出格式: 'hierarchy' | 'flat' | 'tree'
    outputFormat: 'hierarchy',
    
    // 是否包含详细信息
    includeDetails: true,
    
    // 是否优化单子节点
    optimizeSingleChild: true,
    
    // 自定义层次定义
    customHierarchy: null,
    
    // 调试模式
    debug: false
};

const grouper = new ElementGrouper(options);
```

### 自定义层次定义

```javascript
const customHierarchy = [
    { name: 'page', label: 'Page', minSize: 0, priority: 1 },
    { name: 'section', label: 'Section', minSize: 100, priority: 2 },
    { name: 'card', label: 'Card', minSize: 80, priority: 3 },
    { name: 'component', label: 'Component', minSize: 50, priority: 4 }
];

const grouper = new ElementGrouper({
    customHierarchy: customHierarchy
});
```

## 📤 输出格式

### 1. 层次结构 (hierarchy)

```javascript
{
    success: true,
    format: 'hierarchy',
    hierarchy: {
        id: 'page_root',
        name: 'Page',
        type: 'page',
        level: 1,
        elementCount: 0,
        childCount: 2,
        bounds: { x: 15, y: 15, width: 210, height: 200 },
        direction: 'HORIZONTAL',
        children: [...]
    },
    statistics: {
        totalGroups: 4,
        maxDepth: 3,
        totalElements: 3,
        averageGroupSize: 0.75,
        groupingEfficiency: 0.25
    }
}
```

### 2. 扁平分组 (flat)

```javascript
{
    success: true,
    format: 'flat',
    groups: [
        {
            id: 'section_2_0',
            name: '用户信息',
            type: 'section',
            elements: [
                {
                    id: 'user_card_title',
                    name: '用户信息',
                    type: 'text',
                    bounds: { x: 20, y: 20, width: 200, height: 30 }
                }
            ],
            bounds: { x: 15, y: 15, width: 210, height: 40 },
            direction: 'NONE'
        }
    ]
}
```

### 3. 树形结构 (tree)

```javascript
{
    success: true,
    format: 'tree',
    tree: {
        id: 'page_root',
        name: 'Page',
        type: 'page',
        level: 1,
        elementCount: 0,
        bounds: { x: 15, y: 15, width: 210, height: 200 },
        direction: 'HORIZONTAL',
        children: [
            {
                id: 'section_2_0',
                name: '用户信息',
                type: 'section',
                level: 2,
                elementCount: 1,
                elements: ['用户信息']
            }
        ]
    }
}
```

## 🔧 API 方法

### 快速分组函数

```javascript
quickGroup(elements, options)
```

**参数**:
- `elements`: 元素数组
- `options`: 配置选项（可选）

**返回**: 分组结果对象

### ElementGrouper 类

#### 构造函数
```javascript
new ElementGrouper(options)
```

#### 主要方法

##### `group(elements)`
执行分组处理

##### `validateInput(elements)`
验证输入数据

##### `normalizeElements(elements)`
标准化元素数据

##### `detectElementType(element)`
自动检测元素类型

##### 静态方法

```javascript
ElementGrouper.getSupportedFormats()    // 获取支持的输出格式
ElementGrouper.getDefaultOptions()      // 获取默认配置
```

## 🎨 使用示例

### 基本使用

```javascript
// 简单卡片布局
const cardElements = [
    { id: 'title', name: '用户信息', x: 20, y: 20, width: 200, height: 30 },
    { id: 'avatar', name: '头像', x: 30, y: 60, width: 60, height: 60 },
    { id: 'name', name: '张三', x: 100, y: 70, width: 100, height: 20 },
    { id: 'email', name: 'zhang@email.com', x: 100, y: 95, width: 120, height: 15 }
];

const result = quickGroup(cardElements);
console.log('分组结果:', result);
```

### 高级配置

```javascript
const grouper = new ElementGrouper({
    outputFormat: 'flat',
    includeDetails: false,
    debug: true,
    customHierarchy: [
        { name: 'page', label: 'Page', minSize: 0, priority: 1 },
        { name: 'widget', label: 'Widget', minSize: 100, priority: 2 },
        { name: 'item', label: 'Item', minSize: 50, priority: 3 }
    ]
});

const result = grouper.group(elements);
```

### 错误处理

```javascript
try {
    const result = quickGroup(elements);
    
    if (result.success) {
        console.log('分组成功:', result);
    } else {
        console.log('分组失败:', result.error);
        // 使用降级分组
        if (result.fallbackGroups) {
            console.log('降级分组:', result.fallbackGroups);
        }
    }
} catch (error) {
    console.error('处理异常:', error.message);
}
```

## 🎯 实际应用场景

### 1. 设计稿转代码
```javascript
// 从设计工具导出的元素数据
const designElements = getElementsFromDesignTool();
const groupedStructure = quickGroup(designElements, {
    outputFormat: 'hierarchy',
    includeDetails: true
});

// 生成HTML结构
const htmlCode = generateHTML(groupedStructure.hierarchy);
```

### 2. 布局分析
```javascript
// 分析现有页面布局
const pageElements = extractElementsFromDOM();
const analysis = quickGroup(pageElements, {
    outputFormat: 'flat',
    debug: true
});

console.log('布局分析结果:', analysis.statistics);
```

### 3. 响应式设计
```javascript
// 为不同屏幕尺寸生成布局
const mobileLayout = quickGroup(elements, {
    customHierarchy: mobileHierarchy
});

const desktopLayout = quickGroup(elements, {
    customHierarchy: desktopHierarchy
});
```

## 📁 文件结构

```
test/
├── grouping-utils.js              # 核心算法库
├── grouping-script.js             # 封装脚本
├── grouping-script-demo.html      # 浏览器演示页面
├── grouping-script-example.js     # Node.js 使用示例
└── README-grouping-script.md      # 本文档
```

## 🔍 演示和测试

### 浏览器演示
打开 `grouping-script-demo.html` 在浏览器中查看交互式演示。

### 命令行测试
```bash
node grouping-script-example.js
```

## ⚡ 性能考虑

- **元素数量**: 建议 < 50 个元素以获得最佳性能
- **时间复杂度**: O(n³)，主要由射线检测算法决定
- **内存使用**: O(n²)，用于存储元素关系图
- **优化建议**: 对大量元素使用空间分割预处理

## 🌐 浏览器兼容性

- **现代浏览器**: 完全支持 (Chrome, Firefox, Safari, Edge)
- **IE11**: 需要 Map、Set 的 polyfill
- **Node.js**: 需要适配 CommonJS 模块格式

## 🤝 贡献和反馈

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件
- 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。
