// Toast类型定义
type ToastType = 'success' | 'error' | 'warning' | 'info';

// Toast配置接口
interface ToastConfig {
  duration?: number;
  position?: 'top' | 'bottom';
}

// Toast样式
const toastStyles = {
  container: `
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    padding: 8px 16px;
    border-radius: 4px;
    color: #fff;
    font-size: 14px;
    max-width: 80%;
    text-align: center;
    transition: all 0.3s ease;
    opacity: 0;
  `,
  success: 'background-color: #52c41a;',
  error: 'background-color: #ff4d4f;',
  warning: 'background-color: #faad14;',
  info: 'background-color: #1890ff;'
};

// Toast实例类
class Toast {
  private container: HTMLDivElement | null = null;
  private timer: number | null = null;
  private config: ToastConfig = {
    duration: 3000,
    position: 'top'
  };

  constructor(config?: ToastConfig) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // 显示Toast
  show(message: string, type: ToastType = 'info') {
    // 清除现有Toast
    this.hide();

    // 创建新的Toast容器
    this.container = document.createElement('div');
    this.container.style.cssText = toastStyles.container;
    this.container.style.top = this.config.position === 'top' ? '20px' : 'auto';
    this.container.style.bottom = this.config.position === 'bottom' ? '20px' : 'auto';
    this.container.style.backgroundColor = this.getBackgroundColor(type);
    this.container.textContent = message;

    // 添加到文档
    document.body.appendChild(this.container);

    // 触发动画
    requestAnimationFrame(() => {
      if (this.container) {
        this.container.style.opacity = '1';
      }
    });

    // 设置自动隐藏
    this.timer = window.setTimeout(() => {
      this.hide();
    }, this.config.duration);
  }

  // 隐藏Toast
  private hide() {
    if (this.container) {
      this.container.style.opacity = '0';
      setTimeout(() => {
        if (this.container && this.container.parentNode) {
          this.container.parentNode.removeChild(this.container);
          this.container = null;
        }
      }, 300);
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  // 获取背景色
  private getBackgroundColor(type: ToastType): string {
    switch (type) {
      case 'success':
        return '#52c41a';
      case 'error':
        return '#ff4d4f';
      case 'warning':
        return '#faad14';
      case 'info':
      default:
        return '#1890ff';
    }
  }
}

// 创建全局Toast实例
const toast = new Toast();

// 导出显示Toast的函数
export function showToast(message: string, type: ToastType = 'info') {
  toast.show(message, type);
} 