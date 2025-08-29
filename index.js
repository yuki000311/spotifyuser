require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const https = require('https');
const app = express();
const port = 3000;

// 静的ファイル配信
app.use(express.static('public'));

// Spotify認証リダイレクト
app.get('/login', (req, res) => {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
  const scope = 'user-read-playback-state user-modify-playback-state user-library-read';
  const auth_url = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirect_uri)}`;
  res.redirect(auth_url);
});

// 認証コールバック
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
  try {
    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id,
        client_secret
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token } = tokenRes.data;
    res.redirect('/?access_token=' + access_token);
  } catch (err) {
    res.status(400).send('認証失敗: ' + err.message);
  }
});

// お気に入り曲取得
app.get('/favorites', async (req, res) => {
  const access_token = req.query.access_token;
  const offset = Number(req.query.offset) || 0;
  if (!access_token) return res.status(400).send('アクセストークンが必要です');
  try {
    const favRes = await axios.get('https://api.spotify.com/v1/me/tracks', {
      headers: { Authorization: `Bearer ${access_token}` },
      params: { limit: 50, offset }
    });
    res.json(favRes.data);
  } catch (err) {
    res.status(400).send('お気に入り取得失敗: ' + err.message);
  }
});

// 再生中の曲取得
app.get('/current', async (req, res) => {
  const access_token = req.query.access_token;
  if (!access_token) return res.status(400).send('アクセストークンが必要です');
  try {
    const currentRes = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    res.json(currentRes.data);
  } catch (err) {
    res.status(400).send('再生中取得失敗: ' + err.message);
  }
});

// 曲再生
app.put('/play', async (req, res) => {
  const { access_token, track_uri } = req.query;
  if (!access_token) return res.status(400).send('アクセストークンが必要です');
  try {
    await axios.put(
      'https://api.spotify.com/v1/me/player/play',
      track_uri ? { uris: [track_uri] } : {},
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    res.send('再生しました');
  } catch (err) {
    res.status(400).send('再生失敗: ' + err.message);
  }
});

// 曲停止
app.put('/pause', async (req, res) => {
  const access_token = req.query.access_token;
  if (!access_token) return res.status(400).send('アクセストークンが必要です');
  try {
    await axios.put(
      'https://api.spotify.com/v1/me/player/pause',
      {},
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    res.send('停止しました');
  } catch (err) {
    res.status(400).send('停止失敗: ' + err.message);
  }
});

// HTTPSサーバー起動（LAN内アクセス対応）
const key = fs.readFileSync('server.key');
const cert = fs.readFileSync('server.cert');
https.createServer({ key, cert }, app).listen(port, '0.0.0.0', () => {
  console.log(`Server running at https://0.0.0.0:${port}/`);
});
