import { buttonHandlers } from '../events';

// 按钮配置接口
interface ButtonConfig {
  text: string;
  type: 'primary' | 'success' | 'warning' | 'danger';
  onClick: () => void;
  icon?: string;
}

// 操作按钮组件配置接口
interface ActionButtonsConfig {
  container: HTMLElement;
}

// 操作按钮组件类
export class ActionButtons {
  private container: HTMLElement;
  private buttons: ButtonConfig[] = [];

  constructor(config: ActionButtonsConfig) {
    this.container = config.container;
    this.init();
  }

  // 初始化组件
  private init() {
    this.container.className = 'action-buttons';
    this.container.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    `;
  }

  // 添加按钮
  addButton(config: ButtonConfig) {
    this.buttons.push(config);
    const button = this.createButton(config);
    this.container.appendChild(button);
  }

  // 创建按钮元素
  private createButton(config: ButtonConfig): HTMLElement {
    const button = document.createElement('button');
    button.className = `btn btn-${config.type}`;
    button.style.cssText = this.getButtonStyle(config.type);
    
    // 添加图标
    if (config.icon) {
      const icon = document.createElement('span');
      icon.className = 'button-icon';
      icon.style.marginRight = '4px';
      icon.textContent = config.icon;
      button.appendChild(icon);
    }

    // 添加文本
    const text = document.createElement('span');
    text.textContent = config.text;
    button.appendChild(text);

    // 添加点击事件
    button.addEventListener('click', config.onClick);

    return button;
  }

  // 获取按钮样式
  private getButtonStyle(type: string): string {
    const baseStyle = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      border: none;
      transition: all 0.3s;
      outline: none;
    `;

    switch (type) {
      case 'primary':
        return `
          ${baseStyle}
          background-color: #1890ff;
          color: #fff;
          &:hover {
            background-color: #40a9ff;
          }
        `;
      case 'success':
        return `
          ${baseStyle}
          background-color: #52c41a;
          color: #fff;
          &:hover {
            background-color: #73d13d;
          }
        `;
      case 'warning':
        return `
          ${baseStyle}
          background-color: #faad14;
          color: #fff;
          &:hover {
            background-color: #ffc53d;
          }
        `;
      case 'danger':
        return `
          ${baseStyle}
          background-color: #ff4d4f;
          color: #fff;
          &:hover {
            background-color: #ff7875;
          }
        `;
      default:
        return baseStyle;
    }
  }

  // 显示分析结果相关的按钮
  displayAnalysisButtons(analysis: any) {
    this.clear();

    if (analysis.canAutoFix) {
      this.addButton({
        text: '自动修复全部',
        type: 'primary',
        onClick: buttonHandlers.performAutoFix,
        icon: '🔧'
      });
    }

    if (analysis.canApplyLayout) {
      this.addButton({
        text: '应用智能布局',
        type: 'success',
        onClick: buttonHandlers.applySmartLayout,
        icon: '🎯'
      });
    }

    if (analysis.canConvertGroups) {
      this.addButton({
        text: '转换Groups',
        type: 'warning',
        onClick: buttonHandlers.convertGroups,
        icon: '📦'
      });
    }

    this.container.style.display = 'flex';
  }

  // 清空按钮
  clear() {
    this.container.innerHTML = '';
    this.buttons = [];
  }

  // 隐藏按钮组
  hide() {
    this.container.style.display = 'none';
  }

  // 显示按钮组
  show() {
    this.container.style.display = 'flex';
  }
} 