const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');

// 🔐 ቦት ቶከን እና አድሚን ID
const bot = new Telegraf('8826380353:AAGrTjck3CHUqN6xH-tatncF6BoOllNy7_4');
const ADMIN_ID = '7799176748';

// 🌐 የ MongoDB Atlas ኦንላይን ዳታቤዝ ሊንክ
const MONGO_URI = 'mongodb+srv://ghenok025_db_user:ghen0k061616@cluster0.isafalq.mongodb.net/myshopbot?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => console.log('📁 MongoDB Atlas (Cloud) ዳታቤዝ በተሳካ ሁኔታ ተገናኝቷል!'))
  .catch(err => console.error('Database connection error:', err));

// 📝 የእቃ ሞዴል (Product Schema)
const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  image: String, 
  vendorId: String
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// 🔄 የገዢዎች ስቴት፣ ካርቶን እና የሻጭ ሂሳብ
const userStates = {};
const carts = {}; 
const vendorWallets = {}; 

// 🧮 የኮሚሽን ስሌት
function calculateCommission(price) {
  let rate = 0.035; 
  if (price >= 4500) rate = 0.049; 
  else if (price >= 3500) rate = 0.042; 
  
  const myCommission = Math.round(price * rate);
  const vendorShare = price - myCommission;
  return { myCommission, vendorShare, ratePercent: (rate * 100).toFixed(1) };
}

// 🎛️ ዋናው ማውጫ (Inline Buttons)
function getMainKeyboard(isAdmin) {
  const keyboard = [
    [
      { text: '🛍️ ሱቅ ግባ (Shop)', callback_data: 'shop' },
      { text: '🛒 ካርቶን (Cart)', callback_data: 'cart' }
    ],
    [
      { text: '📦 ትዕዛዞች (Orders)', callback_data: 'orders' },
      { text: '👤 ፕሮፋይል (Profile)', callback_data: 'profile' }
    ],
    [
      { text: '📞 ድጋፍ (Support)', callback_data: 'support' },
      { text: '📉 የእኔ ሂሳብ (Wallet)', callback_data: 'vendor_wallet' }
    ]
  ];
  if (isAdmin) {
    keyboard.push([{ text: '📊 የሻጮች ዝርዝር (Admin)', callback_data: 'admin_vendors' }]);
    keyboard.push([
      { text: '➕ እቃ ጨምር (Admin)', callback_data: 'add_item' },
      { text: '🗑️ እቃ አጥፋ (Admin)', callback_data: 'delete_item' }
    ]);
  }
  return { inline_keyboard: keyboard };
}

// 🚀 ቦቱ ሲነሳ
bot.start(async (ctx) => {
  const isAdmin = ctx.from.id.toString() === ADMIN_ID;
  await ctx.reply(`👋 እንኳን ወደ መገበያያ ቦታችን በሰላም መጡ!\n\nለመጠቀም ከታች ያሉትን በተኖች ይጫኑ፦`, {
    reply_markup: getMainKeyboard(isAdmin)
  });
});

// 🛍️ 1. ሱቅ (Shop) ክፍል
bot.action('shop', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch(e) { console.log("Callback timeout ignored"); }
  try {
    const dbProducts = await Product.find({});
    if (dbProducts.length === 0) {
      return ctx.reply('🛍️ በአሁኑ ሰዓት በሱቁ ውስጥ ምንም እቃ የለም!', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 ወደ ዋናው ገጽ', callback_data: 'back_main' }]] }
      });
    }

    await ctx.reply('🛍️ *በሱቃችን ያሉ እቃዎች ዝርዝር ከታች ቀርቧል፦*', { parse_mode: 'Markdown' });

    for (const p of dbProducts) {
      let msg = `🔹 *${p.name}*\n💰 *ዋጋ:* ${p.price} ብር\n📝 *መግለጫ:* ${p.description}`;
      const keyboard = [
        [{ text: `🛒 ${p.name} ለመግዛት`, callback_data: `buy_${p._id}` }]
      ];

      if (p.image) {
        await ctx.replyWithPhoto(p.image, { caption: msg, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
      } else {
        await ctx.replyWithMarkdown(msg, { reply_markup: { inline_keyboard: keyboard } });
      }
    }

    await ctx.reply('👇 ወደ ዋናው ማውጫ ለመመለስ፦', {
      reply_markup: { inline_keyboard: [[{ text: '🔙 ወደ ዋናው ገጽ', callback_data: 'back_main' }]] }
    });

  } catch (err) {
    await ctx.reply('⚠️ እቃዎችን ከዳታቤዝ ላይ ማንበብ አልተቻለም።');
  }
});

