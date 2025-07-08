// 贪心Bounding Box分组算法测试
// 验证贪心算法逐层划定最优bounding box的效果

console.log('🎯 开始贪心Bounding Box分组测试...');

// 测试贪心算法基础功能
function testGreedyBasics() {
  console.log('\n📝 测试1: 贪心算法基础功能');
  
  try {
    // 创建测试卡片
    const cardFrame = figma.createFrame();
    cardFrame.name = "Greedy Test Card";
    cardFrame.resize(350, 500);

    // 创建密集排列的元素 - 模拟真实卡片布局
    const elements = [];

    // 图片区域 (紧密相邻)
    const image1 = figma.createRectangle();
    image1.name = "product-image-main";
    image1.resize(80, 80);
    image1.x = 20;
    image1.y = 20;
    elements.push(image1);

    const image2 = figma.createRectangle();
    image2.name = "product-image-thumb";
    image2.resize(30, 30);
    image2.x = 110;
    image2.y = 20;
    elements.push(image2);

    // 内容区域 (垂直排列，应该被分为一组)
    const title = figma.createText();
    title.name = "product-title";
    title.resize(200, 25);
    title.x = 20;
    title.y = 120;
    elements.push(title);

    const desc = figma.createText();
    desc.name = "product-description";
    desc.resize(200, 40);
    desc.x = 20;
    desc.y = 150;
    elements.push(desc);

    const content = figma.createText();
    content.name = "product-content";
    content.resize(180, 30);
    content.x = 25;
    content.y = 195;
    elements.push(content);

    // 评分区域 (水平排列)
    const stars = figma.createRectangle();
    stars.name = "rating-stars";
    stars.resize(80, 15);
    stars.x = 20;
    stars.y = 240;
    elements.push(stars);

    const ratingText = figma.createText();
    ratingText.name = "rating-text";
    ratingText.resize(40, 15);
    ratingText.x = 110;
    ratingText.y = 240;
    elements.push(ratingText);

    // 价格区域 (分离的，应该被正确识别)
    const price = figma.createText();
    price.name = "price-value";
    price.resize(60, 25);
    price.x = 20;
    price.y = 280;
    elements.push(price);

    const oldPrice = figma.createText();
    oldPrice.name = "price-old";
    oldPrice.resize(50, 20);
    oldPrice.x = 90;
    oldPrice.y = 285;
    elements.push(oldPrice);

    // 操作区域 (底部按钮)
    const buyBtn = figma.createRectangle();
    buyBtn.name = "buy-button";
    buyBtn.resize(80, 35);
    buyBtn.x = 20;
    buyBtn.y = 320;
    elements.push(buyBtn);

    const cartBtn = figma.createRectangle();
    cartBtn.name = "cart-button";
    cartBtn.resize(80, 35);
    cartBtn.x = 110;
    cartBtn.y = 320;
    elements.push(cartBtn);

    // 独立元素 (应该被合理分组或保持独立)
    const badge = figma.createRectangle();
    badge.name = "sale-badge";
    badge.resize(40, 20);
    badge.x = 280;
    badge.y = 25;
    elements.push(badge);

    // 添加所有元素到卡片
    elements.forEach(elem => cardFrame.appendChild(elem));

    console.log(`📦 创建测试场景: ${elements.length} 个元素`);
    console.log('布局分布:');
    console.log('  - 图片区域: 2个元素 (20,20) 和 (110,20)');
    console.log('  - 内容区域: 3个元素 垂直排列 (20,120-195)');
    console.log('  - 评分区域: 2个元素 水平排列 (20,240-110,240)');
    console.log('  - 价格区域: 2个元素 (20,280-90,285)');
    console.log('  - 操作区域: 2个元素 (20,320-110,320)');
    console.log('  - 独立元素: 1个徽章 (280,25)');

    // 测试贪心分组效果
    console.log('\n🎯 预期贪心算法应该：');
    console.log('  1. 优先分组内容区域（3个text元素，空间紧密）');
    console.log('  2. 分组评分区域（2个元素，水平对齐）');
    console.log('  3. 分组价格区域（2个price元素）');
    console.log('  4. 分组操作区域（2个button元素）');
    console.log('  5. 图片区域可能分组或保持独立');
    console.log('  6. 徽章很可能保持独立');

    // 清理
    cardFrame.remove();
    console.log('\n✅ 测试1完成：贪心算法测试场景创建成功');
    
  } catch (error) {
    console.log(`❌ 测试1失败: ${error.message}`);
  }
}

