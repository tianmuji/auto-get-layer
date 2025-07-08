# 侧边栏布局功能说明

## 功能概述

为 Figma 插件添加了一个专门的"侧边栏布局"功能，可以快速为选中的 Frame 节点应用标准的侧边栏自动布局配置。

## 使用方法

### 1. 选择节点
- 在 Figma 中选择一个 Frame 节点
- 确保该节点包含需要垂直排列的子元素

### 2. 应用布局
- 打开插件界面
- 在"节点分析"标签页中找到"🎯 应用侧边栏布局"按钮
- 点击按钮即可应用布局

### 3. 查看详细日志
- 打开浏览器开发者控制台 (Cmd+Option+I / Ctrl+Shift+I)
- 查看每个子元素的响应式尺寸设置过程
- 包含原始状态、修改内容和最终结果的详细信息

### 4. 智能布局计算
侧边栏布局会智能分析现有子元素的位置，自动计算最合适的配置：
- **方向**: 根据子元素排列自动检测（通常为垂直布局 VERTICAL）
- **间距**: 根据子元素之间的实际间距计算
- **填充**: 根据子元素相对于容器的位置计算四周填充
- **对齐**: 左右居中 (counterAlign: CENTER)
- **主轴对齐**: 顶部对齐 (primaryAlign: MIN)
- **响应式尺寸**: 根据布局方向自动设置子元素的最佳尺寸模式

## 智能计算原理

### 间距计算
系统会分析所有子元素之间的距离，计算出最常见的间距值作为 `itemSpacing`。

### 填充计算
- **paddingLeft**: 第一个子元素的 x 坐标
- **paddingRight**: 容器宽度 - 子元素最右边缘
- **paddingTop**: 第一个子元素的 y 坐标
- **paddingBottom**: 容器高度 - 最后一个子元素的底边

### 方向检测
根据子元素的排列方式自动检测是水平还是垂直布局。

### 响应式尺寸设置
根据布局方向为子元素设置最佳的尺寸模式：
- **垂直布局**: 子元素宽度设置为 `FILL`（填充父容器），高度设置为 `HUG`（自适应内容）
- **水平布局**: 子元素高度设置为 `FILL`（填充父容器），宽度设置为 `HUG`（自适应内容）

这符合现代UI设计的最佳实践，确保子元素能够响应父容器的尺寸变化。

## 技术实现

### 后端 (code.ts)
```typescript
// 消息处理
if (msg.type === 'apply-custom-layout') {
  // 创建样式快照来分析现有布局
  const originalSnapshot = createStyleSnapshot(frameNode);
  
  // 基于样式快照计算最优参数
  const direction = detectLayoutDirection(originalSnapshot);
  const spacing = calculateOptimalSpacing(originalSnapshot, direction);
  const padding = calculateOptimalPadding(originalSnapshot);
  
  // 应用计算出的参数
  frameNode.layoutMode = direction;
  frameNode.itemSpacing = spacing;
  frameNode.paddingTop = padding.top;
  frameNode.paddingRight = padding.right;
  frameNode.paddingBottom = padding.bottom;
  frameNode.paddingLeft = padding.left;
}
```

### 前端 (ui.html)
```javascript
// 按钮事件
document.getElementById('apply-sidebar-layout-btn').onclick = function() {
  parent.postMessage({ 
    pluginMessage: { 
      type: 'apply-custom-layout',
      layoutConfig: {
        direction: 'VERTICAL',
        spacing: 10,
        padding: { top: 10, right: 10, bottom: 10, left: 10 },
        primaryAlign: 'MIN',
        counterAlign: 'CENTER'
      }
    } 
  }, '*');
};
```

## 适用场景

响应式尺寸设置功能适用于以下场景：
- 侧边栏菜单布局
- 垂直按钮组
- 列表项排列
- 导航菜单
- 工具栏（垂直方向）

## 功能覆盖

响应式尺寸设置功能现已集成到以下功能中：
1. **🎯 应用侧边栏布局** - 专门的侧边栏布局功能
2. **🔧 修复Frame选择** - 自动布局启用时同时应用响应式尺寸
3. **其他自动布局功能** - 所有启用自动布局的功能都会应用最佳实践

## 示例用例

根据用户提供的 JSON 数据，这个功能可以完美处理类似的侧边栏结构：

```json
{
  "name": "Sidebar Frame",
  "type": "FRAME",
  "width": 150,
  "height": 200,
  "children": [
    {"name": "Menu Item 1", "type": "RECTANGLE"},
    {"name": "Menu Item 2", "type": "RECTANGLE"},
    {"name": "Menu Item 3", "type": "RECTANGLE"},
    {"name": "Menu Item 4", "type": "RECTANGLE"}
  ]
}
```

应用布局后，所有菜单项将：
- 垂直排列，间距根据原有间距智能计算（示例中为 10px）
- 左右居中对齐
- 顶部对齐
- 四周填充根据原有位置智能计算（左右各 10px，上 10px，下 40px）
- 子元素宽度自动填充父容器（响应式设计）

## 错误处理

- 如果未选择节点：提示"请先选择要应用布局的节点"
- 如果选择多个节点：提示"请只选择一个节点"
- 如果选择的不是 Frame：提示"只能对Frame节点应用自定义布局"
- 如果应用失败：自动回滚操作并显示错误信息

## 扩展性

这个功能的架构支持轻松扩展：
- 可以添加更多预设布局（水平布局、网格布局等）
- 可以添加自定义参数输入
- 可以保存用户常用的布局配置
- 可以为不同组件类型提供专门的布局预设

## 测试建议

1. 创建一个包含多个子元素的 Frame
2. 使用插件应用侧边栏布局
3. 检查布局是否符合预期
4. 测试各种错误情况（无选择、多选择、错误节点类型等） 