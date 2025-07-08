// 分析结果组件配置接口
interface AnalysisResultConfig {
  container: HTMLElement;
  onNodeClick?: (nodeId: string) => void;
}

// 分析结果组件类
export class AnalysisResult {
  private container: HTMLElement;
  private onNodeClick?: (nodeId: string) => void;

  constructor(config: AnalysisResultConfig) {
    this.container = config.container;
    this.onNodeClick = config.onNodeClick;
    this.init();
  }

  // 初始化组件
  private init() {
    this.container.className = 'analysis-result';
    this.container.style.cssText = `
      padding: 16px;
      border-radius: 4px;
      background-color: #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      margin-bottom: 16px;
    `;
  }

  // 显示分析结果
  display(result: any) {
    this.container.innerHTML = '';

    // 创建标题
    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
    `;
    title.textContent = '分析结果';
    this.container.appendChild(title);

    // 创建统计信息
    if (result.stats) {
      const stats = this.createStatsSection(result.stats);
      this.container.appendChild(stats);
    }

    // 创建问题列表
    if (result.issues && result.issues.length > 0) {
      const issues = this.createIssuesSection(result.issues);
      this.container.appendChild(issues);
    }

    // 创建建议列表
    if (result.suggestions && result.suggestions.length > 0) {
      const suggestions = this.createSuggestionsSection(result.suggestions);
      this.container.appendChild(suggestions);
    }

    // 创建节点树
    if (result.nodeTree) {
      const nodeTree = this.createNodeTreeSection(result.nodeTree);
      this.container.appendChild(nodeTree);
    }

    this.container.style.display = 'block';
  }

  // 创建统计信息区域
  private createStatsSection(stats: any): HTMLElement {
    const section = document.createElement('div');
    section.className = 'stats-section';
    section.style.cssText = `
      margin-bottom: 16px;
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
    `;

    const list = document.createElement('ul');
    list.style.cssText = `
      margin: 0;
      padding: 0;
      list-style: none;
    `;

    Object.entries(stats).forEach(([key, value]) => {
      const item = document.createElement('li');
      item.style.cssText = `
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
      `;
      
      const label = document.createElement('span');
      label.style.color = '#666';
      label.textContent = this.formatStatLabel(key);

      const valueSpan = document.createElement('span');
      valueSpan.style.fontWeight = '500';
      valueSpan.textContent = String(value);

      item.appendChild(label);
      item.appendChild(valueSpan);
      list.appendChild(item);
    });

    section.appendChild(list);
    return section;
  }

  // 创建问题列表区域
  private createIssuesSection(issues: any[]): HTMLElement {
    const section = document.createElement('div');
    section.className = 'issues-section';
    section.style.cssText = 'margin-bottom: 16px;';

    const title = document.createElement('h4');
    title.style.cssText = `
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #666;
    `;
    title.textContent = '发现的问题';
    section.appendChild(title);

    const list = document.createElement('ul');
    list.style.cssText = `
      margin: 0;
      padding: 0;
      list-style: none;
    `;

    issues.forEach(issue => {
      const item = document.createElement('li');
      item.style.cssText = `
        margin-bottom: 8px;
        padding: 8px;
        background-color: #fff1f0;
        border-radius: 4px;
        cursor: pointer;
      `;

      const message = document.createElement('div');
      message.textContent = issue.message;

      if (issue.nodeId && this.onNodeClick) {
        item.addEventListener('click', () => this.onNodeClick!(issue.nodeId));
      }

      item.appendChild(message);
      list.appendChild(item);
    });

    section.appendChild(list);
    return section;
  }

  // 创建建议列表区域
  private createSuggestionsSection(suggestions: string[]): HTMLElement {
    const section = document.createElement('div');
    section.className = 'suggestions-section';
    section.style.cssText = 'margin-bottom: 16px;';

    const title = document.createElement('h4');
    title.style.cssText = `
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #666;
    `;
    title.textContent = '优化建议';
    section.appendChild(title);

    const list = document.createElement('ul');
    list.style.cssText = `
      margin: 0;
      padding: 0 0 0 16px;
    `;

    suggestions.forEach(suggestion => {
      const item = document.createElement('li');
      item.style.cssText = 'margin-bottom: 4px;';
      item.textContent = suggestion;
      list.appendChild(item);
    });

    section.appendChild(list);
    return section;
  }

  // 创建节点树区域
  private createNodeTreeSection(nodeTree: any): HTMLElement {
    const section = document.createElement('div');
    section.className = 'node-tree-section';
    section.style.cssText = 'margin-bottom: 16px;';

    const title = document.createElement('h4');
    title.style.cssText = `
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #666;
    `;
    title.textContent = '节点结构';
    section.appendChild(title);

    const tree = this.createNodeTreeItem(nodeTree);
    section.appendChild(tree);

    return section;
  }

  // 创建节点树项
  private createNodeTreeItem(node: any): HTMLElement {
    const item = document.createElement('div');
    item.className = 'node-tree-item';
    item.style.cssText = 'margin-left: 16px;';

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      padding: 4px 0;
      cursor: pointer;
    `;

    const icon = document.createElement('span');
    icon.style.marginRight = '4px';
    icon.textContent = node.children?.length ? '📁' : '📄';
    header.appendChild(icon);

    const name = document.createElement('span');
    name.textContent = node.name || node.type;
    header.appendChild(name);

    if (node.id && this.onNodeClick) {
      header.addEventListener('click', () => this.onNodeClick!(node.id));
    }

    item.appendChild(header);

    if (node.children?.length) {
      const children = document.createElement('div');
      children.style.cssText = 'margin-left: 16px;';
      node.children.forEach((child: any) => {
        children.appendChild(this.createNodeTreeItem(child));
      });
      item.appendChild(children);
    }

    return item;
  }

  // 格式化统计标签
  private formatStatLabel(key: string): string {
    const labels: { [key: string]: string } = {
      totalNodes: '节点总数',
      groups: '分组数量',
      frames: 'Frame数量',
      components: '组件数量',
      maxDepth: '最大嵌套深度',
      autoLayoutFrames: '自动布局Frame',
      interactiveElements: '交互元素'
    };
    return labels[key] || key;
  }

  // 隐藏分析结果
  hide() {
    this.container.style.display = 'none';
  }

  // 清空分析结果
  clear() {
    this.container.innerHTML = '';
  }
} 