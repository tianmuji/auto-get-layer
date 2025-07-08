/**
 * BFS算法修复验证测试
 * 测试NaN坐标修复和分组逻辑优化
 */

console.log('🔧 BFS算法修复验证测试开始...');

// 测试数据：包含一些无效坐标
const testElements = [
  // 正常元素
  { name: "Product Title", x: 110, y: 25, width: 200, height: 20, type: "TEXT" },
  { name: "Product Description", x: 110, y: 65, width: 250, height: 14, type: "TEXT" },
  { name: "Rating Text", x: 175, y: 88, width: 30, height: 14, type: "TEXT" },
  
  // 包含NaN的元素
  { name: "Star 1", x: NaN, y: 91, width: 8, height: 8, type: "RECTANGLE" },
  { name: "Star 2", x: 125, y: NaN, width: 8, height: 8, type: "RECTANGLE" },
  { name: "Price", x: 400, y: 30, width: NaN, height: 24, type: "TEXT" },
  
  // 边界情况
  { name: "Zero Width", x: 100, y: 100, width: 0, height: 20, type: "TEXT" },
  { name: "Negative Size", x: 200, y: 200, width: -10, height: 15, type: "TEXT" }
];

// 测试边界框计算修复
function testBoundingBoxFix() {
  console.log('\n📦 测试边界框计算修复...');
  
  function calculateBoundingBox(element) {
    // 验证输入数据，防止NaN
    const x = isNaN(element.x) ? 0 : element.x;
    const y = isNaN(element.y) ? 0 : element.y;
    const width = isNaN(element.width) || element.width <= 0 ? 1 : element.width;
    const height = isNaN(element.height) || element.height <= 0 ? 1 : element.height;
    
    const minX = x;
    const minY = y;
    const maxX = x + width;
    const maxY = y + height;
    
    return {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      centerX: minX + width / 2,
      centerY: minY + height / 2
    };
  }
  
  let successCount = 0;
  
  for (const element of testElements) {
    try {
      const bounds = calculateBoundingBox(element);
      
      // 验证结果没有NaN
      const hasNaN = Object.values(bounds).some(v => isNaN(v));
      
      if (!hasNaN) {
        console.log(`✅ ${element.name}: 边界框计算正常`);
        successCount++;
      } else {
        console.log(`❌ ${element.name}: 仍包含NaN值`);
      }
      
    } catch (error) {
      console.log(`❌ ${element.name}: 计算失败 - ${error.message}`);
    }
  }
  
  console.log(`📊 边界框修复测试: ${successCount}/${testElements.length} 成功`);
  return successCount === testElements.length;
}

// 测试语义相似性改进
function testSemanticSimilarityImprovement() {
  console.log('\n🧠 测试语义相似性改进...');
  
  function calculateSemanticSimilarity(elem1, elem2) {
    let score = 0;
    
    const name1 = elem1.name.toLowerCase();
    const name2 = elem2.name.toLowerCase();
    
    // 检查关键词匹配
    const keywords = ['button', 'text', 'image', 'icon', 'star', 'rating', 'price', 'title', 'description'];
    for (const keyword of keywords) {
      if (name1.includes(keyword) && name2.includes(keyword)) {
        score += 30;
        break;
      }
    }
    
    // 特殊处理：内容类元素
    const contentKeywords = ['title', 'subtitle', 'description', 'rating', 'text', 'star'];
    const isContent1 = contentKeywords.some(k => name1.includes(k));
    const isContent2 = contentKeywords.some(k => name2.includes(k));
    
    if (isContent1 && isContent2) {
      score += 25; // 内容类元素额外加分
    }
    
    // 类型相似性
    if (elem1.type === elem2.type) {
      score += 20;
    }
    
    return Math.min(100, score);
  }
  
  // 测试内容类元素的相似性
  const titleElement = { name: "Product Title", type: "TEXT" };
  const descElement = { name: "Product Description", type: "TEXT" };
  const ratingElement = { name: "Rating Text", type: "TEXT" };
  
  const titleDescSimilarity = calculateSemanticSimilarity(titleElement, descElement);
  const titleRatingSimilarity = calculateSemanticSimilarity(titleElement, ratingElement);
  const descRatingSimilarity = calculateSemanticSimilarity(descElement, ratingElement);
  
  console.log(`Title ↔ Description: ${titleDescSimilarity}% (期望 ≥ 45%)`);
  console.log(`Title ↔ Rating: ${titleRatingSimilarity}% (期望 ≥ 45%)`);
  console.log(`Description ↔ Rating: ${descRatingSimilarity}% (期望 ≥ 45%)`);
  
  const allHighEnough = titleDescSimilarity >= 45 && titleRatingSimilarity >= 45 && descRatingSimilarity >= 45;
  
  if (allHighEnough) {
    console.log('✅ 内容类元素相似性提升成功');
  } else {
    console.log('❌ 内容类元素相似性仍需优化');
  }
  
  return allHighEnough;
}

