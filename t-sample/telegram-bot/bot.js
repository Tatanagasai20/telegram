const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

// Bot token from environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;

// API URL
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });

console.log('Telegram Attendance Bot is running...');

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  const firstName = msg.from.first_name;
  
  bot.sendMessage(
    chatId,
    `Hello ${firstName}! 👋\n\nI'm your attendance tracking bot. You can use the following commands:\n\n/login - Check in for work\n/logout - Check out from work\n/status - Check your current status\n/help - Show available commands`
  );
});

// Handle /help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(
    chatId,
    `*Available Commands:*\n\n/login - Check in for work\n/logout - Check out from work\n/status - Check your current status\n/help - Show this help message`,
    { parse_mode: 'Markdown' }
  );
});

// Handle /login command (check-in)
bot.onText(/\/login/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();
  const firstName = msg.from.first_name;
  
  try {
    // Call the API to record check-in
    const response = await axios.post(`${API_URL}/attendance/check-in`, {
      telegramId
    });
    
    const checkInTime = new Date(response.data.checkIn.time).toLocaleTimeString();
    
    bot.sendMessage(
      chatId,
      `✅ *Check-in Successful!*\n\nHello ${firstName}, you have been checked in at *${checkInTime}*.\n\nHave a productive day! 🚀`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Check-in error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      bot.sendMessage(
        chatId,
        `❌ *Error:* Your Telegram account is not registered in the system. Please contact HR to register your account.`,
        { parse_mode: 'Markdown' }
      );
    } else if (error.response?.status === 400) {
      bot.sendMessage(
        chatId,
        `ℹ️ *Notice:* ${error.response.data.message || 'You have already checked in today.'}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot.sendMessage(
        chatId,
        `❌ *Error:* Unable to check in. Please try again later or contact HR.`,
        { parse_mode: 'Markdown' }
      );
    }
  }
});

// Handle /logout command (check-out)
bot.onText(/\/logout/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();
  const firstName = msg.from.first_name;
  
  try {
    // Call the API to record check-out
    const response = await axios.post(`${API_URL}/attendance/check-out`, {
      telegramId
    });
    
    const checkOutTime = new Date(response.data.checkOut.time).toLocaleTimeString();
    const totalHours = response.data.totalHours;
    
    bot.sendMessage(
      chatId,
      `✅ *Check-out Successful!*\n\nGoodbye ${firstName}, you have been checked out at *${checkOutTime}*.\n\nTotal hours worked today: *${totalHours} hours*\n\nHave a great evening! 👋`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Check-out error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      if (error.response.data.message === 'Employee not found') {
        bot.sendMessage(
          chatId,
          `❌ *Error:* Your Telegram account is not registered in the system. Please contact HR to register your account.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        bot.sendMessage(
          chatId,
          `❌ *Error:* ${error.response.data.message || 'No check-in record found for today. Please check in first.'}`,
          { parse_mode: 'Markdown' }
        );
      }
    } else if (error.response?.status === 400) {
      bot.sendMessage(
        chatId,
        `ℹ️ *Notice:* ${error.response.data.message || 'You must check in before checking out.'}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot.sendMessage(
        chatId,
        `❌ *Error:* Unable to check out. Please try again later or contact HR.`,
        { parse_mode: 'Markdown' }
      );
    }
  }
});

// Handle /status command
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();
  
  try {
    // Get today's date (without time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // First, get the employee details
    const employeeResponse = await axios.get(`${API_URL}/employees/telegram/${telegramId}`);
    const employee = employeeResponse.data;
    
    // Then, get today's attendance record
    const attendanceResponse = await axios.get(
      `${API_URL}/employees/${employee._id}/attendance`,
      {
        params: {
          startDate: today.toISOString(),
          endDate: tomorrow.toISOString()
        }
      }
    );
    
    const attendance = attendanceResponse.data[0];
    
    if (!attendance) {
      bot.sendMessage(
        chatId,
        `*Status:* Not checked in today.\n\nUse /login to check in.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    const checkInTime = attendance.checkIn.time 
      ? new Date(attendance.checkIn.time).toLocaleTimeString() 
      : 'Not checked in';
      
    const checkOutTime = attendance.checkOut.time 
      ? new Date(attendance.checkOut.time).toLocaleTimeString() 
      : 'Not checked out';
      
    const totalHours = attendance.totalHours || 0;
    
    let status = '';
    if (!attendance.checkIn.time) {
      status = 'Not checked in';
    } else if (!attendance.checkOut.time) {
      status = 'Currently working (Checked in)';
    } else {
      status = 'Checked out';
    }
    
    bot.sendMessage(
      chatId,
      `*Today's Attendance Status*\n\n*Status:* ${status}\n*Check-in Time:* ${checkInTime}\n*Check-out Time:* ${checkOutTime}\n*Total Hours:* ${totalHours} hours`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Status check error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      bot.sendMessage(
        chatId,
        `❌ *Error:* Your Telegram account is not registered in the system. Please contact HR to register your account.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot.sendMessage(
        chatId,
        `❌ *Error:* Unable to check status. Please try again later or contact HR.`,
        { parse_mode: 'Markdown' }
      );
    }
  }
});

// Add endpoint for employee lookup by Telegram ID
bot.onText(/\/employee/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();
  
  try {
    // Get employee details
    const response = await axios.get(`${API_URL}/employees/telegram/${telegramId}`);
    const employee = response.data;
    
    bot.sendMessage(
      chatId,
      `*Your Employee Information*\n\n*Name:* ${employee.name}\n*Email:* ${employee.email}\n*Department:* ${employee.department || 'Not specified'}\n*Position:* ${employee.position || 'Not specified'}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Employee lookup error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      bot.sendMessage(
        chatId,
        `❌ *Error:* Your Telegram account is not registered in the system. Please contact HR to register your account.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot.sendMessage(
        chatId,
        `❌ *Error:* Unable to retrieve your information. Please try again later or contact HR.`,
        { parse_mode: 'Markdown' }
      );
    }
  }
});

// Handle errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});