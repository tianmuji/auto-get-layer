#!/usr/bin/env node

/**
 * 智能分组脚本使用示例
 * 
 * 运行方式:
 * node grouping-script-example.js
 * 
 * 或者作为模块使用:
 * const { ElementGrouper, quickGroup } = require('./grouping-script');
 */

// 加载Node.js版本的分组脚本
const { ElementGrouper, quickGroup } = require('./grouping-script-node');

// 示例数据
const examples = {
    // 简单卡片布局
    simpleCard: [
        { id: 'title', name: '用户信息', x: 20, y: 20, width: 200, height: 30, type: 'text' },
        { id: 'avatar', name: '头像', x: 30, y: 60, width: 60, height: 60, type: 'image' },
        { id: 'username', name: '张三', x: 100, y: 70, width: 100, height: 20, type: 'text' },
        { id: 'email', name: 'zhang@email.com', x: 100, y: 95, width: 120, height: 15, type: 'text' },
        { id: 'edit_btn', name: '编辑按钮', x: 180, y: 130, width: 60, height: 25, type: 'button' }
    ],
    
    // 复杂仪表板布局
    dashboard: [
        { id: 'total_users', name: 'Total Users', x: 20, y: 20, width: 180, height: 80 },
        { id: 'total_orders', name: 'Total Orders', x: 220, y: 20, width: 180, height: 80 },
        { id: 'revenue', name: 'Revenue', x: 420, y: 20, width: 180, height: 80 },
        { id: 'chart_title', name: 'Sales Chart', x: 20, y: 120, width: 380, height: 30 },
        { id: 'chart', name: 'Chart Area', x: 20, y: 160, width: 380, height: 200 },
        { id: 'recent_title', name: 'Recent Activity', x: 420, y: 120, width: 180, height: 30 },
        { id: 'activity1', name: 'User login', x: 420, y: 160, width: 180, height: 25 },
        { id: 'activity2', name: 'New order', x: 420, y: 190, width: 180, height: 25 },
        { id: 'activity3', name: 'Payment received', x: 420, y: 220, width: 180, height: 25 }
    ],
    
    // 表单布局
    form: [
        { id: 'form_title', name: '用户注册', x: 50, y: 20, width: 200, height: 30 },
        { id: 'name_label', name: '姓名', x: 50, y: 70, width: 60, height: 20 },
        { id: 'name_input', name: '姓名输入框', x: 120, y: 70, width: 180, height: 30 },
        { id: 'email_label', name: '邮箱', x: 50, y: 110, width: 60, height: 20 },
        { id: 'email_input', name: '邮箱输入框', x: 120, y: 110, width: 180, height: 30 },
        { id: 'password_label', name: '密码', x: 50, y: 150, width: 60, height: 20 },
        { id: 'password_input', name: '密码输入框', x: 120, y: 150, width: 180, height: 30 },
        { id: 'submit_btn', name: '提交', x: 120, y: 200, width: 80, height: 35 },
        { id: 'cancel_btn', name: '取消', x: 220, y: 200, width: 80, height: 35 }
    ]
};

// 演示函数
function demonstrateGrouping() {
    console.log('🎯 智能分组脚本演示\n');
    
    // 演示不同的输出格式
    const formats = ['hierarchy', 'flat', 'tree'];
    
    Object.entries(examples).forEach(([name, elements]) => {
        console.log(`\n📊 处理示例: ${name}`);
        console.log(`输入元素数量: ${elements.length}`);
        
        formats.forEach(format => {
            console.log(`\n--- ${format.toUpperCase()} 格式 ---`);
            
            try {
                // 使用快速分组函数
                const result = quickGroup(elements, {
                    outputFormat: format,
                    includeDetails: false,
                    debug: false
                });
                
                if (result.success) {
                    console.log(`✅ 分组成功`);
                    
                    if (result.statistics) {
                        console.log(`📈 统计信息:`);
                        console.log(`   - 总分组数: ${result.statistics.totalGroups}`);
                        console.log(`   - 最大深度: ${result.statistics.maxDepth}`);
                        console.log(`   - 平均分组大小: ${result.statistics.averageGroupSize.toFixed(1)}`);
                        console.log(`   - 分组效率: ${(result.statistics.groupingEfficiency * 100).toFixed(1)}%`);
                    }
                    
                    // 显示简化的结果结构
                    if (format === 'flat' && result.groups) {
                        console.log(`📦 分组结果:`);
                        result.groups.forEach((group, index) => {
                            console.log(`   组 ${index + 1}: ${group.name} (${group.elements.length} 个元素)`);
                            console.log(`      元素: ${group.elements.map(e => e.name).join(', ')}`);
                        });
                    } else if (format === 'tree' && result.tree) {
                        console.log(`🌳 树形结构:`);
                        printTree(result.tree, '   ');
                    } else if (format === 'hierarchy' && result.hierarchy) {
                        console.log(`🏗️ 层次结构: ${result.hierarchy.name} (${result.hierarchy.childCount} 个子分组)`);
                    }
                    
                } else {
                    console.log(`❌ 分组失败: ${result.error}`);
                }
                
            } catch (error) {
                console.log(`❌ 处理异常: ${error.message}`);
            }
        });
    });
}

