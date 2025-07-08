import { UICommand } from './commands';
import { uiState } from './state';
import { showToast } from './components/Toast';

// 发送消息到插件
export function postPluginMessage(msg: UICommand) {
  parent.postMessage({ pluginMessage: msg }, '*');
}

// 设置加载状态
export function setLoadingState() {
  uiState.setLoading(true);
}

// 处理权限检查
export function handlePermissionCheck(hasPermission: boolean) {
  uiState.setPermission(hasPermission);
  if (!hasPermission) {
    showPermissionNotice();
  }
}

// 显示权限提示
function showPermissionNotice() {
  showToast('当前处于只读模式，部分功能可能不可用', 'warning');
}

// 处理分析结果
export function handleAnalysisResult(data: any) {
  uiState.setAnalysisResult(data);
  uiState.setLoading(false);
}

// 处理修复结果
export function handleFixResult(data: any) {
  uiState.setLoading(false);
  if (data.success) {
    showToast(data.message, 'success');
  } else {
    showToast(data.message, 'error');
  }
  
  // 修复完成后重新分析
  setTimeout(() => {
    postPluginMessage({ type: 'analyze-selection' });
  }, 1000);
}

// 处理节点提取结果
export function handleExtractionResult(data: any) {
  uiState.setNodeData(data.nodeData);
  uiState.setLoading(false);
}

// 处理测试结果
export function handleTestResult(data: any) {
  uiState.setLoading(false);
  showToast(data.message, data.success ? 'success' : 'error');
}

// 处理智能分组结果
export function handleSmartGroupingResult(data: any) {
  uiState.setLoading(false);
  if (data.success) {
    showToast('智能分组完成！', 'success');
  } else {
    showToast(data.message, 'error');
  }
}

// 处理位置布局结果
export function handlePositionLayoutResult(data: any) {
  uiState.setLoading(false);
  if (data.success) {
    showToast('位置关系布局转换完成！', 'success');
  } else {
    showToast(data.message, 'error');
  }
}

// 按钮事件处理函数
export const buttonHandlers = {
  // 执行自动修复
  performAutoFix() {
    const { hasEditPermission, settings } = uiState.getState();
    if (!hasEditPermission) {
      showToast('只读模式下无法执行此操作', 'warning');
      return;
    }
    
    setLoadingState();
    postPluginMessage({ 
      type: 'auto-fix-all',
      settings 
    });
  },

  // 应用智能布局
  applySmartLayout() {
    const { hasEditPermission, settings } = uiState.getState();
    if (!hasEditPermission) {
      showToast('只读模式下无法执行此操作', 'warning');
      return;
    }
    
    setLoadingState();
    const messageType = settings.enableSidebarMode ? 'apply-custom-layout' : 'fix-frame-selection';
    
    postPluginMessage({ 
      type: messageType,
      enableResponsiveSizing: settings.enableResponsiveSizing
    });
  },

  // 转换Groups
  convertGroups() {
    const { hasEditPermission } = uiState.getState();
    if (!hasEditPermission) {
      showToast('只读模式下无法执行此操作', 'warning');
      return;
    }

    setLoadingState();
    postPluginMessage({ type: 'convert-groups' });
  },

  // 创建测试节点
  createTestGroups() {
    const { hasEditPermission } = uiState.getState();
    if (!hasEditPermission) {
      showToast('只读模式下无法执行此操作', 'warning');
      return;
    }
    postPluginMessage({ type: 'create-test-groups' });
  },

  // 创建测试Frame
  createTestFrames() {
    const { hasEditPermission } = uiState.getState();
    if (!hasEditPermission) {
      showToast('只读模式下无法执行此操作', 'warning');
      return;
    }
    postPluginMessage({ type: 'create-test-frames' });
  },

  // 应用智能分组
  applySmartGrouping() {
    const { hasEditPermission } = uiState.getState();
    if (!hasEditPermission) {
      showToast('只读模式下无法执行智能分组', 'warning');
      return;
    }
    
    setLoadingState();
    postPluginMessage({ type: 'apply-smart-grouping' });
  },

  // 应用位置关系布局
  applyPositionLayout() {
    const { hasEditPermission } = uiState.getState();
    if (!hasEditPermission) {
      showToast('只读模式下无法执行位置关系布局', 'warning');
      return;
    }
    
    setLoadingState();
    postPluginMessage({ type: 'apply-position-layout' });
  }
}; 