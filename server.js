const express = require('express');
const bot = require('./bot/index');

const app = express();
app.use(express.json());

// Render እንዳያጠፋው ማረጋገጫ
app.get('/', (req, res) => {
    res.send('Bot is running successfully!');
});

// ቦቱን ማስነሳት
bot.launch().then(() => {
    console.log('Bot started!');
}).catch((err) => {
    console.error('Bot error:', err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
