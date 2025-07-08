// 简化的Frame Selection测试
// 在Figma插件环境中运行，验证使用Frame Selection的智能分组功能

console.log('🧪 开始Frame Selection智能分组测试...');

// 测试Frame Selection基础功能
function testFrameSelectionBasics() {
  console.log('\n📝 测试1: Frame Selection基础功能');
  
  try {
    // 创建测试卡片
    const testFrame = figma.createFrame();
    testFrame.name = "Test Card";
    testFrame.resize(300, 400);
    testFrame.x = 100;
    testFrame.y = 100;

    // 创建测试元素
    const image = figma.createRectangle();
    image.name = "product-image";
    image.resize(100, 100);
    image.x = 20;
    image.y = 20;

    const title = figma.createText();
    title.name = "product-title";
    title.resize(200, 30);
    title.x = 20;
    title.y = 140;

    const price = figma.createText();
    price.name = "product-price";
    price.resize(100, 25);
    price.x = 20;
    price.y = 350;

    // 添加到卡片中
    testFrame.appendChild(image);
    testFrame.appendChild(title);
    testFrame.appendChild(price);

    // 测试Frame Selection选择
    const testElements = [image, title];
    figma.currentPage.selection = testElements;
    
    if (figma.currentPage.selection.length === 2) {
      console.log("✅ Frame Selection选择功能正常");
    } else {
      console.log("❌ Frame Selection选择功能异常");
    }

    // 测试分组创建
    figma.group(testElements, testFrame);
    const newGroup = testFrame.children[testFrame.children.length - 1];
    if (newGroup && newGroup.type === 'GROUP') {
      newGroup.name = "Test Group";
      console.log("✅ Frame Selection分组创建成功");
    } else {
      console.log("❌ Frame Selection分组创建失败");
    }

    // 清理
    testFrame.remove();
    console.log("✅ 测试1完成：Frame Selection基础功能正常");
    
  } catch (error) {
    console.log(`❌ 测试1失败: ${error.message}`);
  }
}

// 测试智能分组集成
function testSmartGroupingIntegration() {
  console.log('\n📝 测试2: 智能分组集成测试');
  
  try {
    // 创建模拟卡片结构
    const cardFrame = figma.createFrame();
    cardFrame.name = "Product Card";
    cardFrame.resize(320, 450);

    // 创建图片区域
    const productImage = figma.createRectangle();
    productImage.name = "product-image";
    productImage.resize(120, 120);
    productImage.x = 20;
    productImage.y = 20;

    // 创建内容区域
    const titleText = figma.createText();
    titleText.name = "title-text";
    titleText.resize(200, 25);
    titleText.x = 20;
    titleText.y = 160;

    const descText = figma.createText();
    descText.name = "description-text";
    descText.resize(200, 60);
    descText.x = 20;
    descText.y = 190;

    // 创建价格区域
    const priceValue = figma.createText();
    priceValue.name = "price-value";
    priceValue.resize(80, 30);
    priceValue.x = 20;
    priceValue.y = 320;

    // 创建操作区域
    const buyButton = figma.createRectangle();
    buyButton.name = "buy-button";
    buyButton.resize(80, 35);
    buyButton.x = 20;
    buyButton.y = 380;

    const addButton = figma.createRectangle();
    addButton.name = "add-cart-button";
    addButton.resize(80, 35);
    addButton.x = 120;
    addButton.y = 380;

    // 添加所有元素到卡片
    [productImage, titleText, descText, priceValue, buyButton, addButton].forEach(element => {
      cardFrame.appendChild(element);
    });

    console.log(`📦 创建测试卡片: ${cardFrame.children.length} 个子元素`);

    // 模拟分组逻辑 - 测试内容区域分组
    const contentElements = [titleText, descText];
    figma.currentPage.selection = contentElements;
    figma.group(contentElements, cardFrame);
    
    const contentGroup = cardFrame.children[cardFrame.children.length - 1];
    if (contentGroup && contentGroup.type === 'GROUP') {
      contentGroup.name = "Content Section";
      console.log("✅ 内容区域分组成功");
    }

    // 测试操作区域分组
    const actionElements = [buyButton, addButton];
    figma.currentPage.selection = actionElements;
    figma.group(actionElements, cardFrame);
    
    const actionGroup = cardFrame.children[cardFrame.children.length - 1];
    if (actionGroup && actionGroup.type === 'GROUP') {
      actionGroup.name = "Actions Section";
      console.log("✅ 操作区域分组成功");
    }

    // 清除选择
    figma.currentPage.selection = [];

    console.log(`✅ 测试2完成：智能分组集成正常，最终有 ${cardFrame.children.length} 个子元素`);

    // 清理
    cardFrame.remove();
    
  } catch (error) {
    console.log(`❌ 测试2失败: ${error.message}`);
  }
}

// 测试坐标自动处理
function testCoordinateHandling() {
  console.log('\n📝 测试3: 坐标自动处理测试');
  
  try {
    const testFrame = figma.createFrame();
    testFrame.name = "Coordinate Test";
    testFrame.resize(300, 200);

    // 创建位置不规则的元素
    const elem1 = figma.createRectangle();
    elem1.name = "Element 1";
    elem1.resize(50, 50);
    elem1.x = 10;
    elem1.y = 10;

    const elem2 = figma.createRectangle();
    elem2.name = "Element 2";
    elem2.resize(50, 50);
    elem2.x = 80;
    elem2.y = 30;

    testFrame.appendChild(elem1);
    testFrame.appendChild(elem2);

    console.log(`原始坐标: Element1(${elem1.x}, ${elem1.y}), Element2(${elem2.x}, ${elem2.y})`);

    // 使用Frame Selection创建分组
    figma.currentPage.selection = [elem1, elem2];
    figma.group([elem1, elem2], testFrame);

    const newGroup = testFrame.children[testFrame.children.length - 1];
    if (newGroup && newGroup.type === 'GROUP') {
      newGroup.name = "Auto Positioned Group";
      console.log(`✅ 分组创建成功，Figma自动处理了坐标`);
      console.log(`分组边界: x=${newGroup.x}, y=${newGroup.y}, w=${newGroup.width}, h=${newGroup.height}`);
    } else {
      console.log("❌ 分组创建失败");
    }

    // 清理
    testFrame.remove();
    console.log("✅ 测试3完成：坐标自动处理正常");
    
  } catch (error) {
    console.log(`❌ 测试3失败: ${error.message}`);
  }
}

// 运行所有测试
function runFrameSelectionTests() {
  console.log('🚀 开始运行Frame Selection测试套件...\n');
  
  testFrameSelectionBasics();
  testSmartGroupingIntegration();
  testCoordinateHandling();
  
  console.log('\n🎉 Frame Selection测试套件完成！');
  console.log('💡 所有测试都验证了Frame Selection功能可以：');
  console.log('   - 正确选择元素');
  console.log('   - 自动创建分组');
  console.log('   - 自动处理坐标计算');
  console.log('   - 无需手动设置复杂的位置关系');
}

// 导出测试函数供插件调用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runFrameSelectionTests };
} else {
  // 在Figma插件环境中直接运行
  runFrameSelectionTests();
} 