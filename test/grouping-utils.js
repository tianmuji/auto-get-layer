// 分组算法辅助函数库
// 包含所有分组相关的工具函数和算法实现

// Web标准层次定义
const WEB_HIERARCHY = [
    { name: 'page', label: 'Page', minSize: 0, priority: 1 },
    { name: 'section', label: 'Section', minSize: 100, priority: 2 },
    { name: 'article', label: 'Article', minSize: 80, priority: 3 },
    { name: 'header', label: 'Header', minSize: 60, priority: 4 },
    { name: 'nav', label: 'Nav', minSize: 40, priority: 5 },
    { name: 'main', label: 'Main', minSize: 60, priority: 6 },
    { name: 'aside', label: 'Aside', minSize: 40, priority: 7 },
    { name: 'div', label: 'Div', minSize: 30, priority: 8 },
    { name: 'component', label: 'Component', minSize: 20, priority: 9 }
];

// 完整层次化分组算法
function performCompleteHierarchicalGrouping(elements) {
    console.log('🌐 开始完整层次化分组分析...');

    // 1. 创建页面级分组（包含所有元素）
    const pageGroup = createPageGroup(elements);

    // 2. 递归创建子分组
    const completeHierarchy = buildCompleteHierarchy(pageGroup);

    console.log('🎯 完整分组完成');
    return completeHierarchy;
}

// 创建页面级分组
function createPageGroup(elements) {
    const bounds = calculateBounds(elements);
    return {
        id: 'page_root',
        name: generateMeaningfulGroupName(elements, 'Page'),
        type: 'page',
        level: 1,
        elements: elements,
        bounds: bounds,
        children: []
    };
}

// 构建完整层次结构
function buildCompleteHierarchy(parentGroup) {
    const { elements, level } = parentGroup;

    if (elements.length <= 1 || level >= WEB_HIERARCHY.length) {
        return parentGroup;
    }

    // 根据当前层级选择分组策略
    const currentHierarchy = WEB_HIERARCHY[level - 1];
    const nextHierarchy = WEB_HIERARCHY[level];

    // 执行无阈值分组
    const subGroups = createSubGroups(elements, nextHierarchy, level + 1);

    // 递归处理每个子分组
    parentGroup.children = subGroups.map(group => buildCompleteHierarchy(group));

    // 🔧 优化：合并只有一个子节点的分组，减少树的深度
    parentGroup = optimizeSingleChildGroups(parentGroup);

    return parentGroup;
}

// 🔧 优化单子节点分组：合并只有一个子节点的分组，减少不必要的树深度
function optimizeSingleChildGroups(group) {
    if (!group.children || group.children.length === 0) {
        return group;
    }

    // 递归优化所有子分组
    group.children = group.children.map(child => optimizeSingleChildGroups(child));

    // 如果当前分组只有一个子分组，且子分组不是叶子节点，则考虑合并
    if (group.children.length === 1) {
        const onlyChild = group.children[0];

        // 合并条件：
        // 1. 子分组也有子节点（不是叶子节点）
        // 2. 或者子分组只包含一个元素（过度分组）
        if (onlyChild.children.length > 0 || onlyChild.elements.length === 1) {
            console.log(`🔧 合并单子节点分组: ${group.name} -> ${onlyChild.name}`);

            // 保留父分组的基本信息，但使用子分组的内容
            return {
                id: group.id,
                name: group.name, // 保留父分组的名称
                type: group.type, // 保留父分组的类型
                level: group.level,
                elements: onlyChild.elements,
                bounds: onlyChild.bounds,
                children: onlyChild.children,
                direction: onlyChild.direction
            };
        }
    }

    return group;
}

// 🎯 生成基于原始节点名称的分组名称
function generateMeaningfulGroupName(elements, fallbackName) {
    if (!elements || elements.length === 0) {
        return fallbackName;
    }

    // 如果只有一个元素，直接使用元素名称
    if (elements.length === 1) {
        return elements[0].name;
    }

    // 如果有多个元素，列出所有元素名称
    const elementNames = elements.map(e => e.name);

    // 如果元素不多，直接列出所有名称
    if (elements.length <= 3) {
        return elementNames.join(' + ');
    }

    // 如果元素较多，显示前几个加省略号
    return `${elementNames.slice(0, 2).join(' + ')} + ${elements.length - 2} 项`;
}