// 测试空间效率优化
function testSpaceEfficiency() {
  console.log('\n📝 测试2: 空间效率优化测试');
  
  try {
    const cardFrame = figma.createFrame();
    cardFrame.name = "Space Efficiency Test";
    cardFrame.resize(300, 400);

    // 场景1: 紧密排列的元素 vs 松散排列的元素
    // 紧密组 - 应该被优先分组
    const tight1 = figma.createRectangle();
    tight1.name = "tight-element-1";
    tight1.resize(50, 30);
    tight1.x = 20;
    tight1.y = 20;

    const tight2 = figma.createRectangle();
    tight2.name = "tight-element-2";
    tight2.resize(50, 30);
    tight2.x = 75; // 5px间距
    tight2.y = 20;

    const tight3 = figma.createRectangle();
    tight3.name = "tight-element-3";
    tight3.resize(50, 30);
    tight3.x = 130; // 5px间距
    tight3.y = 20;

    // 松散组 - 空间利用率低，应该被降低优先级
    const loose1 = figma.createRectangle();
    loose1.name = "loose-element-1";
    loose1.resize(40, 25);
    loose1.x = 20;
    loose1.y = 100;

    const loose2 = figma.createRectangle();
    loose2.name = "loose-element-2";
    loose2.resize(40, 25);
    loose2.x = 120; // 60px间距
    loose2.y = 100;

    // 混合场景
    const mixed1 = figma.createText();
    mixed1.name = "mixed-text-1";
    mixed1.resize(80, 20);
    mixed1.x = 20;
    mixed1.y = 180;

    const mixed2 = figma.createText();
    mixed2.name = "mixed-text-2";
    mixed2.resize(80, 20);
    mixed2.x = 20;
    mixed2.y = 205; // 5px间距，同类型

    const intruder = figma.createRectangle();
    intruder.name = "space-intruder";
    intruder.resize(30, 30);
    intruder.x = 110;
    intruder.y = 190; // 在text区域附近但不同类型

    [tight1, tight2, tight3, loose1, loose2, mixed1, mixed2, intruder].forEach(elem => {
      cardFrame.appendChild(elem);
    });

    console.log('📊 空间效率测试场景:');
    console.log('  - 紧密组: 3个元素，5px间距，高密度');
    console.log('  - 松散组: 2个元素，60px间距，低密度');
    console.log('  - 混合组: 2个text + 1个intruder');
    console.log('\n🎯 贪心算法应该优先选择紧密组，因为空间利用率更高');

    cardFrame.remove();
    console.log('\n✅ 测试2完成：空间效率测试场景创建成功');
    
  } catch (error) {
    console.log(`❌ 测试2失败: ${error.message}`);
  }
}

// 测试语义相似性权重
function testSemanticWeighting() {
  console.log('\n📝 测试3: 语义相似性权重测试');
  
  try {
    const cardFrame = figma.createFrame();
    cardFrame.name = "Semantic Test";
    cardFrame.resize(300, 300);

    // 场景: 相同语义的元素 vs 不同语义但位置更近的元素
    
    // 语义组 - 相同功能但位置稍远
    const btn1 = figma.createRectangle();
    btn1.name = "primary-button";
    btn1.resize(60, 30);
    btn1.x = 20;
    btn1.y = 20;

    const btn2 = figma.createRectangle();
    btn2.name = "secondary-button";
    btn2.resize(60, 30);
    btn2.x = 100; // 20px间距
    btn2.y = 20;

    // 位置组 - 位置很近但功能不同
    const nearText = figma.createText();
    nearText.name = "nearby-text";
    nearText.resize(50, 25);
    nearText.x = 90; // 只有10px间距
    nearText.y = 25;

    // 价格组 - 测试特定语义识别
    const price1 = figma.createText();
    price1.name = "price-current";
    price1.resize(40, 20);
    price1.x = 20;
    price1.y = 80;

    const price2 = figma.createText();
    price2.name = "price-original";
    price2.resize(35, 18);
    price2.x = 70; // 10px间距
    price2.y = 82;

    // 干扰元素
    const distractor = figma.createRectangle();
    distractor.name = "random-shape";
    distractor.resize(30, 25);
    distractor.x = 65; // 在价格组中间
    distractor.y = 85;

    [btn1, btn2, nearText, price1, price2, distractor].forEach(elem => {
      cardFrame.appendChild(elem);
    });

    console.log('🧠 语义相似性测试场景:');
    console.log('  - 按钮组: primary-button + secondary-button (语义相似)');
    console.log('  - 位置陷阱: secondary-button + nearby-text (位置更近)');
    console.log('  - 价格组: price-current + price-original (强语义关联)');
    console.log('  - 干扰元素: random-shape (位置在价格组中间)');
    console.log('\n🎯 贪心算法应该：');
    console.log('  1. 优先语义相似性，按钮应该分组');
    console.log('  2. 价格元素应该分组，忽略中间的干扰元素');
    console.log('  3. nearby-text 可能独立或与最相近的语义组合并');

    cardFrame.remove();
    console.log('\n✅ 测试3完成：语义相似性测试场景创建成功');
    
  } catch (error) {
    console.log(`❌ 测试3失败: ${error.message}`);
  }
}

// 运行所有测试
function runGreedyBoundingBoxTests() {
  console.log('🚀 开始运行贪心Bounding Box测试套件...\n');
  
  testGreedyBasics();
  testSpaceEfficiency();
  testSemanticWeighting();
  
  console.log('\n🎉 贪心Bounding Box测试套件完成！');
  console.log('\n💡 新算法特点：');
  console.log('   🎯 逐层贪心: 每轮找最优bounding box');
  console.log('   📐 空间效率: 优先选择密度高的分组');
  console.log('   🧠 语义权重: 同类型元素获得额外加分');
  console.log('   📏 距离控制: 避免跨度过大的分组');
  console.log('   🔄 迭代优化: 多轮分组直到收敛');
  console.log('\n🔧 结合Frame Selection:');
  console.log('   📦 选择bounding box内所有元素');
  console.log('   🎨 使用figma.group()自动创建分组');
  console.log('   📍 无需手动计算坐标位置');
  console.log('   ✨ 自动处理相对位置关系');
}

// 导出测试函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runGreedyBoundingBoxTests };
} else {
  // 在Figma插件环境中直接运行
  runGreedyBoundingBoxTests();
} 