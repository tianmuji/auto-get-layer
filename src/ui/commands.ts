import { DesignRuleViolation } from '../types/interfaces';
import { checkEditPermission } from '../utils/node-utils';
import { analyzeCurrentSelection } from '../core/node-analysis';
import { fixFrameSelectionWithResponsiveSizing } from '../core/auto-layout';
import { applySmartGrouping } from '../core/layout-detection';
import { convertToAutoLayoutBasedOnPositionRelationships } from '../core/responsive-sizing';

// 命令类型定义
export type UICommand = 
  | { type: 'resize-window'; width?: number; height?: number }
  | { type: 'check-permissions' }
  | { type: 'jump-to-node'; nodeId: string }
  | { type: 'apply-custom-layout'; enableResponsiveSizing?: boolean }
  | { type: 'check-auto-layout' }
  | { type: 'fix-frame-selection'; enableResponsiveSizing?: boolean }
  | { type: 'apply-smart-grouping' }
  | { type: 'apply-position-layout' }
  | { type: 'analyze-selection' }
  | { type: 'auto-fix-all'; settings?: any }
  | { type: 'convert-groups' }
  | { type: 'extract-nodes' }
  | { type: 'generate-report' }
  | { type: 'copy-to-clipboard'; text: string };

// 命令处理函数
export async function handleCommand(msg: UICommand) {
  switch (msg.type) {
    case 'resize-window':
      try {
        figma.ui.resize(msg.width || 380, msg.height || 520);
      } catch (e) {
        console.log('无法调整窗口大小:', e);
      }
      break;

    case 'check-permissions':
      const hasPermission = checkEditPermission();
      figma.ui.postMessage({
        type: 'permission-check-result',
        data: { hasPermission }
      });
      break;

    case 'jump-to-node':
      try {
        const node = await figma.getNodeByIdAsync(msg.nodeId);
        if (node && 'visible' in node && node.visible) {
          figma.currentPage.selection = [node];
          figma.viewport.scrollAndZoomIntoView([node]);
        } else {
          figma.notify('未找到该节点或节点不可见');
        }
      } catch (e) {
        figma.notify('跳转失败，节点可能不存在');
      }
      break;

    case 'apply-custom-layout':
    case 'fix-frame-selection':
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'layout-result',
          success: false,
          message: '请先选择要应用布局的节点'
        });
        return;
      }

      const result = fixFrameSelectionWithResponsiveSizing(
        selection,
        msg.enableResponsiveSizing !== false
      );

      figma.ui.postMessage({
        type: 'layout-result',
        success: result.success,
        message: result.message,
        violations: result.violations
      });
      break;

    case 'apply-smart-grouping':
      const smartGroupingSelection = figma.currentPage.selection;
      if (smartGroupingSelection.length === 0) {
        figma.ui.postMessage({
          type: 'smart-grouping-result',
          result: {
            success: false,
            message: '❌ 请先选择要分组的节点',
            analyses: [],
            summary: {
              totalCards: 0,
              totalGroups: 0,
              avgEfficiency: 0,
              details: ['请选择包含卡片的容器或直接选择卡片']
            }
          }
        });
        return;
      }

      try {
        const result = await applySmartGrouping(smartGroupingSelection);
        figma.ui.postMessage({
          type: 'smart-grouping-result',
          result: result
        });
      } catch (error) {
        figma.ui.postMessage({
          type: 'smart-grouping-result',
          result: {
            success: false,
            message: '❌ 智能分组失败',
            analyses: [],
            summary: {
              totalCards: 0,
              totalGroups: 0,
              avgEfficiency: 0,
              details: [`错误: ${error instanceof Error ? error.message : String(error)}`]
            }
          }
        });
      }
      break;

    case 'apply-position-layout':
      const positionLayoutSelection = figma.currentPage.selection;
      if (positionLayoutSelection.length === 0) {
        figma.ui.postMessage({
          type: 'position-layout-result',
          result: {
            success: false,
            message: '❌ 请先选择要转换的容器',
            details: []
          }
        });
        return;
      }

      try {
        const result = await convertToAutoLayoutBasedOnPositionRelationships(positionLayoutSelection);
        figma.ui.postMessage({
          type: 'position-layout-result',
          result: result
        });
      } catch (error) {
        figma.ui.postMessage({
          type: 'position-layout-result',
          result: {
            success: false,
            message: '❌ 位置关系布局转换失败',
            details: [`错误: ${error instanceof Error ? error.message : String(error)}`]
          }
        });
      }
      break;

    case 'analyze-selection':
      const analysis = analyzeCurrentSelection();
      figma.ui.postMessage({
        type: 'analysis-result',
        data: analysis
      });
      break;

    // 其他命令处理...
  }
} 