// 创建子分组
function createSubGroups(elements, hierarchy, level) {
    console.log(`\n🔧 createSubGroups 被调用，层级: ${level}, 元素数量: ${elements.length}`);
    console.log(`输入元素: ${elements.map(e => e.name).join(', ')}`);

    if (elements.length <= 1) {
        console.log(`元素数量 <= 1，返回空数组`);
        return [];
    }

    // 1. 使用无阈值的空间聚类
    const clusters = performSpatialClustering(elements);
    console.log(`聚类结果: ${clusters.length} 个聚类`);
    clusters.forEach((cluster, i) => {
        console.log(`  聚类 ${i + 1}: [${cluster.map(e => e.name).join(', ')}]`);
    });

    // 2. 为每个聚类创建分组
    const groups = [];
    clusters.forEach((cluster, index) => {
        if (cluster.length >= 1) { // 确保所有元素都被分组
            const bounds = calculateBounds(cluster);
            const groupInfo = determineGroupType(cluster, hierarchy);

            const group = {
                id: `${hierarchy.name}_${level}_${index}`,
                name: generateMeaningfulGroupName(cluster, `${hierarchy.label} ${index + 1}`),
                type: groupInfo.type || hierarchy.name,
                level: level,
                elements: cluster,
                bounds: bounds,
                children: [],
                direction: groupInfo.direction || 'HORIZONTAL' // 默认横向
            };

            groups.push(group);
        }
    });

    // 3. 如果没有形成有效分组，创建单个包含所有元素的分组
    if (groups.length === 0 && elements.length > 0) {
        const bounds = calculateBounds(elements);
        const groupInfo = determineGroupType(elements, hierarchy);
        groups.push({
            id: `${hierarchy.name}_${level}_0`,
            name: generateMeaningfulGroupName(elements, `${hierarchy.label} 1`),
            type: groupInfo.type || hierarchy.name,
            level: level,
            elements: elements,
            bounds: bounds,
            children: [],
            direction: groupInfo.direction || 'HORIZONTAL' // 默认横向
        });
    }

    return groups;
}

// 🎯 Flex布局导向的空间聚类算法 - 优先横向分组
function performSpatialClustering(elements) {
    if (elements.length <= 1) return [elements];

    console.log(`🔄 开始无阈值空间分组`);

    // 使用无阈值的相对关系分组
    return performFlexLayoutGrouping(elements);
}

// 🎯 基于相对关系的无阈值分组算法
function performFlexLayoutGrouping(elements) {
    console.log(`🚀 开始无阈值分组，元素数量: ${elements.length}`);
    console.log(`💡 不再依赖固定阈值，使用相对空间关系进行分组`);

    if (elements.length <= 1) {
        return [elements];
    }

    // 🎯 使用相对关系进行分组
    return performRelativeGrouping(elements);
}

// 🎯 重新设计的严格分组算法
function performRelativeGrouping(elements) {
    console.log(`\n📝 === 严格间隙分组算法 ===`);

    // 使用基于间隙的严格分组
    const groups = performColumnTruncationGrouping(elements);

    console.log(`\n✅ 分组完成，生成 ${groups.length} 个分组`);
    return groups;
}

function performColumnTruncationGrouping(elements) {
    console.log(`\n🔍 开始射线分组算法`);
    console.log(`输入元素: ${elements.map(e => e.name).join(', ')}`);

    const rayGraph = buildRayRelationGraph(elements);
    const groups = dynamicProgrammingGrouping(elements, rayGraph);

    console.log(`\n📊 最终分组结果:`);
    groups.forEach((group, index) => {
        console.log(`  组 ${index + 1}: [${group.map(e => e.name).join(', ')}]`);
    });

    return groups;
}

function buildRayRelationGraph(elements) {
    const graph = {
        horizontal: new Map(),
        vertical: new Map(),
        elements: new Map()
    };

    elements.forEach(element => {
        graph.horizontal.set(element.id, new Set());
        graph.vertical.set(element.id, new Set());
        graph.elements.set(element.id, element);
    });

    for (let i = 0; i < elements.length; i++) {
        for (let j = i + 1; j < elements.length; j++) {
            const elem1 = elements[i];
            const elem2 = elements[j];

            if (canConnectHorizontally(elem1, elem2, elements)) {
                graph.horizontal.get(elem1.id).add(elem2.id);
                graph.horizontal.get(elem2.id).add(elem1.id);
            }

            if (canConnectVertically(elem1, elem2, elements)) {
                graph.vertical.get(elem1.id).add(elem2.id);
                graph.vertical.get(elem2.id).add(elem1.id);
            }
        }
    }

    return graph;
}

