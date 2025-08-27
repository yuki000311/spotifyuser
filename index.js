require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const https = require('https');
const path = require('path');
const app = express();
const port = 3000;

// デバイス一覧取得API
// ...既存API定義...

// 再生位置変更（シーク）
app.put('/seek', async (req, res) => {
  const { access_token, position_ms } = req.query;
  if (!access_token || !position_ms) {
    return res.status(400).send('アクセストークンと再生位置が必要です');
  }
  try {
    await axios.put(`https://api.spotify.com/v1/me/player/seek?position_ms=${position_ms}`, {}, {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    res.send('シークしました');
  } catch (err) {
    res.status(400).send('シーク失敗: ' + err.message);
  }
});
app.get('/devices', async (req, res) => {
  const { access_token } = req.query;
  if (!access_token) {
    return res.status(400).send('アクセストークンが必要です');
  }
  try {
    const result = await axios.get('https://api.spotify.com/v1/me/player/devices', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    res.json(result.data);
  } catch (err) {
    res.status(400).send('デバイス取得失敗: ' + err.message);
  }
});

app.use(express.json());
app.use(express.static('public'));

// 再生API
app.put('/play', async (req, res) => {
  const { access_token, track_uri, device_id } = req.query;
  if (!access_token) {
    return res.status(400).send('アクセストークンが必要です');
  }
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    };
    if (device_id) {
      config.params = { device_id };
    }
    await axios.put('https://api.spotify.com/v1/me/player/play',
      track_uri ? { uris: [track_uri] } : {},
      config
    );
    res.send('再生しました');
  } catch (err) {
    res.status(400).send('再生失敗: ' + err.message);
  }
});

// 停止API
app.put('/pause', async (req, res) => {
  const { access_token } = req.query;
  if (!access_token) {
    return res.status(400).send('アクセストークンが必要です');
  }
  try {
    await axios.put('https://api.spotify.com/v1/me/player/pause', {}, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });
    res.send('停止しました');
  } catch (err) {
    res.status(400).send('停止失敗: ' + err.message);
  }
});

  // 現在再生中の曲情報取得API
  app.get('/current', async (req, res) => {
    const { access_token } = req.query;
    if (!access_token) {
      return res.status(400).send('アクセストークンが必要です');
    }
    try {
      const result = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });
      res.json(result.data);
    } catch (err) {
      res.status(400).send('再生中取得失敗: ' + err.message);
    }
  });

    // お気に入り（保存済み）曲取得API
    app.get('/favorites', async (req, res) => {
      const { access_token, offset = 0 } = req.query;
      if (!access_token) {
        return res.status(400).send('アクセストークンが必要です');
      }
      try {
        const limit = 50;
        const result = await axios.get('https://api.spotify.com/v1/me/tracks', {
          headers: {
            Authorization: `Bearer ${access_token}`
          },
          params: {
            limit,
            offset: Number(offset)
          }
        });
        res.json({ items: result.data.items || [] });
      } catch (err) {
        res.status(400).send('お気に入り取得失敗: ' + err.message);
      }
    });

// ...existing code...


// Spotify認証開始
app.get('/login', (req, res) => {
  const scopes = 'user-read-playback-state user-modify-playback-state user-read-currently-playing user-library-read';
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const auth_url =
    'https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    `&client_id=${client_id}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}`;
  res.redirect(auth_url);
});

// Spotify認証コールバック
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
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    const { access_token, refresh_token } = tokenRes.data;
  // トークンをセッションやDBに保存する処理を追加可能
  res.redirect('/?access_token=' + access_token);
  } catch (err) {
    res.status(400).send('認証失敗: ' + err.message);
  }
});


// HTTPSサーバー起動
const serverOptions = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
};
https.createServer(serverOptions, app).listen(port, '127.0.0.1', () => {
  console.log(`HTTPS Server running at https://127.0.0.1:${port}`);
});
