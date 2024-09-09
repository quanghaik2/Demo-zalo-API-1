const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Serve static files from the "public" directory (including your HTML verification file)
app.use(express.static(path.join(__dirname, 'public')));

let codeVerifier = ''; // Để lưu code_verifier

// Hàm tạo code_challenge từ code_verifier
const generateCodeChallenge = (verifier) => {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
};

// Hàm tạo code_verifier
const generateCodeVerifier = () => {
  return crypto.randomBytes(32).toString('base64url');
};

// Hàm tạo state ngẫu nhiên
const generateRandomState = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Đường dẫn chuyển hướng đến trang đăng nhập Zalo
app.get('/login', (req, res) => {
  const appId = process.env.APP_ID;
  const redirectUri = process.env.REDIRECT_URI;
  
  // Tạo code_verifier và code_challenge
  codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  const state = generateRandomState(); // Tạo state ngẫu nhiên
  
  const loginUrl = `https://oauth.zaloapp.com/v4/permission?app_id=${appId}&redirect_uri=${redirectUri}&code_challenge=${codeChallenge}&state=${state}`;
  
  res.redirect(loginUrl);
});

// Đường dẫn callback để xử lý sau khi người dùng đăng nhập
app.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ message: 'Login failed' });
  }

  try {
    // Đổi mã 'code' thành 'access token' bằng cách gửi yêu cầu với code_verifier
    const tokenResponse = await axios.post('https://oauth.zaloapp.com/v4/access_token', null, {
      params: {
        app_id: process.env.APP_ID,
        app_secret: process.env.APP_SECRET,
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: process.env.REDIRECT_URI
      }
    });

    const accessToken = tokenResponse.data.access_token;

    // Lấy thông tin người dùng
    const userResponse = await axios.get('https://graph.zalo.me/v2.0/me', {
      params: {
        access_token: accessToken,
        fields: 'id,name,picture'
      }
    });

    const user = userResponse.data;
    res.json({ message: 'Login successful', user });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