function canConnectHorizontally(elem1, elem2, allElements) {
    const yOverlap = !(elem1.y + elem1.height <= elem2.y || elem2.y + elem2.height <= elem1.y);
    return yOverlap && !isHorizontalRayBlocked(elem1, elem2, allElements);
}

function canConnectVertically(elem1, elem2, allElements) {
    const xOverlap = !(elem1.x + elem1.width <= elem2.x || elem2.x + elem2.width <= elem1.x);
    return xOverlap && !isVerticalRayBlocked(elem1, elem2, allElements);
}

// 计算边界
function calculateBounds(elements) {
    if (elements.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

    const minX = Math.min(...elements.map(e => e.x));
    const minY = Math.min(...elements.map(e => e.y));
    const maxX = Math.max(...elements.map(e => e.x + e.width));
    const maxY = Math.max(...elements.map(e => e.y + e.height));

    return {
        x: minX - 5,
        y: minY - 5,
        width: maxX - minX + 10,
        height: maxY - minY + 10
    };
}

// 🎯 确定分组类型和布局方向（Flex布局导向）
function determineGroupType(elements, hierarchy) {
    if (elements.length <= 1) {
        return { type: hierarchy.name, direction: 'NONE' };
    }

    // 计算布局方向
    const direction = determineFlexDirection(elements);

    // 根据元素类型和位置特征确定最适合的分组类型
    const hasImages = elements.some(e => e.type === 'image');
    const hasButtons = elements.some(e => e.type === 'button');
    const hasText = elements.some(e => e.type === 'text');

    let groupType = hierarchy.name;

    // 简化的类型判断逻辑
    if (hasButtons && hasText) groupType = 'nav';
    else if (hasImages && hasText) groupType = 'article';
    else if (elements.length > 3) groupType = 'section';

    return { type: groupType, direction };
}

// 🎯 确定Flex布局方向
function determineFlexDirection(elements) {
    if (elements.length <= 1) return 'NONE';

    // 计算元素的位置分布
    const positions = elements.map(e => ({ x: e.x, y: e.y, width: e.width, height: e.height }));

    // 计算X和Y方向的变化程度
    const xPositions = positions.map(p => p.x);
    const yPositions = positions.map(p => p.y);

    const xRange = Math.max(...xPositions) - Math.min(...xPositions);
    const yRange = Math.max(...yPositions) - Math.min(...yPositions);

    // 计算平均元素尺寸
    const avgWidth = positions.reduce((sum, p) => sum + p.width, 0) / positions.length;
    const avgHeight = positions.reduce((sum, p) => sum + p.height, 0) / positions.length;

    // 判断主要布局方向
    // 如果X方向的分布远大于Y方向，且X范围大于平均宽度，则为横向
    if (xRange > yRange && xRange > avgWidth) {
        console.log(`📐 检测到横向布局: X范围=${xRange}, Y范围=${yRange}`);
        return 'HORIZONTAL';
    }
    // 如果Y方向的分布远大于X方向，且Y范围大于平均高度，则为纵向
    else if (yRange > xRange && yRange > avgHeight) {
        console.log(`📐 检测到纵向布局: X范围=${xRange}, Y范围=${yRange}`);
        return 'VERTICAL';
    }
    // 默认横向（优先横向的策略）
    else {
        console.log(`📐 默认横向布局: X范围=${xRange}, Y范围=${yRange}`);
        return 'HORIZONTAL';
    }
}

function dynamicProgrammingGrouping(elements, rayGraph) {
    const validGroupings = findAllValidGroupings(elements, rayGraph);

    if (validGroupings.length === 0) {
        console.log(`⚠️ 没有找到有效分组方案，使用单元素分组`);
        return elements.map(e => [e]);
    }

    console.log(`\n🎯 评估 ${validGroupings.length} 种分组方案:`);

    let bestSolution = null;
    let bestScore = Infinity;

    validGroupings.forEach((grouping, index) => {
        const score = calculateGroupingScore(grouping);
        console.log(`  方案 ${index + 1}: ${grouping.length} 组, 得分: ${score.total}`);
        grouping.forEach((group, groupIndex) => {
            console.log(`    组 ${groupIndex + 1}: [${group.map(e => e.name).join(', ')}]`);
        });

        if (score.total < bestScore) {
            bestScore = score.total;
            bestSolution = grouping;
            console.log(`    ✅ 当前最佳方案!`);
        }
    });

    console.log(`\n🏆 选择方案，得分: ${bestScore}`);
    return bestSolution;
}

function findAllValidGroupings(elements, rayGraph) {
    const connectedComponents = findAllConnectedComponents(elements, rayGraph);
    const allGroupings = [];

    if (connectedComponents.length === 1 && connectedComponents[0].length > 1) {
        const component = connectedComponents[0];
        const subGroupings = findValidSubGroupings(component, rayGraph);
        allGroupings.push(...subGroupings);
    } else {
        const componentGroupings = connectedComponents.map(component => {
            if (component.length === 1) {
                return [[component]];
            } else {
                return findValidSubGroupings(component, rayGraph);
            }
        });

        allGroupings.push(...combineComponentGroupings(componentGroupings));
    }

    return allGroupings;
}

function findAllConnectedComponents(elements, rayGraph) {
    const basicComponents = findBasicConnectedComponents(elements, rayGraph);
    console.log(`\n📦 基础连通分量:`);
    basicComponents.forEach((component, index) => {
        console.log(`  分量 ${index + 1}: [${component.map(e => e.name).join(', ')}]`);
    });

    const continuousComponents = mergeContinuousComponents(basicComponents, rayGraph);
    if (continuousComponents.length !== basicComponents.length) {
        console.log(`\n🔗 连续性合并后:`);
        continuousComponents.forEach((component, index) => {
            console.log(`  分量 ${index + 1}: [${component.map(e => e.name).join(', ')}]`);
        });
    }

    return continuousComponents;
}

function findBasicConnectedComponents(elements, rayGraph) {
    const components = [];
    const visited = new Set();

    for (const element of elements) {
        if (visited.has(element.id)) continue;

        const component = [];
        const queue = [element];
        const componentVisited = new Set([element.id]);

        while (queue.length > 0) {
            const current = queue.shift();
            component.push(current);
            visited.add(current.id);

            const allConnections = new Set([
                ...(rayGraph.horizontal.get(current.id) || []),
                ...(rayGraph.vertical.get(current.id) || [])
            ]);

            for (const connectedId of allConnections) {
                if (!componentVisited.has(connectedId)) {
                    const connectedElement = rayGraph.elements.get(connectedId);
                    if (connectedElement) {
                        queue.push(connectedElement);
                        componentVisited.add(connectedId);
                    }
                }
            }
        }

        components.push(component);
    }

    return components;
}

function mergeContinuousComponents(components, rayGraph) {
    if (components.length <= 1) return components;

    const continuousGroups = [];
    const processed = new Set();

    for (let i = 0; i < components.length; i++) {
        if (processed.has(i)) continue;

        const continuousGroup = [components[i]];
        processed.add(i);

        for (let j = i + 1; j < components.length; j++) {
            if (processed.has(j)) continue;

            if (areComponentsContinuous(components[i], components[j])) {
                continuousGroup.push(components[j]);
                processed.add(j);
            }
        }

        if (continuousGroup.length > 1) {
            const mergedComponent = continuousGroup.flat();
            continuousGroups.push(mergedComponent);
        } else {
            continuousGroups.push(components[i]);
        }
    }

    return continuousGroups;
}

function areComponentsContinuous(component1, component2) {
    const bounds1 = calculateGroupBounds(component1);
    const bounds2 = calculateGroupBounds(component2);

    const sameRow = Math.abs(bounds1.y - bounds2.y) <= Math.max(bounds1.height, bounds2.height) * 0.5;
    const sameColumn = Math.abs(bounds1.x - bounds2.x) <= Math.max(bounds1.width, bounds2.width) * 0.5;

    if (sameRow) {
        const horizontalGap = Math.min(
            Math.abs(bounds1.x + bounds1.width - bounds2.x),
            Math.abs(bounds2.x + bounds2.width - bounds1.x)
        );
        const avgWidth = (bounds1.width + bounds2.width) / 2;
        return horizontalGap <= avgWidth * 0.8;
    }

    if (sameColumn) {
        const verticalGap = Math.min(
            Math.abs(bounds1.y + bounds1.height - bounds2.y),
            Math.abs(bounds2.y + bounds2.height - bounds1.y)
        );
        const avgHeight = (bounds1.height + bounds2.height) / 2;
        return verticalGap <= avgHeight * 0.8;
    }

    return false;
}

// 🎯 计算分组边界
function calculateGroupBounds(group) {
    const minX = Math.min(...group.map(e => e.x));
    const maxX = Math.max(...group.map(e => e.x + e.width));
    const minY = Math.min(...group.map(e => e.y));
    const maxY = Math.max(...group.map(e => e.y + e.height));

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

// 🎯 找到连通分量的有效子分组
function findValidSubGroupings(component, rayGraph) {
    console.log(`\n🔍 为连通分量寻找子分组: [${component.map(e => e.name).join(', ')}]`);

    const subGroupings = [];

    // 方案1：保持整体
    if (isHighlyConnected(component, rayGraph) && isSemanticallyCoherent(component)) {
        subGroupings.push([component]);
        console.log(`  方案1 - 保持整体: [${component.map(e => e.name).join(', ')}]`);
    }

    // 方案2：按行分组
    const rowGroups = groupByRayDirection(component, rayGraph, 'horizontal');
    if (rowGroups.length > 1) {
        subGroupings.push(rowGroups);
        console.log(`  方案2 - 按行分组:`);
        rowGroups.forEach((group, i) => {
            console.log(`    行 ${i + 1}: [${group.map(e => e.name).join(', ')}]`);
        });
    }

    // 方案3：按列分组
    const columnGroups = groupByRayDirection(component, rayGraph, 'vertical');
    if (columnGroups.length > 1) {
        subGroupings.push(columnGroups);
        console.log(`  方案3 - 按列分组:`);
        columnGroups.forEach((group, i) => {
            console.log(`    列 ${i + 1}: [${group.map(e => e.name).join(', ')}]`);
        });
    }

    // 方案4：语义分割
    const semanticGroups = findSemanticGrouping(component, rayGraph);
    if (semanticGroups.length > 1) {
        subGroupings.push(semanticGroups);
        console.log(`  方案4 - 语义分组:`);
        semanticGroups.forEach((group, i) => {
            console.log(`    语义组 ${i + 1}: [${group.map(e => e.name).join(', ')}]`);
        });
    }

    // 如果没有找到任何有效分组，返回单元素分组
    if (subGroupings.length === 0) {
        subGroupings.push(component.map(e => [e]));
        console.log(`  回退 - 单元素分组: ${component.map(e => `[${e.name}]`).join(', ')}`);
    }

    return subGroupings;
}

// 🎯 检查语义一致性
function isSemanticallyCoherent(component) {
    // 简单启发式：如果元素数量较少且空间紧密，认为语义相关
    if (component.length <= 2) return true;
    if (component.length > 4) return false; // 超过4个元素很可能不是一个语义单元

    // 检查空间紧密性
    const bounds = calculateGroupBounds(component);
    const density = component.length / (bounds.width * bounds.height);

    return density > 0.001; // 密度阈值
}

// 🎯 语义分组（基于间隙分析）
function findSemanticGrouping(component, rayGraph) {
    console.log(`      🔍 进行语义分组分析`);

    // 按Y坐标排序，分析垂直间隙
    const sortedByY = [...component].sort((a, b) => a.y - b.y);
    const groups = [];
    let currentGroup = [];

    for (let i = 0; i < sortedByY.length; i++) {
        const element = sortedByY[i];

        if (currentGroup.length === 0) {
            currentGroup.push(element);
        } else {
            const lastElement = currentGroup[currentGroup.length - 1];
            const gap = element.y - (lastElement.y + lastElement.height);

            // 计算语义分割阈值
            const semanticThreshold = calculateSemanticThreshold(lastElement, element);

            console.log(`        📏 "${lastElement.name}" 到 "${element.name}" 间隙: ${gap}, 语义阈值: ${semanticThreshold}`);

            if (gap > semanticThreshold) {
                // 间隙过大，开始新组
                groups.push([...currentGroup]);
                console.log(`        📦 语义分割: [${currentGroup.map(e => e.name).join(', ')}]`);
                currentGroup = [element];
            } else {
                // 继续当前组
                currentGroup.push(element);
            }
        }
    }

    if (currentGroup.length > 0) {
        groups.push(currentGroup);
        console.log(`        📦 最后语义组: [${currentGroup.map(e => e.name).join(', ')}]`);
    }

    return groups;
}

// 🎯 计算语义分割阈值
function calculateSemanticThreshold(elem1, elem2) {
    // 基于元素高度的动态阈值
    const avgHeight = (elem1.height + elem2.height) / 2;

    // 如果元素高度差异很大，可能是不同类型的信息
    const heightDiff = Math.abs(elem1.height - elem2.height);
    const heightRatio = heightDiff / avgHeight;

    // 基础阈值：平均高度的30%
    let threshold = avgHeight * 0.3;

    // 如果高度差异大，降低阈值（更容易分割）
    if (heightRatio > 0.5) {
        threshold *= 0.7;
    }

    // 如果元素很小，使用固定最小阈值
    threshold = Math.max(threshold, 5);

    return threshold;
}

// 🎯 检查是否高度连接
function isHighlyConnected(component, rayGraph) {
    if (component.length <= 2) return true;

    const totalPossibleConnections = component.length * (component.length - 1) / 2;
    const actualConnections = calculateGroupConnections(component, rayGraph);
    const connectionRatio = actualConnections / totalPossibleConnections;

    return connectionRatio > 0.6; // 60%以上的连接率认为是高度连接
}

// 🎯 按射线方向分组
function groupByRayDirection(component, rayGraph, direction) {
    const groups = [];
    const processed = new Set();

    for (const element of component) {
        if (processed.has(element.id)) continue;

        const group = [];
        const queue = [element];
        const visited = new Set([element.id]);

        while (queue.length > 0) {
            const current = queue.shift();
            group.push(current);
            processed.add(current.id);

            // 只考虑指定方向的连接
            const connections = rayGraph[direction].get(current.id) || new Set();
            for (const connectedId of connections) {
                if (!visited.has(connectedId) && !processed.has(connectedId)) {
                    const connectedElement = rayGraph.elements.get(connectedId);
                    if (connectedElement && component.some(e => e.id === connectedId)) {
                        queue.push(connectedElement);
                        visited.add(connectedId);
                    }
                }
            }
        }

        if (group.length > 0) {
            groups.push(group);
        }
    }

    return groups;
}

// 🎯 组合分量分组
function combineComponentGroupings(componentGroupings) {
    // 简化版本：取每个分量的第一个分组方案
    const combined = [];
    for (const groupings of componentGroupings) {
        if (groupings.length > 0) {
            combined.push(...groupings[0]);
        }
    }
    return [combined];
}

// 🎯 计算分组得分（深度×广度 + 均衡性惩罚）
function calculateGroupingScore(groups) {
    // 基础指标
    const maxGroupSize = Math.max(...groups.map(g => g.length));
    const groupCount = groups.length;
    const totalElements = groups.reduce((sum, g) => sum + g.length, 0);

    // 深度 = 最大组内元素数
    // 广度 = 总分组数
    const depth = maxGroupSize;
    const breadth = groupCount;
    const baseScore = depth * breadth;

    // 均衡性分析
    const avgGroupSize = totalElements / groupCount;
    const sizeVariance = groups.reduce((sum, g) => sum + Math.pow(g.length - avgGroupSize, 2), 0) / groupCount;
    const balancePenalty = sizeVariance * 0.5; // 方差惩罚

    // 极端值惩罚
    const extremePenalty = calculateExtremePenalty(depth, breadth, totalElements);

    const total = baseScore + balancePenalty + extremePenalty;

    return {
        depth,
        breadth,
        baseScore,
        balancePenalty: Math.round(balancePenalty * 100) / 100,
        extremePenalty: Math.round(extremePenalty * 100) / 100,
        total: Math.round(total * 100) / 100
    };
}

// 🎯 计算极端值惩罚
function calculateExtremePenalty(depth, breadth, totalElements) {
    let penalty = 0;

    // 理想的平衡点：深度和广度接近 sqrt(totalElements)
    const idealBalance = Math.sqrt(totalElements);

    // 深度过大惩罚（避免单个组过大）
    if (depth > idealBalance * 1.5) {
        penalty += (depth - idealBalance * 1.5) * 2;
    }

    // 广度过大惩罚（避免分组过多）
    if (breadth > idealBalance * 1.5) {
        penalty += (breadth - idealBalance * 1.5) * 2;
    }

    // 深度过小惩罚（避免分组过细）
    if (depth < 2 && totalElements > 4) {
        penalty += (2 - depth) * 3;
    }

    // 广度过小惩罚（避免单一大组）
    if (breadth < 2 && totalElements > 4) {
        penalty += (2 - breadth) * 5;
    }

    return penalty;
}

// 🎯 计算分组内连接数
function calculateGroupConnections(group, rayGraph) {
    let connections = 0;

    for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
            const elem1 = group[i];
            const elem2 = group[j];

            const horizontalConnected = rayGraph.horizontal.get(elem1.id)?.has(elem2.id);
            const verticalConnected = rayGraph.vertical.get(elem1.id)?.has(elem2.id);

            if (horizontalConnected || verticalConnected) {
                connections++;
            }
        }
    }

    return connections;
}

