/**
 * 智能分组脚本 - 将无序的设计元素转换为有序的分组结构
 * 
 * 使用示例:
 * const grouper = new ElementGrouper();
 * const result = grouper.group(elements);
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

class ElementGrouper {
    constructor(options = {}) {
        this.options = {
            // 输出格式: 'hierarchy' | 'flat' | 'tree'
            outputFormat: options.outputFormat || 'hierarchy',
            
            // 是否包含详细信息
            includeDetails: options.includeDetails !== false,
            
            // 是否优化单子节点
            optimizeSingleChild: options.optimizeSingleChild !== false,
            
            // 自定义层次定义
            customHierarchy: options.customHierarchy || null,
            
            // 调试模式
            debug: options.debug || false,
            
            ...options
        };
        
        // 如果有自定义层次定义，更新全局配置
        if (this.options.customHierarchy) {
            this.updateHierarchy(this.options.customHierarchy);
        }
    }
    
    /**
     * 主要分组方法
     * @param {Array} elements - 输入的元素数组
     * @returns {Object} 分组结果
     */
    group(elements) {
        try {
            // 输入验证
            if (!this.validateInput(elements)) {
                throw new Error('Invalid input: elements must be a non-empty array');
            }
            
            if (this.options.debug) {
                console.log('🚀 开始分组处理，元素数量:', elements.length);
                console.log('📊 输入元素:', elements);
            }
            
            // 标准化输入数据
            const normalizedElements = this.normalizeElements(elements);
            
            // 执行分组算法
            const hierarchy = performCompleteHierarchicalGrouping(normalizedElements);
            
            // 根据输出格式转换结果
            const result = this.formatOutput(hierarchy, normalizedElements);
            
            if (this.options.debug) {
                console.log('✅ 分组完成');
                console.log('📋 分组结果:', result);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ 分组处理失败:', error.message);
            return this.createErrorResult(error, elements);
        }
    }
    
    /**
     * 输入验证
     */
    validateInput(elements) {
        if (!Array.isArray(elements)) {
            return false;
        }
        
        if (elements.length === 0) {
            return false;
        }
        
        // 检查必需字段
        return elements.every(element => {
            return element && 
                   typeof element.x === 'number' &&
                   typeof element.y === 'number' &&
                   typeof element.width === 'number' &&
                   typeof element.height === 'number';
        });
    }
    
    /**
     * 标准化元素数据
     */
    normalizeElements(elements) {
        return elements.map((element, index) => ({
            // 必需字段
            id: element.id || `element_${index}`,
            name: element.name || element.text || element.label || `Element ${index + 1}`,
            x: Number(element.x),
            y: Number(element.y),
            width: Number(element.width),
            height: Number(element.height),
            
            // 可选字段
            type: element.type || this.detectElementType(element),
            
            // 保留原始数据
            _original: element
        }));
    }
    
    /**
     * 自动检测元素类型
     */
    detectElementType(element) {
        const name = (element.name || element.text || '').toLowerCase();
        const width = element.width;
        const height = element.height;
        
        // 基于名称的类型检测
        if (name.includes('button') || name.includes('btn')) return 'button';
        if (name.includes('image') || name.includes('img') || name.includes('photo')) return 'image';
        if (name.includes('title') || name.includes('heading')) return 'heading';
        if (name.includes('input') || name.includes('field')) return 'input';
        if (name.includes('icon')) return 'icon';
        
        // 基于尺寸的类型检测
        if (width === height && width < 50) return 'icon';
        if (height < 30) return 'text';
        if (width > height * 2) return 'text';
        if (Math.abs(width - height) < 20) return 'image';
        
        return 'text'; // 默认类型
    }
    
    /**
     * 格式化输出结果
     */
    formatOutput(hierarchy, originalElements) {
        const baseResult = {
            success: true,
            timestamp: new Date().toISOString(),
            inputCount: originalElements.length,
            processingTime: Date.now() // 简化的时间戳
        };

        switch (this.options.outputFormat) {
            case 'flat':
                return {
                    ...baseResult,
                    format: 'flat',
                    groups: this.extractFlatGroups(hierarchy)
                };

            case 'tree':
                return {
                    ...baseResult,
                    format: 'tree',
                    tree: this.convertToTree(hierarchy)
                };

            case 'clean':
                return {
                    ...baseResult,
                    format: 'clean',
                    result: this.extractCleanResult(hierarchy, originalElements),
                    statistics: this.calculateStatistics(hierarchy)
                };

            case 'hierarchy':
            default:
                return {
                    ...baseResult,
                    format: 'hierarchy',
                    hierarchy: this.options.includeDetails ? hierarchy : this.simplifyHierarchy(hierarchy),
                    statistics: this.calculateStatistics(hierarchy)
                };
        }
    }
    
    /**
     * 提取扁平分组
     */
    extractFlatGroups(hierarchy) {
        const groups = [];
        
        function extractGroups(node) {
            if (node.elements && node.elements.length > 0) {
                groups.push({
                    id: node.id,
                    name: node.name,
                    type: node.type,
                    elements: node.elements.map(e => ({
                        id: e.id,
                        name: e.name,
                        type: e.type,
                        bounds: { x: e.x, y: e.y, width: e.width, height: e.height }
                    })),
                    bounds: node.bounds,
                    direction: node.direction
                });
            }
            
            if (node.children) {
                node.children.forEach(child => extractGroups(child));
            }
        }
        
        extractGroups(hierarchy);
        return groups;
    }
    
    /**
     * 转换为树形结构
     */
    convertToTree(hierarchy) {
        function convertNode(node) {
            const treeNode = {
                id: node.id,
                name: node.name,
                type: node.type,
                level: node.level,
                elementCount: node.elements ? node.elements.length : 0,
                bounds: node.bounds,
                direction: node.direction
            };
            
            if (node.children && node.children.length > 0) {
                treeNode.children = node.children.map(child => convertNode(child));
            }
            
            if (node.elements && node.elements.length > 0) {
                treeNode.elements = node.elements.map(e => e.name);
            }
            
            return treeNode;
        }
        
        return convertNode(hierarchy);
    }
    
    /**
     * 简化层次结构
     */
    simplifyHierarchy(hierarchy) {
        function simplifyNode(node) {
            return {
                id: node.id,
                name: node.name,
                type: node.type,
                level: node.level,
                elementCount: node.elements ? node.elements.length : 0,
                childCount: node.children ? node.children.length : 0,
                bounds: node.bounds,
                direction: node.direction,
                children: node.children ? node.children.map(child => simplifyNode(child)) : []
            };
        }
        
        return simplifyNode(hierarchy);
    }
    
    /**
     * 提取简洁的结果 - 包含所有节点的父子关系
     */
    extractCleanResult(hierarchy, originalElements) {
        const result = {
            nodes: []  // 统一的节点数组，包含元素和分组
        };

        // 创建原始元素映射
        const elementMap = new Map();
        originalElements.forEach(elem => {
            elementMap.set(elem.id, elem);
        });

        // 递归提取所有节点信息
        this.extractAllNodesRecursive(hierarchy, null, result, elementMap);

        return result;
    }

    /**
     * 递归提取所有节点信息
     */
    extractAllNodesRecursive(node, parentId, result, elementMap) {
        // 添加当前节点（分组节点）
        result.nodes.push({
            id: node.id,
            parent: parentId,
            type: node.type,
            name: node.name,
            level: node.level,
            nodeType: 'group'  // 标识为分组节点
        });

        // 如果是叶子节点（没有子节点），添加其包含的元素
        if (node.elements && node.elements.length > 0 && (!node.children || node.children.length === 0)) {
            node.elements.forEach(element => {
                const originalElement = elementMap.get(element.id);
                if (originalElement) {
                    result.nodes.push({
                        id: element.id,
                        parent: node.id,
                        name: element.name,
                        type: element.type,
                        nodeType: 'element',  // 标识为元素节点
                        // 保留原始元素的位置和尺寸信息
                        x: originalElement.x,
                        y: originalElement.y,
                        width: originalElement.width,
                        height: originalElement.height,
                        // 保留原始数据引用
                        _original: originalElement
                    });
                }
            });
        }

        // 递归处理子节点
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                this.extractAllNodesRecursive(child, node.id, result, elementMap);
            });
        }
    }

    /**
     * 计算统计信息
     */
    calculateStatistics(hierarchy) {
        let totalGroups = 0;
        let maxDepth = 0;
        let totalElements = 0;

        function analyze(node, depth = 1) {
            totalGroups++;
            maxDepth = Math.max(maxDepth, depth);

            if (node.elements) {
                totalElements += node.elements.length;
            }

            if (node.children) {
                node.children.forEach(child => analyze(child, depth + 1));
            }
        }

        analyze(hierarchy);

        return {
            totalGroups,
            maxDepth,
            totalElements,
            averageGroupSize: totalElements / totalGroups,
            groupingEfficiency: (totalElements - totalGroups) / totalElements
        };
    }
    
    /**
     * 创建错误结果
     */
    createErrorResult(error, elements) {
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            inputCount: Array.isArray(elements) ? elements.length : 0,
            fallbackGroups: Array.isArray(elements) ? elements.map((e, i) => ({
                id: `fallback_${i}`,
                name: `Group ${i + 1}`,
                type: 'div',
                elements: [e]
            })) : []
        };
    }
    
    /**
     * 更新层次定义
     */
    updateHierarchy(customHierarchy) {
        if (typeof window !== 'undefined' && window.WEB_HIERARCHY) {
            window.WEB_HIERARCHY = customHierarchy;
        }
    }
    
    /**
     * 获取支持的输出格式
     */
    static getSupportedFormats() {
        return ['hierarchy', 'flat', 'tree', 'clean'];
    }
    
    /**
     * 获取默认配置
     */
    static getDefaultOptions() {
        return {
            outputFormat: 'hierarchy',
            includeDetails: true,
            optimizeSingleChild: true,
            customHierarchy: null,
            debug: false
        };
    }
}

// 便捷函数 - 快速分组
function quickGroup(elements, options = {}) {
    const grouper = new ElementGrouper(options);
    return grouper.group(elements);
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    // Node.js 环境
    module.exports = { ElementGrouper, quickGroup };
} else if (typeof window !== 'undefined') {
    // 浏览器环境
    window.ElementGrouper = ElementGrouper;
    window.quickGroup = quickGroup;
}