// 🛒 እቃ ወደ ካርቶን መጨመር
bot.action(/^buy_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  try {
    const product = await Product.findById(productId);
    const userId = ctx.from.id;
    
    if (!product) {
      try { await ctx.answerCbQuery('እቃው አልተገኘም! ❌'); } catch(e) {}
      return;
    }
    
    if (!carts[userId]) carts[userId] = [];
    carts[userId].push(product);
    
    try { await ctx.answerCbQuery(`${product.name} ወደ ካርቶን ገብቷል! 🛒`); } catch(e) {}
    await ctx.reply(`✅ *${product.name}* በተሳካ ሁኔታ ወደ ካርቶንዎ ተጨምሯል።`, {
      reply_markup: { inline_keyboard: [[{ text: '🛒 ካርቶን ማየት', callback_data: 'cart' }], [{ text: '🛍️ መገበያየት ቀጥል', callback_data: 'shop' }]] }
    });
  } catch (err) {
    try { await ctx.answerCbQuery('ስህተት አጋጥሟል! ❌'); } catch(e) {}
  }
});

// ➕ 2. እቃ መጨመሪያ (Add Item)
bot.action('add_item', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch(e) {}
  if (ctx.from.id.toString() !== ADMIN_ID) return;

  userStates[ctx.from.id] = { step: 'ADD_NAME' };
  await ctx.reply('✏️ እባክዎ ሊጨምሩት የፈለጉትን *የእቃውን ስም* ይጻፉልኝ፦');
});

// 🗑️ 3. እቃ ማጥፊያ (Delete Item)
bot.action('delete_item', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch(e) {}
  if (ctx.from.id.toString() !== ADMIN_ID) return;

  try {
    const dbProducts = await Product.find({});
    if (dbProducts.length === 0) return ctx.reply('ለማጥፋት ምንም እቃ በሱቁ ውስጥ የለም።');

    let msg = `🗑 *ለማጥፋት የሚፈልጉትን እቃ በተን ይጫኑ፦*\n\n`;
    const keyboard = [];
    dbProducts.forEach(p => {
      keyboard.push([{ text: `❌ አጥፋ፦ ${p.name}`, callback_data: `del_${p._id}` }]);
    });
    keyboard.push([{ text: '🔙 ዋና ገጽ', callback_data: 'back_main' }]);
    
    await ctx.reply(msg, { reply_markup: { inline_keyboard: keyboard } });
  } catch (err) {
    await ctx.reply('እቃዎችን ማምጣት አልተቻለም።');
  }
});

bot.action(/^del_(.+)$/, async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const productId = ctx.match[1];
  try {
    await Product.findByIdAndDelete(productId);
    try { await ctx.answerCbQuery('እቃው ጠፍቷል! 🗑️'); } catch(e) {}
    await ctx.reply('✅ እቃው ከ MongoDB ዳታቤዝ ላይ ሙሉ በሙሉ ተሰርዟል።');
  } catch (err) {
    try { await ctx.answerCbQuery('ማጥፋት አልተቻለም ❌'); } catch(e) {}
  }
});

// 🛒 4. ካርቶን ማሳያ (Cart)
bot.action('cart', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch(e) {}
  const userId = ctx.from.id;
  const userCart = carts[userId] || [];
  
  if (userCart.length === 0) {
    return ctx.reply('🛒 የእርስዎ ካርቶን በአሁኑ ሰዓት ባዶ ነው!', {
      reply_markup: { inline_keyboard: [[{ text: '🛍️ ሱቅ ግባ', callback_data: 'shop' }]] }
    });
  }
  
  let msg = `🛒 *የእርስዎ ካርቶን ውስጥ ያሉ እቃዎች፦*\n\n`;
  let total = 0;
  userCart.forEach((item, index) => {
    msg += `${index + 1}. *${item.name}* - ${item.price} ብር\n`;
    total += item.price;
  });
  msg += `\n💵 *ጠቅላላ ድምር:* ${total} ብር`;
  
  await ctx.replyWithMarkdown(msg, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '💳 አሁን ክፍያ ፈጽም (Checkout)', callback_data: 'pay_online' }],
        [{ text: '🗑️ ካርቶን አጽዳ', callback_data: 'clear_cart' }],
        [{ text: '🔙 ወደ ዋናው ገጽ', callback_data: 'back_main' }]
      ]
    }
  });
});