// 打印树形结构的辅助函数
function printTree(node, indent = '') {
    console.log(`${indent}${node.name} (${node.type}, ${node.elementCount} 元素)`);
    
    if (node.elements && node.elements.length > 0) {
        node.elements.forEach(elementName => {
            console.log(`${indent}  📄 ${elementName}`);
        });
    }
    
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            printTree(child, indent + '  ');
        });
    }
}

// 性能测试函数
function performanceTest() {
    console.log('\n⚡ 性能测试\n');
    
    // 生成大量测试数据
    function generateTestData(count) {
        const elements = [];
        for (let i = 0; i < count; i++) {
            elements.push({
                id: `element_${i}`,
                name: `Element ${i + 1}`,
                x: Math.random() * 800,
                y: Math.random() * 600,
                width: 50 + Math.random() * 150,
                height: 20 + Math.random() * 80,
                type: ['text', 'button', 'image', 'input'][Math.floor(Math.random() * 4)]
            });
        }
        return elements;
    }
    
    const testSizes = [10, 20, 30, 50];
    
    testSizes.forEach(size => {
        console.log(`📊 测试 ${size} 个元素:`);
        
        const testData = generateTestData(size);
        const startTime = Date.now();
        
        try {
            const result = quickGroup(testData, {
                outputFormat: 'hierarchy',
                includeDetails: false,
                debug: false
            });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            if (result.success) {
                console.log(`   ✅ 处理时间: ${duration}ms`);
                console.log(`   📈 生成分组: ${result.statistics.totalGroups}`);
                console.log(`   📏 最大深度: ${result.statistics.maxDepth}`);
            } else {
                console.log(`   ❌ 处理失败: ${result.error}`);
            }
            
        } catch (error) {
            console.log(`   ❌ 异常: ${error.message}`);
        }
    });
}

// 自定义配置演示
function customConfigDemo() {
    console.log('\n🔧 自定义配置演示\n');
    
    const elements = examples.dashboard;
    
    // 自定义层次定义
    const customHierarchy = [
        { name: 'page', label: 'Page', minSize: 0, priority: 1 },
        { name: 'dashboard', label: 'Dashboard', minSize: 200, priority: 2 },
        { name: 'widget', label: 'Widget', minSize: 100, priority: 3 },
        { name: 'component', label: 'Component', minSize: 50, priority: 4 }
    ];
    
    const grouper = new ElementGrouper({
        outputFormat: 'hierarchy',
        includeDetails: true,
        optimizeSingleChild: true,
        customHierarchy: customHierarchy,
        debug: true
    });
    
    console.log('使用自定义层次定义处理仪表板布局...');
    
    try {
        const result = grouper.group(elements);
        
        if (result.success) {
            console.log('✅ 自定义配置处理成功');
            console.log(`📊 结果统计: ${JSON.stringify(result.statistics, null, 2)}`);
        } else {
            console.log(`❌ 处理失败: ${result.error}`);
        }
        
    } catch (error) {
        console.log(`❌ 异常: ${error.message}`);
    }
}

// 错误处理演示
function errorHandlingDemo() {
    console.log('\n🚨 错误处理演示\n');
    
    const testCases = [
        { name: '空数组', data: [] },
        { name: '无效数据', data: [{ invalid: 'data' }] },
        { name: '缺少坐标', data: [{ name: 'test', width: 100, height: 50 }] },
        { name: '非数组输入', data: 'invalid' }
    ];
    
    testCases.forEach(testCase => {
        console.log(`测试: ${testCase.name}`);
        
        try {
            const result = quickGroup(testCase.data);
            
            if (result.success) {
                console.log('   ✅ 意外成功');
            } else {
                console.log(`   ❌ 预期失败: ${result.error}`);
                if (result.fallbackGroups) {
                    console.log(`   🔄 降级处理: ${result.fallbackGroups.length} 个降级分组`);
                }
            }
            
        } catch (error) {
            console.log(`   ❌ 异常捕获: ${error.message}`);
        }
    });
}

// 主函数
function main() {
    console.log('🚀 开始智能分组脚本演示...\n');

    // 检查环境
    if (typeof ElementGrouper === 'undefined') {
        console.log('⚠️  警告: ElementGrouper 未定义，请确保已正确加载模块');
        console.log('在浏览器环境中，请使用 grouping-script-demo.html');
        return;
    }

    console.log('✅ Node.js环境检测成功，开始演示...\n');
    
    try {
        // 基本演示
        demonstrateGrouping();
        
        // 性能测试
        performanceTest();
        
        // 自定义配置演示
        customConfigDemo();
        
        // 错误处理演示
        errorHandlingDemo();
        
        console.log('\n🎉 演示完成！');
        
    } catch (error) {
        console.error('❌ 演示过程中发生错误:', error.message);
    }
}

// 如果直接运行此文件
if (typeof require !== 'undefined' && require.main === module) {
    main();
}

// 导出演示函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        demonstrateGrouping,
        performanceTest,
        customConfigDemo,
        errorHandlingDemo,
        examples
    };
}
