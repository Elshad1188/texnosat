
const fs = require('fs');

async function testRegexes() {
  const url = 'https://www.temu.com/search_result.html?search_key=smartphone';
  console.log('Fetching', url);
  
  // Use a mock HTML or fetch if available. Since I am in a restricted environment, 
  // I will assume the assistant can run this script if I provide it.
  // Actually, I'll use a sample HTML snippet from the browser subagent's findings.
  
  const sampleHtml = `
    <div role="group" class="Ois68FAW _3qGJLBpe _2Y2Y4-8H GLHvMp17">
      <a href="/goods.html?goods_id=123" class="_2Tl9qLr1 _1ak1dai3">Samsung Galaxy S23</a>
      <div class="price">₼ 1,200.00</div>
      <img src="https://img.kwcdn.com/thumb.jpg" />
    </div>
    <div role="group" class="Ois68FAW _3qGJLBpe _2Y2Y4-8H GLHvMp17">
      <a href="/goods.html?goods_id=456" class="_2Tl9qLr1 _1ak1dai3">iPhone 15 Pro</a>
      <div class="price">₼ 2,549.99</div>
      <img src="https://img.kwcdn.com/thumb2.jpg" />
    </div>
  `;

  const cardSplitPatterns = [
    /role="group"/,
    /class="[^"]*_2rn4tSF[^"]*"/,
    /class="[^"]*product-card[^"]*"/,
    /class="[^"]*goods-card[^"]*"/,
    /class="[^"]*_1MOSpMz[^"]*"/,
    /data-goods-id="/,
  ];

  let blocks = [];
  for (const pattern of cardSplitPatterns) {
    const parts = sampleHtml.split(pattern).slice(1);
    if (parts.length > 0) {
      blocks = parts;
      console.log('Matched pattern:', pattern);
      break;
    }
  }

  console.log('Found', blocks.length, 'blocks');

  for (const block of blocks) {
    const chunk = block.substring(0, 5000);
    const titleMatch = chunk.match(/title="([^"]{5,})"/) || 
                      chunk.match(/aria-label="([^"]{5,})"/) ||
                      chunk.match(/alt="([^"]{5,})"/) ||
                      chunk.match(/class="[^"]*(?:_2Tl9qLr1|_1ak1dai3)[^"]*"[^>]*>([^<]+)/);
    
    const priceMatch = chunk.match(/[\$€₼]\s*([\d.,\s]+)/) || 
                      chunk.match(/([\d.,\s]+)\s*[\$€₼₼]/) ||
                      chunk.match(/([\d.,\s]+)\s*AZN/);

    console.log('---');
    console.log('Title:', titleMatch ? titleMatch[1] || titleMatch[2] : 'MISSING');
    console.log('Price:', priceMatch ? priceMatch[1] : 'MISSING');
  }
}

testRegexes();