bot.action('clear_cart', async (ctx) => {
  carts[ctx.from.id] = [];
  try { await ctx.answerCbQuery('ካርቶንዎ ጸድቷል! 🗑️'); } catch(e) {}
  await ctx.reply('🛒 ካርቶንዎ ሙሉ በሙሉ ተለቋል።', { reply_markup: getMainKeyboard(ctx.from.id.toString() === ADMIN_ID) });
});

// 💳 5. የክፍያ ሂደት
bot.action('pay_online', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch(e) {}
  const userId = ctx.from.id;
  const userCart = carts[userId] || [];
  
  if (userCart.length === 0) return ctx.reply('ማዘዝ ከመጀመርዎ በፊት እባክዎ እቃ ወደ ካርቶን ይጨምሩ።');
  
  const totalPrice = userCart.reduce((sum, item) => sum + item.price, 0);
  const mainProduct = userCart[0]; 
  
  userStates[userId] = { step: 'AWAITING_PHONE', price: totalPrice, vendorId: mainProduct.vendorId || ADMIN_ID };
  
  await ctx.reply('📞 እባክዎ እቃው ሲደርስ የሚደወልበትን ስልክ ቁጥር ከታች ያለውን ሰማያዊ በተን ተጭነው ያጋሩን፦', 
    Markup.keyboard([
      [Markup.button.contactRequest('📱 ስልክ ቁጥሬን አጋራ (Share Contact)')]
    ]).oneTime().resize()
  );
});

// 📱 6. ስልክ ቁጥር ሲላክ (Contact handler)
bot.on('contact', async (ctx) => {
  const userId = ctx.from.id;
  const state = userStates[userId];

  if (!state || state.step !== 'AWAITING_PHONE') return;

  userStates[userId].phoneNumber = ctx.message.contact.phone_number;
  userStates[userId].step = 'AWAITING_RECEIPT';

  const paymentMsg = `🏦 *የስልክ ቁጥርዎ ተመዝግቧል! አሁን ክፍያውን ከታች ባሉት አካውንቶች በአንዱ ይፈጽሙ፦*\n\n` +
                     `🔹 *የኢትዮጵያ ንግድ ባንክ (CBE):*\n` +
                     `📍 \`1000366964561\`\n` +
                     `👤 *ስም:* Henok Getu\n\n` +
                     `🔹 *ቴሌብር (Telebirr):*\n` +
                     `📍 \`0985801738\`\n` +
                     `👤 *ስም:* Henok Getu\n\n` +
                     `💰 *የሚከፍሉት ጠቅላላ ዋጋ:* ${state.price} ብር\n\n` +
                     `📌 *ማሳሰቢያ:* ክፍያውን እንደከፈሉ *የደረሰኝ ፎቶ (Screenshot)* እዚህ ቦቱ ላይ ይላኩ።`;
  
  await ctx.replyWithMarkdown(paymentMsg, Markup.removeKeyboard());
});

// 📝 7. የጽሑፍ መልክቶችን መቀበያ
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const state = userStates[userId];

  if (!state) return;

  if (state.step === 'ADD_NAME') {
    userStates[userId].name = ctx.message.text;
    userStates[userId].step = 'ADD_PRICE';
    return ctx.reply('💵 አሁን ደግሞ *የእቃውን ዋጋ* በቁጥር ብቻ ይጻፉልኝ (ምሳሌ፦ 3500)፦');
  }

  if (state.step === 'ADD_PRICE') {
    const price = parseInt(ctx.message.text);
    if (isNaN(price)) return ctx.reply('⚠️ እባክዎ ዋጋውን በቁጥር ብቻ በትክክል ይጻፉ!');
    userStates[userId].price = price;
    userStates[userId].step = 'ADD_DESC';
    return ctx.reply('📝 አሁን ደግሞ *ስለ እቃው አጭር መግለጫ/Description* ይጻፉልኝ፦');
  }

  if (state.step === 'ADD_DESC') {
    userStates[userId].description = ctx.message.text;
    userStates[userId].step = 'ADD_IMAGE';
    return ctx.reply('📸 በስተመጨረሻ *የእቃውን ፎቶ* እዚህ ላይ ይላኩ ወይም Forward ያድርጉልኝ፦');
  }
});

