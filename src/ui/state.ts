// UI状态类型定义
export interface UIState {
  hasEditPermission: boolean;
  isLoading: boolean;
  currentNodeData: any;
  analysisResult: any;
  settings: {
    enableResponsiveSizing: boolean;
    enableSidebarMode: boolean;
    enableAutoFix: boolean;
  };
}

// 初始状态
const initialState: UIState = {
  hasEditPermission: false,
  isLoading: false,
  currentNodeData: null,
  analysisResult: null,
  settings: {
    enableResponsiveSizing: true,
    enableSidebarMode: false,
    enableAutoFix: true
  }
};

// 状态管理类
export class UIStateManager {
  private state: UIState = initialState;
  private listeners: ((state: UIState) => void)[] = [];

  // 获取当前状态
  getState(): UIState {
    return { ...this.state };
  }

  // 更新状态
  setState(partial: Partial<UIState>) {
    this.state = {
      ...this.state,
      ...partial
    };
    this.notifyListeners();
  }

  // 添加状态监听器
  addListener(listener: (state: UIState) => void) {
    this.listeners.push(listener);
  }

  // 移除状态监听器
  removeListener(listener: (state: UIState) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // 通知所有监听器
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // 设置加载状态
  setLoading(isLoading: boolean) {
    this.setState({ isLoading });
  }

  // 设置权限状态
  setPermission(hasEditPermission: boolean) {
    this.setState({ hasEditPermission });
  }

  // 设置当前节点数据
  setNodeData(currentNodeData: any) {
    this.setState({ currentNodeData });
  }

  // 设置分析结果
  setAnalysisResult(analysisResult: any) {
    this.setState({ analysisResult });
  }

  // 更新设置
  updateSettings(settings: Partial<UIState['settings']>) {
    this.setState({
      settings: {
        ...this.state.settings,
        ...settings
      }
    });
  }

  // 重置状态
  reset() {
    this.setState(initialState);
  }
}

// 导出单例实例
export const uiState = new UIStateManager(); 