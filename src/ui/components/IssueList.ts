import { DesignRuleViolation } from '../../types/interfaces';

// 问题列表组件配置接口
interface IssueListConfig {
  container: HTMLElement;
  onIssueClick?: (issue: DesignRuleViolation) => void;
}

// 问题列表组件类
export class IssueList {
  private container: HTMLElement;
  private onIssueClick?: (issue: DesignRuleViolation) => void;

  constructor(config: IssueListConfig) {
    this.container = config.container;
    this.onIssueClick = config.onIssueClick;
    this.init();
  }

  // 初始化组件
  private init() {
    this.container.className = 'issue-list';
    this.container.style.cssText = `
      padding: 16px;
      border-radius: 4px;
      background-color: #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      margin-bottom: 16px;
    `;
  }

  // 显示问题列表
  display(issues: DesignRuleViolation[]) {
    this.container.innerHTML = '';

    if (issues.length === 0) {
      this.showEmptyState();
      return;
    }

    issues.forEach(issue => {
      const issueItem = this.createIssueItem(issue);
      this.container.appendChild(issueItem);
    });

    this.container.style.display = 'block';
  }

  // 创建问题项
  private createIssueItem(issue: DesignRuleViolation): HTMLElement {
    const item = document.createElement('div');
    item.className = 'issue-item';
    item.style.cssText = `
      display: flex;
      align-items: flex-start;
      padding: 8px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: background-color 0.3s;
    `;

    // 添加鼠标悬停效果
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f5f5f5';
    });
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });

    // 添加点击事件
    if (this.onIssueClick) {
      item.addEventListener('click', () => this.onIssueClick!(issue));
    }

    // 创建图标
    const icon = document.createElement('span');
    icon.className = 'issue-icon';
    icon.style.cssText = `
      margin-right: 8px;
      font-size: 16px;
      line-height: 1;
    `;
    icon.textContent = this.getIssueIcon(issue.severity);

    // 创建内容区域
    const content = document.createElement('div');
    content.className = 'issue-content';
    content.style.cssText = 'flex: 1;';

    // 添加问题消息
    const message = document.createElement('div');
    message.className = 'issue-message';
    message.style.cssText = 'margin-bottom: 4px;';
    message.textContent = issue.message;

    // 添加问题位置信息
    if (issue.nodeId) {
      const location = document.createElement('div');
      location.className = 'issue-location';
      location.style.cssText = `
        font-size: 12px;
        color: #666;
      `;
      location.textContent = `位置: ${issue.nodeName || issue.nodeId}`;
      content.appendChild(location);
    }

    content.appendChild(message);
    item.appendChild(icon);
    item.appendChild(content);

    return item;
  }

  // 显示空状态
  private showEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.style.cssText = `
      text-align: center;
      padding: 24px;
      color: #999;
    `;
    emptyState.textContent = '暂无问题';
    this.container.appendChild(emptyState);
  }

  // 获取问题图标
  private getIssueIcon(severity: string): string {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  }

  // 隐藏问题列表
  hide() {
    this.container.style.display = 'none';
  }

  // 清空问题列表
  clear() {
    this.container.innerHTML = '';
  }
} 