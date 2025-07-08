/**
 * 校验适配器
 * 将插件中的校验函数适配到测试环境中使用
 */
// 支持自动布局的节点类型（与插件代码保持一致）
const AUTO_LAYOUT_CAPABLE_TYPES = ['FRAME', 'COMPONENT', 'INSTANCE'];
// 具备 children 的节点类型（与插件代码保持一致）
const CHILDREN_NODE_TYPES = [
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
];
// 类型检查函数（与插件代码保持一致）
function hasChildren(nodeType) {
    return CHILDREN_NODE_TYPES.includes(nodeType);
}
/**
 * 自动布局检查函数（从插件代码适配）
 * 校验节点下所有节点是否都使用了自动布局
 */
export function checkAllNodesAutoLayout(node) {
    const violations = [];
    function recursiveCheck(currentNode, path = []) {
        // 检查当前节点是否支持自动布局
        if (AUTO_LAYOUT_CAPABLE_TYPES.includes(currentNode.type)) {
            // 检查是否有子节点且未启用自动布局
            if (currentNode.children && currentNode.children.length > 0) {
                const layoutMode = currentNode.layoutMode || 'NONE';
                if (layoutMode === 'NONE') {
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
        if (hasChildren(currentNode.type) && currentNode.children) {
            for (const child of currentNode.children) {
                recursiveCheck(child, [...path, currentNode.name || 'Unnamed']);
            }
        }
    }
    // 开始递归检查
    recursiveCheck(node);
    return violations;
}
/**
 * 生成节点统计信息
 */
export function generateNodeStatistics(node) {
    const stats = {
        totalNodes: 0,
        nodesByType: {},
        autoLayoutCapableNodes: 0,
        autoLayoutEnabledNodes: 0,
        maxDepth: 0,
        nodesWithChildren: 0
    };
    function analyzeNode(currentNode, depth = 0) {
        stats.totalNodes++;
        stats.maxDepth = Math.max(stats.maxDepth, depth);
        // 统计节点类型
        stats.nodesByType[currentNode.type] = (stats.nodesByType[currentNode.type] || 0) + 1;
        // 统计有子节点的节点
        if (currentNode.children && currentNode.children.length > 0) {
            stats.nodesWithChildren++;
        }
        // 统计支持自动布局的节点
        if (AUTO_LAYOUT_CAPABLE_TYPES.includes(currentNode.type) &&
            currentNode.children && currentNode.children.length > 0) {
            stats.autoLayoutCapableNodes++;
            // 统计已启用自动布局的节点
            if (currentNode.layoutMode && currentNode.layoutMode !== 'NONE') {
                stats.autoLayoutEnabledNodes++;
            }
        }
        // 递归分析子节点
        if (currentNode.children) {
            for (const child of currentNode.children) {
                analyzeNode(child, depth + 1);
            }
        }
    }
    analyzeNode(node);
    return stats;
}
/**
 * 生成详细的节点列表
 */
export function generateDetailedNodeList(node) {
    const nodes = [];
    function collectNode(currentNode, path = [], depth = 0) {
        const nodePath = [...path, currentNode.name || 'Unnamed'];
        nodes.push({
            id: currentNode.id,
            name: currentNode.name || 'Unnamed',
            type: currentNode.type,
            path: nodePath.join(' > '),
            depth,
            hasChildren: currentNode.children && currentNode.children.length > 0,
            childrenCount: currentNode.children ? currentNode.children.length : 0,
            supportsAutoLayout: AUTO_LAYOUT_CAPABLE_TYPES.includes(currentNode.type),
            layoutMode: currentNode.layoutMode || 'NONE',
            autoLayoutEnabled: currentNode.layoutMode && currentNode.layoutMode !== 'NONE',
            dimensions: {
                width: currentNode.width || 0,
                height: currentNode.height || 0
            }
        });
        // 递归收集子节点
        if (currentNode.children) {
            for (const child of currentNode.children) {
                collectNode(child, nodePath, depth + 1);
            }
        }
    }
    collectNode(node);
    return nodes;
}
