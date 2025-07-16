# 简洁格式输出示例

## 概述

简洁格式 (`clean`) 是一种精简的输出格式，只保留最终节点信息和必要的分组关系，去除了冗余的层级数据。

## 特点

- **完整层级**: 包含所有节点（分组节点和元素节点）的父子关系
- **统一结构**: 所有节点都在一个 `nodes` 数组中，通过 `nodeType` 区分类型
- **清晰关系**: 通过 `parent` 字段建立完整的层级关系
- **精简信息**: 每个节点只保留必要的信息，去除冗余数据

## 使用方式

### Node.js 环境

```javascript
const { quickGroup } = require('./grouping-script-node');

const elements = [
    { id: 'title', name: '用户信息', x: 20, y: 20, width: 200, height: 30, type: 'text' },
    { id: 'avatar', name: '头像', x: 30, y: 60, width: 60, height: 60, type: 'image' },
    { id: 'username', name: '张三', x: 100, y: 70, width: 100, height: 20, type: 'text' },
    { id: 'email', name: 'zhang@email.com', x: 100, y: 95, width: 120, height: 15, type: 'text' }
];

const result = quickGroup(elements, { outputFormat: 'clean' });
console.log(result.result);
```

### 浏览器环境

```html
<script src="grouping-utils.js"></script>
<script src="grouping-script.js"></script>
<script>
const result = quickGroup(elements, { outputFormat: 'clean' });
console.log(result.result);
</script>
```

## 输出结构

### 完整输出

```javascript
{
    "success": true,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "inputCount": 4,
    "format": "clean",
    "result": {
        "elements": [...],  // 最终元素列表
        "groups": [...]     // 分组关系列表
    },
    "statistics": {...}     // 统计信息
}
```

### 简洁结果 (result 字段)

```javascript
{
    "nodes": [
        {
            "id": "page_root",
            "parent": null,
            "type": "page",
            "name": "用户信息 + 头像 + 2 项",
            "level": 1,
            "nodeType": "group"
        },
        {
            "id": "section_2_0",
            "parent": "page_root",
            "type": "article",
            "name": "用户信息 + 头像",
            "level": 2,
            "nodeType": "group"
        },
        {
            "id": "title",
            "parent": "article_3_0",
            "name": "用户信息",
            "type": "text",
            "nodeType": "element",
            "x": 20,
            "y": 20,
            "width": 200,
            "height": 30,
            "_original": {...}
        },
        // ... 其他节点
    ]
}
```

## 数据说明

### 节点对象 (nodes)

所有节点都在统一的 `nodes` 数组中，通过 `nodeType` 字段区分类型：

#### 分组节点 (nodeType: "group")

| 字段 | 说明 | 示例 |
|------|------|------|
| `id` | 分组唯一标识符 | `"section_2_0"` |
| `parent` | 父分组ID (根分组为null) | `"page_root"` |
| `type` | 分组类型 | `"section"` |
| `name` | 分组名称 | `"用户信息 + 头像"` |
| `level` | 层级深度 | `2` |
| `nodeType` | 节点类型标识 | `"group"` |

#### 元素节点 (nodeType: "element")

| 字段 | 说明 | 示例 |
|------|------|------|
| `id` | 元素唯一标识符 | `"title"` |
| `parent` | 父分组ID | `"article_3_0"` |
| `name` | 元素名称 | `"用户信息"` |
| `type` | 元素类型 | `"text"` |
| `nodeType` | 节点类型标识 | `"element"` |
| `x`, `y` | 元素位置坐标 | `20, 20` |
| `width`, `height` | 元素尺寸 | `200, 30` |
| `_original` | 原始输入数据 | `{...}` |

## 实际示例

### 输入数据

```javascript
const elements = [
    { id: 'title', name: '用户信息', x: 20, y: 20, width: 200, height: 30, type: 'text' },
    { id: 'avatar', name: '头像', x: 30, y: 60, width: 60, height: 60, type: 'image' },
    { id: 'username', name: '张三', x: 100, y: 70, width: 100, height: 20, type: 'text' },
    { id: 'email', name: 'zhang@email.com', x: 100, y: 95, width: 120, height: 15, type: 'text' }
];
```

### 输出结果

```javascript
{
    "elements": [
        {
            "id": "title",
            "name": "用户信息", 
            "x": 20, "y": 20, "width": 200, "height": 30,
            "type": "text",
            "groupId": "article_3_0",
            "parent": "section_2_0"
        },
        {
            "id": "avatar",
            "name": "头像",
            "x": 30, "y": 60, "width": 60, "height": 60,
            "type": "image", 
            "groupId": "article_3_1",
            "parent": "section_2_0"
        },
        {
            "id": "username",
            "name": "张三",
            "x": 100, "y": 70, "width": 100, "height": 20,
            "type": "text",
            "groupId": "article_3_0", 
            "parent": "section_2_1"
        },
        {
            "id": "email",
            "name": "zhang@email.com",
            "x": 100, "y": 95, "width": 120, "height": 15,
            "type": "text",
            "groupId": "article_3_1",
            "parent": "section_2_1"
        }
    ],
    "groups": [
        {
            "id": "page_root",
            "parent": null,
            "type": "page", 
            "name": "用户信息 + 头像 + 2 项",
            "level": 1
        },
        {
            "id": "section_2_0",
            "parent": "page_root",
            "type": "article",
            "name": "用户信息 + 头像", 
            "level": 2
        },
        {
            "id": "section_2_1", 
            "parent": "page_root",
            "type": "section",
            "name": "张三 + zhang@email.com",
            "level": 2
        }
    ]
}
```

## 层级关系图

```
page_root (页面根节点)
├── section_2_0 (用户信息 + 头像)
│   ├── article_3_0 → [title: 用户信息]
│   └── article_3_1 → [avatar: 头像]
└── section_2_1 (张三 + zhang@email.com)
    ├── article_3_0 → [username: 张三]
    └── article_3_1 → [email: zhang@email.com]
```

## 应用场景

1. **代码生成**: 根据分组关系生成HTML/CSS代码
2. **数据分析**: 分析元素的分组模式和层级关系
3. **API传输**: 减少数据传输量，只保留必要信息
4. **数据库存储**: 存储简化的分组结果

## 与其他格式对比

| 格式 | 数据量 | 详细程度 | 适用场景 |
|------|--------|----------|----------|
| `hierarchy` | 大 | 完整 | 调试、分析 |
| `flat` | 中 | 中等 | 简单遍历 |
| `tree` | 中 | 中等 | 可视化 |
| `clean` | 小 | 精简 | 生产使用 |

## 总结

简洁格式提供了最精简的分组结果，去除了冗余信息，只保留最终的元素和分组关系。这种格式特别适合：

- 生产环境使用
- API数据传输
- 代码生成
- 数据存储

通过 `groupId` 和 `parent` 字段，可以轻松重建完整的层级关系，同时保持数据的简洁性。
