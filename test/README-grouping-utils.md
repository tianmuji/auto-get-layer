# 分组算法辅助函数拆分说明

## 概述
已将分组算法的核心辅助函数从 `complete-hierarchical-grouping.html` 拆分到独立的 `grouping-utils.js` 文件中。

## 文件结构

### grouping-utils.js
包含所有核心分组算法函数：

#### 主要算法函数
- `performCompleteHierarchicalGrouping()` - 完整层次化分组算法
- `createPageGroup()` - 创建页面级分组
- `buildCompleteHierarchy()` - 构建完整层次结构
- `optimizeSingleChildGroups()` - 优化单子节点分组

#### 分组策略函数
- `createSubGroups()` - 创建子分组
- `performSpatialClustering()` - 空间聚类算法
- `performFlexLayoutGrouping()` - Flex布局导向分组
- `performRelativeGrouping()` - 相对关系分组

#### 射线检测函数
- `buildRayRelationGraph()` - 构建射线关系图
- `canConnectHorizontally()` - 检查水平连接
- `canConnectVertically()` - 检查垂直连接
- `isHorizontalRayBlocked()` - 检查水平射线阻挡
- `isVerticalRayBlocked()` - 检查垂直射线阻挡

#### 动态规划函数
- `dynamicProgrammingGrouping()` - 动态规划分组
- `findAllValidGroupings()` - 找到所有有效分组
- `findAllConnectedComponents()` - 找到连通分量
- `calculateGroupingScore()` - 计算分组得分

#### 工具函数
- `calculateBounds()` - 计算边界
- `calculateMinDistance()` - 计算最小距离
- `generateMeaningfulGroupName()` - 生成有意义的分组名称
- `determineGroupType()` - 确定分组类型
- `determineFlexDirection()` - 确定Flex布局方向

### complete-hierarchical-grouping.html
保留UI和测试相关函数：

#### 渲染函数
- `renderCanvas()` - 渲染画布
- `renderGroupBoundaries()` - 渲染分组边界
- `renderGroupedCanvas()` - 渲染分组后的画布
- `renderGroupTree()` - 渲染分组树

#### 统计分析函数
- `countTotalGroups()` - 统计总分组数
- `getMaxDepth()` - 获取最大深度
- `calculateAverageGroupSize()` - 计算平均分组大小

#### 测试验证函数
- `validateGrouping()` - 验证分组正确性
- `compareGroupingResults()` - 比较分组结果
- `runGrouping()` - 执行分组测试

#### UI交互函数
- `adjustGroupingForCoarser()` - 调整为更粗糙分组
- `adjustGroupingForFiner()` - 调整为更精细分组
- `getExpectedGroups()` - 获取预期分组结果

## 使用方式

HTML文件通过以下方式引用分组算法：

```html
<script src="grouping-utils.js"></script>
<script>
    // 现在可以直接使用分组算法函数
    const hierarchy = performCompleteHierarchicalGrouping(elements);
</script>
```

## 优势

1. **代码分离**: 核心算法与UI逻辑分离，便于维护
2. **可复用性**: 分组算法可以在其他项目中复用
3. **可读性**: 文件结构更清晰，便于理解
4. **可测试性**: 算法函数可以独立测试
5. **模块化**: 符合现代JavaScript模块化开发规范

## 注意事项

- 确保 `grouping-utils.js` 在HTML文件之前加载
- 所有算法函数都是全局函数，可以直接调用
- 保持了原有的函数接口，无需修改调用代码