// 📸 8. የፎቶ መልእክቶችን መቀበያ
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const state = userStates[userId];
  
  if (!state) return;

  if (state.step === 'ADD_IMAGE') {
    const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    try {
      const newProduct = new Product({
        name: state.name,
        price: state.price,
        description: state.description,
        image: photoId, 
        vendorId: ADMIN_ID
      });
      
      await newProduct.save();
      delete userStates[userId];
      await ctx.reply(`🎉 *${newProduct.name}* ከነፎቶው በተሳካ ሁኔታ ወደ MongoDB Atlas ተጨምሮ ሱቅ ላይ ወጥቷል!`);
    } catch (err) {
      await ctx.reply('⚠️ እቃውን በዳታቤዝ ላይ ለመመዝገብ ስህተት ተፈጥሯል።');
    }
    return;
  }

  if (state.step === 'AWAITING_RECEIPT') {
    const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const itemPrice = state.price;
    const vendorId = state.vendorId;
    const userPhone = state.phoneNumber || "ያልተገኘ";
    
    const sheet = calculateCommission(itemPrice);
    
    await ctx.telegram.sendPhoto(ADMIN_ID, photoId, {
      caption: `🔔 *አዲስ የባንክ ክፍያ ደረሰኝ ደርሷል!*\n\n` +
               `👤 *ከገዢው:* ${ctx.from.first_name} (ID: ${userId})\n` +
               `📱 *ስልክ ቁጥር:* \`${userPhone}\`\n` + 
               `💰 *የእቃው ዋጋ:* ${itemPrice} ብር\n` +
               `📈 *ያንተ ኮሚሽን (${sheet.ratePercent}%):* ${sheet.myCommission} ብር\n` +
               `💸 *ለሻጩ የሚቀረው:* ${sheet.vendorShare} ብር\n\n` +
               `እባክዎ ባንክዎን አይተው ክፍያውን ያረጋግጡ፦`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ ፍቀድ (Approve)', callback_data: `approve_pay:${userId}:${vendorId}:${sheet.vendorShare}` },
            { text: '❌ ውድቅ አድርግ (Reject)', callback_data: `reject_pay:${userId}` }
          ]
        ]
      }
    });
    await ctx.reply('🙏 ማረጋገጫው ደርሶናል። ክፍያውን ፈትሸን እስክናረጋግጥ ድረስ እባክዎ በትዕግስት ይጠብቁን።');
    userStates[userId].step = null;
  }
});

// 👑 9. የአድሚን ውሳኔ (Approve/Reject)
bot.action(/^approve_pay:(.+):(.+):(.+)$/, async (ctx) => {
  const buyerId = ctx.match[1];
  const vendorId = ctx.match[2];
  const vendorShare = parseInt(ctx.match[3]);
  
  if (!vendorWallets[vendorId]) vendorWallets[vendorId] = 0;
  vendorWallets[vendorId] += vendorShare; 
  carts[buyerId] = []; 
  
  try { await ctx.answerCbQuery('ክፍያው ጸድቋል! ✅'); } catch(e) {}
  try { await ctx.editMessageCaption(`${ctx.callbackQuery.message.caption}\n\n✅ ይህ ክፍያ በአድሚን ተረጋግጦ ጽድቋል። ${vendorShare} ብር ለሻጭ ሂሳብ ላይ ተደምሯል።`); } catch(e) {}
  await ctx.telegram.sendMessage(buyerId, '🎉 *መልካም ዜና!* የላኩት ክፍያ በተሳካ ሁኔታ ተረጋግጧል። እቃዎን በፍጥነት ለማድረስ ወደ እርስዎ ስልክ እንደውላለን። እናመሰግናለን!');
});

bot.action(/^reject_pay:(.+)$/, async (ctx) => {
  const buyerId = ctx.match[1];
  try { await ctx.answerCbQuery('ክፍያው ውድቅ ተደርጓል! ❌'); } catch(e) {}
  try { await ctx.editMessageCaption(`${ctx.callbackQuery.message.caption}\n\n❌ ይህ ክፍያ ሀሰተኛ/የተሳሳተ በመሆኑ ውድቅ ተደርጓል።`); } catch(e) {}
  await ctx.telegram.sendMessage(buyerId, '⚠️ *አዝናለን!* የላኩት የክፍያ ደረሰኝ ሊረጋገጥ አልቻለም። እባክዎ ትክክለኛውን ደረሰኝ እንደገና ይላኩ方案。');
});