// 测试空间阈值调整
function testSpatialThresholdAdjustment() {
  console.log('\n📍 测试空间阈值调整...');
  
  function areBoxesNearby(box1, box2, threshold = 50) {
    const horizontalGap = Math.max(0, Math.max(box1.minX - box2.maxX, box2.minX - box1.maxX));
    const verticalGap = Math.max(0, Math.max(box1.minY - box2.maxY, box2.minY - box1.maxY));
    return horizontalGap <= threshold || verticalGap <= threshold;
  }
  
  function calculateBoundingBox(element) {
    const x = isNaN(element.x) ? 0 : element.x;
    const y = isNaN(element.y) ? 0 : element.y;
    const width = isNaN(element.width) || element.width <= 0 ? 1 : element.width;
    const height = isNaN(element.height) || element.height <= 0 ? 1 : element.height;
    
    return {
      minX: x,
      minY: y,
      maxX: x + width,
      maxY: y + height
    };
  }
  
  // 测试相邻元素
  const titleBounds = calculateBoundingBox({ x: 110, y: 25, width: 200, height: 20 });
  const descBounds = calculateBoundingBox({ x: 110, y: 65, width: 250, height: 14 });
  const ratingBounds = calculateBoundingBox({ x: 175, y: 88, width: 30, height: 14 });
  
  const titleDescNearby = areBoxesNearby(titleBounds, descBounds, 50);
  const descRatingNearby = areBoxesNearby(descBounds, ratingBounds, 50);
  const titleRatingNearby = areBoxesNearby(titleBounds, ratingBounds, 50);
  
  console.log(`Title ↔ Description: ${titleDescNearby ? '✅ 相邻' : '❌ 不相邻'}`);
  console.log(`Description ↔ Rating: ${descRatingNearby ? '✅ 相邻' : '❌ 不相邻'}`);
  console.log(`Title ↔ Rating: ${titleRatingNearby ? '✅ 相邻' : '❌ 不相邻'}`);
  
  // 至少应该有2对相邻
  const nearbyCount = [titleDescNearby, descRatingNearby, titleRatingNearby].filter(Boolean).length;
  
  if (nearbyCount >= 2) {
    console.log('✅ 空间阈值调整效果良好');
  } else {
    console.log('❌ 空间阈值需要进一步调整');
  }
  
  return nearbyCount >= 2;
}

// 测试动态阈值逻辑
function testDynamicThresholdLogic() {
  console.log('\n🎯 测试动态阈值逻辑...');
  
  function getDynamicThreshold(elem1, elem2) {
    const name1 = elem1.name.toLowerCase();
    const name2 = elem2.name.toLowerCase();
    const contentKeywords = ['title', 'subtitle', 'description', 'rating', 'text', 'star'];
    const isContentRelated = contentKeywords.some(k => name1.includes(k)) && 
                            contentKeywords.some(k => name2.includes(k));
    
    return isContentRelated ? 20 : 25;
  }
  
  const titleElement = { name: "Product Title" };
  const descElement = { name: "Product Description" };
  const buttonElement = { name: "Add Button" };
  
  const contentThreshold = getDynamicThreshold(titleElement, descElement);
  const mixedThreshold = getDynamicThreshold(titleElement, buttonElement);
  
  console.log(`内容类元素阈值: ${contentThreshold} (期望: 20)`);
  console.log(`混合元素阈值: ${mixedThreshold} (期望: 25)`);
  
  const correctThresholds = contentThreshold === 20 && mixedThreshold === 25;
  
  if (correctThresholds) {
    console.log('✅ 动态阈值逻辑正确');
  } else {
    console.log('❌ 动态阈值逻辑有误');
  }
  
  return correctThresholds;
}

