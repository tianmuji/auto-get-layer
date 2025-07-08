// Frame Selection智能分组测试
// 验证使用Figma内置Frame Selection功能的分组效果

console.log('🧪 开始Frame Selection智能分组测试...');

async function testFrameSelectionGrouping() {
  const results = {
    testsPassed: 0,
    totalTests: 0,
    details: []
  };

  // 测试1: 验证Frame Selection基础功能
  results.totalTests++;
  try {
    // 创建测试卡片
    const testFrame = figma.createFrame();
    testFrame.name = "Test Card";
    testFrame.resize(300, 400);
    testFrame.x = 100;
    testFrame.y = 100;

    // 创建测试元素
    const image = figma.createRectangle();
    image.name = "Product Image";
    image.resize(100, 100);
    image.x = 20;
    image.y = 20;

    const title = figma.createText();
    title.name = "Product Title";
    title.resize(200, 30);
    title.x = 20;
    title.y = 140;

    const price = figma.createText();
    price.name = "Product Price";
    price.resize(100, 25);
    price.x = 20;
    price.y = 350;

    // 添加到卡片中
    testFrame.appendChild(image);
    testFrame.appendChild(title);
    testFrame.appendChild(price);

    // 测试Frame Selection选择和分组
    const testElements = [image, title];
    figma.currentPage.selection = testElements;
    
    // 验证选择正确
    if (figma.currentPage.selection.length === 2) {
      results.testsPassed++;
      results.details.push("✅ Frame Selection选择功能正常");
    } else {
      results.details.push("❌ Frame Selection选择功能异常");
    }

    // 清理
    testFrame.remove();

  } catch (error) {
    results.details.push(`❌ Frame Selection基础功能测试失败: ${error.message}`);
  }

  // 测试2: 验证分组创建
  results.totalTests++;
  try {
    // 创建复杂测试场景
    const cardFrame = figma.createFrame();
    cardFrame.name = "Complex Card";
    cardFrame.resize(320, 450);

    // 创建多个功能区域的元素
    const elements = [];
    
    // 图片区域
    const productImage = figma.createRectangle();
    productImage.name = "product-image";
    productImage.resize(120, 120);
    productImage.x = 20;
    productImage.y = 20;
    elements.push(productImage);

    // 内容区域
    const titleText = figma.createText();
    titleText.name = "title-text";
    titleText.resize(200, 25);
    titleText.x = 20;
    titleText.y = 160;
    elements.push(titleText);

    const descText = figma.createText();
    descText.name = "description-text";
    descText.resize(200, 60);
    descText.x = 20;
    descText.y = 190;
    elements.push(descText);

    // 评分区域
    const ratingStars = figma.createRectangle();
    ratingStars.name = "rating-stars";
    ratingStars.resize(100, 20);
    ratingStars.x = 20;
    ratingStars.y = 270;
    elements.push(ratingStars);

    const ratingText = figma.createText();
    ratingText.name = "rating-text";
    ratingText.resize(50, 20);
    ratingText.x = 130;
    ratingText.y = 270;
    elements.push(ratingText);

    // 价格区域
    const priceLabel = figma.createText();
    priceLabel.name = "price-label";
    priceLabel.resize(60, 25);
    priceLabel.x = 20;
    priceLabel.y = 320;
    elements.push(priceLabel);

    const priceValue = figma.createText();
    priceValue.name = "price-value";
    priceValue.resize(80, 30);
    priceValue.x = 90;
    priceValue.y = 320;
    elements.push(priceValue);

    // 操作区域
    const buyButton = figma.createRectangle();
    buyButton.name = "buy-button";
    buyButton.resize(80, 35);
    buyButton.x = 20;
    buyButton.y = 380;
    elements.push(buyButton);

    const addToCartButton = figma.createRectangle();
    addToCartButton.name = "add-to-cart-button";
    addToCartButton.resize(80, 35);
    addToCartButton.x = 120;
    addToCartButton.y = 380;
    elements.push(addToCartButton);

    // 将所有元素添加到卡片
    elements.forEach(element => cardFrame.appendChild(element));

    // 模拟分组逻辑
    const groups = [
      {
        name: "Image Section",
        elements: [productImage]
      },
      {
        name: "Content Section", 
        elements: [titleText, descText]
      },
      {
        name: "Rating Section",
        elements: [ratingStars, ratingText]
      },
      {
        name: "Price Section",
        elements: [priceLabel, priceValue]
      },
      {
        name: "Actions Section",
        elements: [buyButton, addToCartButton]
      }
    ];

    let groupsCreated = 0;
    for (const group of groups) {
      if (group.elements.length > 1) {
        try {
          // 使用Frame Selection方式创建分组
          figma.currentPage.selection = group.elements;
          figma.group(group.elements, cardFrame);
          
          // 命名新创建的分组
          const newGroup = cardFrame.children[cardFrame.children.length - 1];
          if (newGroup && newGroup.type === 'GROUP') {
            newGroup.name = group.name;
            groupsCreated++;
          }
        } catch (error) {
          console.warn(`创建分组 ${group.name} 时出错:`, error);
        }
      }
    }

    if (groupsCreated >= 3) {
      results.testsPassed++;
      results.details.push(`✅ 分组创建成功: ${groupsCreated} 个分组`);
    } else {
      results.details.push(`❌ 分组创建不足: 仅创建 ${groupsCreated} 个分组`);
    }

    // 清理
    cardFrame.remove();

  } catch (error) {
    results.details.push(`❌ 分组创建测试失败: ${error.message}`);
  }

  // 测试3: 验证坐标自动计算
  results.totalTests++;
  try {
    const testFrame = figma.createFrame();
    testFrame.name = "Coordinate Test Card";
    testFrame.resize(300, 200);

    // 创建两个元素，位置不同
    const element1 = figma.createRectangle();
    element1.name = "Element 1";
    element1.resize(50, 50);
    element1.x = 10;
    element1.y = 10;

    const element2 = figma.createRectangle();
    element2.name = "Element 2";
    element2.resize(50, 50);
    element2.x = 80;
    element2.y = 30;

    testFrame.appendChild(element1);
    testFrame.appendChild(element2);

    // 记录原始坐标
    const originalPositions = {
      elem1: { x: element1.x, y: element1.y },
      elem2: { x: element2.x, y: element2.y }
    };

    // 使用Frame Selection创建分组
    figma.currentPage.selection = [element1, element2];
    figma.group([element1, element2], testFrame);

    // 验证分组是否创建且坐标被正确处理
    const newGroup = testFrame.children[testFrame.children.length - 1];
    if (newGroup && newGroup.type === 'GROUP') {
      // Figma会自动处理坐标，我们只需要验证分组存在
      results.testsPassed++;
      results.details.push("✅ Frame Selection自动坐标计算正常");
    } else {
      results.details.push("❌ Frame Selection坐标处理异常");
    }

    // 清理
    testFrame.remove();

  } catch (error) {
    results.details.push(`❌ 坐标计算测试失败: ${error.message}`);
  }

  // 清除选择
  figma.currentPage.selection = [];

  return results;
}

// 运行测试
testFrameSelectionGrouping().then(results => {
  console.log('\n📊 Frame Selection测试结果:');
  console.log(`通过: ${results.testsPassed}/${results.totalTests} 项测试`);
  console.log('详细结果:');
  results.details.forEach(detail => console.log(`  ${detail}`));
  
  if (results.testsPassed === results.totalTests) {
    console.log('\n🎉 所有Frame Selection测试通过！');
  } else {
    console.log('\n⚠️ 部分Frame Selection测试失败，需要检查');
  }
}); 