// 🎯 检查水平射线是否被阻挡
function isHorizontalRayBlocked(elem1, elem2, allElements) {
    // 创建水平射线路径
    const rayPath = {
        left: Math.min(elem1.x + elem1.width, elem2.x),
        right: Math.max(elem1.x, elem2.x + elem2.width),
        top: Math.max(elem1.y, elem2.y),
        bottom: Math.min(elem1.y + elem1.height, elem2.y + elem2.height)
    };

    // 如果没有Y轴重叠区域，无法连接
    if (rayPath.top >= rayPath.bottom) return true;

    // 检查是否有其他元素阻挡射线路径
    for (const other of allElements) {
        if (other.id === elem1.id || other.id === elem2.id) continue;

        // 检查其他元素是否与射线路径相交
        const intersects = !(
            other.x + other.width <= rayPath.left ||
            other.x >= rayPath.right ||
            other.y + other.height <= rayPath.top ||
            other.y >= rayPath.bottom
        );

        if (intersects) {
            return true; // 被阻挡
        }
    }

    return false; // 未被阻挡
}

// 🎯 检查垂直射线是否被阻挡
function isVerticalRayBlocked(elem1, elem2, allElements) {
    // 创建垂直射线路径
    const rayPath = {
        left: Math.max(elem1.x, elem2.x),
        right: Math.min(elem1.x + elem1.width, elem2.x + elem2.width),
        top: Math.min(elem1.y + elem1.height, elem2.y),
        bottom: Math.max(elem1.y, elem2.y + elem2.height)
    };

    // 如果没有X轴重叠区域，无法连接
    if (rayPath.left >= rayPath.right) return true;

    // 检查是否有其他元素阻挡射线路径
    for (const other of allElements) {
        if (other.id === elem1.id || other.id === elem2.id) continue;

        // 检查其他元素是否与射线路径相交
        const intersects = !(
            other.x + other.width <= rayPath.left ||
            other.x >= rayPath.right ||
            other.y + other.height <= rayPath.top ||
            other.y >= rayPath.bottom
        );

        if (intersects) {
            return true; // 被阻挡
        }
    }

    return false; // 未被阻挡
}

// 🎯 计算两个元素之间的最小距离
function calculateMinDistance(elem1, elem2) {
    const rect1 = {
        left: elem1.x,
        right: elem1.x + elem1.width,
        top: elem1.y,
        bottom: elem1.y + elem1.height
    };

    const rect2 = {
        left: elem2.x,
        right: elem2.x + elem2.width,
        top: elem2.y,
        bottom: elem2.y + elem2.height
    };

    // 计算矩形间的最小距离
    const xDistance = Math.max(0, Math.max(rect1.left - rect2.right, rect2.left - rect1.right));
    const yDistance = Math.max(0, Math.max(rect1.top - rect2.bottom, rect2.top - rect1.bottom));

    return Math.sqrt(xDistance * xDistance + yDistance * yDistance);
}