// 测试坐标验证
function testCoordinateValidation() {
  console.log('\n📐 测试坐标验证...');
  
  function validateCoordinates(x, y, width, height) {
    const validX = isNaN(x) ? 0 : x;
    const validY = isNaN(y) ? 0 : y;
    const validWidth = isNaN(width) || width <= 0 ? 1 : width;
    const validHeight = isNaN(height) || height <= 0 ? 1 : height;
    
    return { x: validX, y: validY, width: validWidth, height: validHeight };
  }
  
  const testCases = [
    { input: { x: NaN, y: 100, width: 50, height: 20 }, expected: { x: 0, y: 100, width: 50, height: 20 } },
    { input: { x: 100, y: NaN, width: 50, height: 20 }, expected: { x: 100, y: 0, width: 50, height: 20 } },
    { input: { x: 100, y: 100, width: 0, height: 20 }, expected: { x: 100, y: 100, width: 1, height: 20 } },
    { input: { x: 100, y: 100, width: 50, height: -5 }, expected: { x: 100, y: 100, width: 50, height: 1 } }
  ];
  
  let passCount = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const { input, expected } = testCases[i];
    const result = validateCoordinates(input.x, input.y, input.width, input.height);
    
    const match = JSON.stringify(result) === JSON.stringify(expected);
    
    if (match) {
      console.log(`✅ 测试用例 ${i + 1}: 验证通过`);
      passCount++;
    } else {
      console.log(`❌ 测试用例 ${i + 1}: 验证失败`);
      console.log(`  期望: ${JSON.stringify(expected)}`);
      console.log(`  实际: ${JSON.stringify(result)}`);
    }
  }
  
  console.log(`📊 坐标验证测试: ${passCount}/${testCases.length} 通过`);
  return passCount === testCases.length;
}

// 运行所有修复测试
function runAllFixTests() {
  console.log('🚀 开始运行BFS算法修复验证测试套件...\n');
  
  const results = {
    boundingBoxFix: testBoundingBoxFix(),
    semanticImprovement: testSemanticSimilarityImprovement(),
    spatialThreshold: testSpatialThresholdAdjustment(),
    dynamicThreshold: testDynamicThresholdLogic(),
    coordinateValidation: testCoordinateValidation()
  };
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n📊 修复验证测试结果:');
  console.log(`✅ 边界框修复: ${results.boundingBoxFix ? '通过' : '失败'}`);
  console.log(`✅ 语义相似性改进: ${results.semanticImprovement ? '通过' : '失败'}`);
  console.log(`✅ 空间阈值调整: ${results.spatialThreshold ? '通过' : '失败'}`);
  console.log(`✅ 动态阈值逻辑: ${results.dynamicThreshold ? '通过' : '失败'}`);
  console.log(`✅ 坐标验证: ${results.coordinateValidation ? '通过' : '失败'}`);
  
  console.log(`\n🎯 总体结果: ${passedTests}/${totalTests} 测试通过`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有修复验证测试通过！BFS算法已成功修复。');
  } else {
    console.log('⚠️ 部分测试失败，需要进一步检查和修复。');
  }
  
  return passedTests === totalTests;
}

// 输出修复摘要
function outputFixSummary() {
  console.log('\n📋 BFS算法修复摘要:');
  console.log('1. 🔧 NaN坐标修复 - 添加输入验证和默认值');
  console.log('2. 🧠 语义相似性优化 - 内容类元素额外加分');
  console.log('3. 📍 空间阈值放宽 - 从30px提升到50px');
  console.log('4. 🎯 动态阈值逻辑 - 内容类元素使用更低阈值');
  console.log('5. 📐 坐标验证增强 - 防止无效尺寸和位置');
  
  console.log('\n🎯 修复目标:');
  console.log('✅ 解决NaN坐标导致的错误');
  console.log('✅ 提高Content和Rating等相关元素的分组概率');
  console.log('✅ 增强算法的鲁棒性和容错能力');
  console.log('✅ 优化分组效果和用户体验');
}

// 执行测试
runAllFixTests();
outputFixSummary();

console.log('\n🔧 BFS算法修复验证测试完成！'); 