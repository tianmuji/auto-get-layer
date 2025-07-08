/**
 * Figma API 工具函数
 * 用于获取 Figma 文件和节点数据
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Figma API 基础配置
const FIGMA_API_BASE = 'https://api.figma.com/v1';
// 从环境变量或配置文件读取 API Token
function getFigmaToken() {
    // 优先从环境变量读取
    if (process.env.FIGMA_TOKEN) {
        return process.env.FIGMA_TOKEN;
    }
    // 如果没有环境变量，提示用户设置
    throw new Error(`
请设置 Figma API Token:
1. 在 Figma 中生成 Personal Access Token: https://www.figma.com/developers/api#access-tokens
2. 设置环境变量: export FIGMA_TOKEN="your_token_here"
3. 或者在 .env 文件中添加: FIGMA_TOKEN=your_token_here
  `);
}
// 解析 Figma URL 获取 fileKey 和 nodeId
export function parseFigmaUrl(url) {
    // 支持的 URL 格式:
    // https://www.figma.com/file/FILE_KEY/FILE_NAME
    // https://www.figma.com/design/FILE_KEY/FILE_NAME?node-id=NODE_ID
    const urlPattern = /figma\.com\/(file|design)\/([A-Za-z0-9]+)/;
    const match = url.match(urlPattern);
    if (!match) {
        throw new Error('无效的 Figma URL 格式');
    }
    const fileKey = match[2];
    // 提取 node-id 参数
    const urlObj = new URL(url);
    const nodeId = urlObj.searchParams.get('node-id');
    return {
        fileKey,
        nodeId: nodeId || undefined
    };
}
// Figma API 请求封装
function figmaApiRequest(endpoint) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = getFigmaToken();
        const response = yield fetch(`${FIGMA_API_BASE}${endpoint}`, {
            headers: {
                'X-Figma-Token': token,
            },
        });
        if (!response.ok) {
            throw new Error(`Figma API 请求失败: ${response.status} ${response.statusText}`);
        }
        return response.json();
    });
}
// 获取文件信息
export function getFigmaFile(fileKey) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`正在获取 Figma 文件: ${fileKey}`);
        return figmaApiRequest(`/files/${fileKey}`);
    });
}
// 获取特定节点信息
export function getFigmaNode(fileKey, nodeId) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`正在获取节点: ${nodeId} (文件: ${fileKey})`);
        return figmaApiRequest(`/files/${fileKey}/nodes?ids=${nodeId}`);
    });
}
// 递归提取所有节点信息
export function extractAllNodes(node, path = []) {
    const nodes = [];
    const currentPath = [...path, node.name || 'Unnamed'];
    // 添加当前节点
    nodes.push(Object.assign(Object.assign({}, node), { path: currentPath.join(' > '), depth: path.length }));
    // 递归处理子节点
    if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
            nodes.push(...extractAllNodes(child, currentPath));
        }
    }
    return nodes;
}
// 过滤支持自动布局的节点
export function filterAutoLayoutCapableNodes(nodes) {
    const AUTO_LAYOUT_CAPABLE_TYPES = ['FRAME', 'COMPONENT', 'INSTANCE'];
    return nodes.filter(node => {
        return AUTO_LAYOUT_CAPABLE_TYPES.includes(node.type) &&
            node.children &&
            node.children.length > 0;
    });
}
// 模拟 Figma 插件环境中的节点结构
export function convertToPluginNodeFormat(apiNode) {
    var _a, _b, _c, _d;
    return {
        id: apiNode.id,
        name: apiNode.name,
        type: apiNode.type,
        visible: apiNode.visible !== false,
        locked: apiNode.locked || false,
        // 布局相关属性
        layoutMode: apiNode.layoutMode || 'NONE',
        itemSpacing: apiNode.itemSpacing || 0,
        paddingLeft: apiNode.paddingLeft || 0,
        paddingRight: apiNode.paddingRight || 0,
        paddingTop: apiNode.paddingTop || 0,
        paddingBottom: apiNode.paddingBottom || 0,
        // 几何属性
        x: ((_a = apiNode.absoluteBoundingBox) === null || _a === void 0 ? void 0 : _a.x) || 0,
        y: ((_b = apiNode.absoluteBoundingBox) === null || _b === void 0 ? void 0 : _b.y) || 0,
        width: ((_c = apiNode.absoluteBoundingBox) === null || _c === void 0 ? void 0 : _c.width) || 0,
        height: ((_d = apiNode.absoluteBoundingBox) === null || _d === void 0 ? void 0 : _d.height) || 0,
        // 子节点
        children: apiNode.children ? apiNode.children.map(convertToPluginNodeFormat) : [],
        // 测试辅助信息
        path: apiNode.path || '',
        depth: apiNode.depth || 0
    };
}