// 📉 10. የሻጭ ሂሳብ (Wallet)
bot.action('vendor_wallet', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch(e) {}
  const vendorId = ctx.from.id.toString();
  const currentBalance = vendorWallets[vendorId] || 0;
  
  const msg = `📉 *የእርስዎ የሻጭ ሂሳብ መግለጫ፦*\n\n` +
              `💵 *በዚህ ሳምንት ለእርስዎ የሚላክ ንጹሕ ብር:* ${currentBalance} ብር\n\n` +
              `📌 *ማሳሰቢያ:* ሂሳብዎ በየሳምንቱ መጨረሻ በአድሚኑ በኩል በባንክ ወይም በቴሌብር ይላክልዎታል።`;
  await ctx.replyWithMarkdown(msg, {
    reply_markup: { inline_keyboard: [[{ text: '🔄 ሂሳብ አድስ (Refresh)', callback_data: 'vendor_wallet' }], [{ text: '🔙 ዋና ገጽ', callback_data: 'back_main' }]] }
  });
});

// 📊 11. አድሚን የሻጮችን የክፍያ ዝርዝር የሚያይበት
bot.action('admin_vendors', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch(e) {}
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  
  let msg = `📊 *የሻጮች የሳምንት የክፍያ ዝርዝር መግለጫ፦*\n\n`;
  const keys = Object.keys(vendorWallets);
  if (keys.length === 0) msg += `የተመዘገበ የሻጭ የክፍያ ታሪክ የለም。`;
  
  keys.forEach((vId, idx) => {
    msg += `${idx + 1}. 👤 *ሻጭ (ID: ${vId}):* 💰 ${vendorWallets[vId]} ብር ክፍያ ይጠብቃል\n`;
  });
  
  await ctx.replyWithMarkdown(msg, {
    reply_markup: { inline_keyboard: [[{ text: '🔙 ወደ ዋናው ገጽ', callback_data: 'back_main' }]] }
  });
});

// 📦 12. ሌሎች በተኖች
bot.action('orders', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch(e) {}
  await ctx.reply('📦 *የእርስዎ የትዕዛዝ ታሪክ፦*\n\nበአሁኑ ሰዓት ምንም የታዘዘ እቃ የለም።', { reply_markup: { inline_keyboard: [[{ text: '🔙 ዋና ገጽ', callback_data: 'back_main' }]] } });
});

bot.action('profile', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch(e) {}
  await ctx.reply(`👤 *የእርስዎ ፕሮፋይል መረጃ፦*\n\n🏷️ ስም: ${ctx.from.first_name}\n🆔 ID: ${ctx.from.id}`, { reply_markup: { inline_keyboard: [[{ text: '🔙 ዋና ገጽ', callback_data: 'back_main' }]] } });
});

bot.action('support', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch(e) {}
  await ctx.reply('📞 *የደንበኞች አገልግሎት እገዛ ጥያቄ፦*\n\nእባክዎን ማንኛውንም አይነት ችግር ወይም ጥያቄ ለአድሚኑ @TH74h ላኩ።', { reply_markup: { inline_keyboard: [[{ text: '🔙 ዋና ገጽ', callback_data: 'back_main' }]] } });
});

bot.action('back_main', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch(e) {}
  const isAdmin = ctx.from.id.toString() === ADMIN_ID;
  await ctx.reply('ዋና ገጽ ተመልሰዋል፦', { reply_markup: getMainKeyboard(isAdmin) });
});

// ⚠️ ማንኛውንም አይነት ያልተጠበቀ ስህተት (Timeout ጨምሮ) ለመያዝ እና ቦቱ እንዳይቆም ለማድረግ
process.on('unhandledRejection', (reason, promise) => {
  console.log('🤖 ስህተት በሰላም ታልፏል (Unhandled Rejection):', reason);
});

bot.launch().then(() => console.log('🚀 ቦቱ ከ MongoDB Atlas ጋር በተሳካ ሁኔታ ተነስቷል!'));
