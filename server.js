require('dotenv').config(); // 
const express = require('express');
const bot = require('./bot/index');

const app = express();
app.use(express.json());

// ቦቱን ለማስነሳት
bot.launch()
  .then(() => console.log('🚀 ቴሌግራም ቦት በተሳካ ሁኔታ ተነስቷል!'))
  .catch((err) => console.error('❌ የቦት ስህተት፦', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 ሰርቨር ፖርት ${PORT} ላይ ተነስቷል`);
});
