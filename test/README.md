# 自动布局检查测试系统

这个测试系统可以通过 Figma API 获取设计文件数据，运行自动布局检查，并生成详细的测试报告。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 设置 Figma API Token
```bash
# 方法一：设置环境变量
export FIGMA_TOKEN="your_figma_personal_access_token"

# 方法二：创建 .env 文件
cp test/env.example .env
# 编辑 .env 文件，填入你的 token
```

**获取 Figma API Token：**
1. 访问 [Figma Developer Settings](https://www.figma.com/developers/api#access-tokens)
2. 点击 "Generate new token"
3. 复制生成的 token

### 3. 运行测试
```bash
# 测试整个文件
npm run test:auto-layout "https://www.figma.com/file/YOUR_FILE_KEY/FILE_NAME"

# 测试特定节点
npm run test:auto-layout "https://www.figma.com/design/YOUR_FILE_KEY/FILE_NAME?node-id=1-2"
```

## 📊 测试报告

测试完成后会在 `test/reports/` 目录下生成两种格式的报告：

### Markdown 报告 (.md)
- 人类可读的详细报告
- 包含测试摘要、问题详情、改进建议
- 适合分享和查看

### JSON 报告 (.json)
- 机器可读的结构化数据
- 包含完整的测试数据和统计信息
- 适合进一步处理和分析

## 🔍 测试内容

### 检查项目
- ✅ 识别所有支持自动布局的节点（FRAME、COMPONENT、INSTANCE）
- ✅ 检查每个节点是否启用了自动布局
- ✅ 提供完整的节点路径信息
- ✅ 生成详细的统计信息

### 报告内容
- 📊 节点类型分布统计
- 📏 结构信息（最大深度、子节点数量等）
- ❌ 违规问题详情
- 💡 修改建议
- 📋 支持自动布局的节点列表

## 🛠️ 工具函数

### `utils/figma-api.ts`
- Figma API 调用封装
- URL 解析和数据获取
- 节点格式转换

### `utils/validation-adapter.ts`
- 校验逻辑适配器
- 统计信息生成
- 节点分析工具

### `utils/report-generator.ts`
- 测试报告生成器
- Markdown 和 JSON 格式输出
- 文件保存和控制台输出

## 📝 示例输出

```
🚀 开始自动布局检查测试...

📋 解析 Figma URL...
   File Key: ABC123DEF456
   Node ID: 1-2

🔍 获取指定节点数据...
   文件名: 我的设计文件
   目标节点: 主页面 (PAGE)

🔄 转换节点数据格式...
   提取到 45 个节点

✅ 执行自动布局检查...
   发现 3 个违规项

📊 生成统计信息...
   总节点数: 45
   支持自动布局的节点: 8
   已启用自动布局的节点: 5
   合规率: 62.5%

📝 生成测试报告...
📄 Markdown 报告已保存: test/reports/auto-layout-test-ABC123DE-2024-01-15.md
📊 JSON 报告已保存: test/reports/auto-layout-test-ABC123DE-2024-01-15.json

============================================================
📋 测试报告摘要
============================================================
文件: 我的设计文件
状态: ❌ 未通过
合规率: 62.5%
问题数量: 3
支持自动布局的节点: 8
============================================================
```

## 🔧 故障排除

### 常见错误

**1. "请设置 Figma API Token"**
- 确保已设置 `FIGMA_TOKEN` 环境变量
- 检查 token 是否有效

**2. "无效的 Figma URL 格式"**
- 确保 URL 格式正确
- 支持的格式：
  - `https://www.figma.com/file/FILE_KEY/FILE_NAME`
  - `https://www.figma.com/design/FILE_KEY/FILE_NAME?node-id=NODE_ID`

**3. "Figma API 请求失败"**
- 检查网络连接
- 确认文件访问权限
- 验证 token 权限

### 调试技巧

1. **检查环境变量**：
   ```bash
   echo $FIGMA_TOKEN
   ```

2. **验证 URL 格式**：
   - 从 Figma 中复制分享链接
   - 确保包含正确的 file key

3. **查看详细日志**：
   - 测试过程中会输出详细的步骤信息
   - 查看控制台输出了解具体错误

## 🎯 使用场景

### 设计团队
- 定期检查设计文件的自动布局使用情况
- 确保设计规范的执行
- 生成设计质量报告

### 开发团队
- 验证设计稿的技术可行性
- 评估自动布局的使用程度
- 为开发工作提供参考

### 项目管理
- 跟踪设计质量指标
- 生成项目健康度报告
- 制定改进计划

# 测试系统指南

这个目录包含了 Figma 插件的测试系统，用于验证插件功能的正确性。

## 测试文件说明

### 主要测试文件

1. **auto-layout-tester.ts** - 自动布局校验测试
   - 检查所有支持自动布局的节点
   - 生成详细的合规性报告
   - 支持命令行参数

2. **frame-selection-flatten-test.ts** - Frame Selection + Flatten 方法测试
   - 测试 GROUP 转 FRAME 的新实现方法
   - 验证名称转换功能
   - 模拟事务性操作流程

3. **real-figma-group-test.ts** - 真实 Figma Group 转换测试
   - 使用真实 Figma API 测试 Group 节点
   - 分析节点复杂度和转换可行性
   - 生成转换建议和详细报告

4. **demo-test.ts** - 演示测试脚本
   - 快速验证测试系统功能
   - 使用示例数据运行测试

5. **demo-frame-selection-test.js** - Frame Selection 演示测试
   - 展示 GROUP 转 FRAME 功能
   - 显示名称转换效果

### 工具函数

1. **figma-api.ts** - Figma API 封装
   - URL 解析和验证
   - API 请求处理
   - 错误处理和重试机制

2. **validation-adapter.ts** - 校验逻辑适配器
   - 将插件校验逻辑适配到测试环境
   - 生成节点统计和分析
   - 提供详细的错误信息

3. **report-generator.ts** - 报告生成器
   - 生成 Markdown 格式报告
   - 生成 JSON 格式数据
   - 自动保存和输出管理

## 环境配置

### 1. 安装依赖
```bash
npm install
```

### 2. 设置环境变量
创建 `.env` 文件或设置环境变量：
```bash
export FIGMA_TOKEN="your_figma_token_here"
```

### 3. 获取 Figma Token
1. 访问 [Figma Account Settings](https://www.figma.com/settings)
2. 滚动到 "Personal access tokens" 部分
3. 点击 "Create new token"
4. 复制生成的 token

## 使用方法

### 快速开始

1. **运行演示测试**
```bash
npm run demo:test
```

2. **测试 Frame Selection + Flatten 功能**
```bash
npm run demo:frame-selection
```

3. **测试真实 Figma 文件**
```bash
npm run test:auto-layout "https://www.figma.com/file/YOUR_FILE_ID/..."
```

### Frame Selection + Flatten 测试

#### 模拟测试（无需 Figma Token）
```bash
# 运行模拟测试
npm run test:frame-selection

# 或者运行演示
npm run demo:frame-selection
```

#### 真实 API 测试
```bash
# 测试真实 Figma 文件中的所有 Group 节点
npm run test:real-group "https://www.figma.com/file/abc123/My-Design"

# 测试特定节点
tsx test/frame-selection-flatten-test.ts "FIGMA_URL" "node-id-1" "node-id-2"
```

### 详细使用

#### 自动布局测试
```bash
# 基础测试
npm run test:auto-layout "https://www.figma.com/file/abc123/My-Design"

# 使用特定节点 ID
tsx test/auto-layout-tester.ts "https://www.figma.com/file/abc123/My-Design" "node-id-1" "node-id-2"
```

#### Group 转换测试
```bash
# 分析文件中所有 Group 节点
npm run test:real-group "https://www.figma.com/file/abc123/My-Design"

# 测试特定 Group 节点转换
tsx test/real-figma-group-test.ts "FIGMA_URL"
```

## 测试报告

测试完成后会生成以下文件：

### 报告文件位置
- `test-reports/auto-layout-report-[timestamp].md` - 自动布局测试报告
- `test-reports/frame-selection-flatten-report.md` - Frame Selection 测试报告
- `test-reports/real-figma-group-test-report.md` - 真实 Group 转换测试报告
- `test-reports/auto-layout-data-[timestamp].json` - JSON 数据

### Frame Selection 测试报告内容
1. **测试摘要** - 成功率、名称转换统计
2. **详细结果** - 每个测试用例的执行情况
3. **名称转换示例** - "group" → "frame" 转换效果
4. **技术验证** - 各项功能的验证结果
5. **转换建议** - 基于节点复杂度的建议

## 示例输出

### Frame Selection 测试输出
```
🎯 Frame Selection + Flatten 方法演示测试
==================================================

📋 运行模拟测试...

🧪 测试节点: test-group-1
✅ 基础 Group 转换
   📝 "Button Group" → "Button Frame"
   ✅ 节点类型验证通过: GROUP
   ✅ 子节点数量: 2
   ✅ 模拟 Frame Selection 创建成功
   ✅ 名称智能转换: Button Group → Button Frame

📊 测试统计:
   总测试数: 5
   成功数: 5
   失败数: 0
   成功率: 100.0%

📝 名称转换示例:
   "Button Group" → "Button Frame"
   "Navigation Group" → "Navigation Frame"
```

### 真实 Group 测试输出
```
🌐 使用真实 Figma API 测试 Group 转换功能
📁 目标文件: https://www.figma.com/file/abc123/My-Design

🔍 搜索文件中的所有 Group 节点...
📄 搜索页面: Page 1
   找到 Group: "Header Group" (ID: 123:456)
   找到 Group: "Button Group" (ID: 789:012)
✅ 总共找到 2 个 Group 节点

🧪 测试 Group 转换: "Header Group"
   📊 节点分析: {
     子节点数: 3,
     复杂度: 'medium',
     包含Group名称: true,
     预期Frame名称: 'Header Frame'
   }

✅ Header Group
   📝 Header Group → Header Frame
   ✅ 适合使用 Frame Selection + Flatten 方法转换
```

## 测试用例覆盖

### Frame Selection + Flatten 测试用例

1. **基础转换测试**
   - 简单 Group 转 Frame
   - 验证自动布局启用
   - 检查子节点保留

2. **名称转换测试**
   - "group" → "frame" (小写)
   - "Group" → "Frame" (首字母大写)
   - "GROUP" → "FRAME" (全大写)
   - "my-group-item" → "my-frame-item" (中间位置)

3. **复杂度测试**
   - 简单 Group (≤2 子节点)
   - 中等复杂 Group (3-5 子节点)
   - 复杂 Group (>5 子节点)
   - 嵌套 Group 结构

4. **布局方向检测**
   - 水平布局检测
   - 垂直布局检测
   - 混合布局处理

5. **错误恢复测试**
   - 权限不足情况
   - 节点结构异常
   - API 调用失败

## 故障排除

### 常见错误

1. **Token 无效**
```
❌ Figma API 请求失败: 401 Unauthorized
```
解决：检查 FIGMA_TOKEN 环境变量是否正确设置

2. **文件 URL 无效**
```
❌ 无效的 Figma URL 格式
```
解决：确保使用完整的 Figma 文件 URL

3. **找不到 Group 节点**
```
⚠️ 文件中没有找到 Group 节点
```
解决：确认文件中确实存在 Group 节点，或创建一些用于测试

4. **模块导入错误**
```
❌ Cannot find module './frame-selection-flatten-test'
```
解决：确保所有测试文件都已正确创建

### 调试模式

设置环境变量启用详细日志：
```bash
export DEBUG=1
npm run test:real-group "FIGMA_URL"
```

## 扩展测试

### 添加新的测试用例

1. 在 `test/` 目录创建新的测试文件
2. 使用现有的工具函数 (`figma-api.ts`, `validation-adapter.ts`)
3. 在 `package.json` 中添加对应的 npm script

### 自定义校验规则

1. 修改 `validation-adapter.ts` 中的校验逻辑
2. 更新对应的测试用例
3. 重新生成测试报告

## 贡献指南

1. 所有测试文件应该包含完整的 TypeScript 类型定义
2. 错误处理要详细和用户友好
3. 测试结果要包含足够的上下文信息
4. 生成的报告要易于阅读和理解
5. 新功能测试要包含模拟测试和真实 API 测试

## 技术栈

- **TypeScript** - 主要开发语言
- **Node.js** - 运行环境
- **Figma API** - 数据源
- **tsx** - TypeScript 执行器 