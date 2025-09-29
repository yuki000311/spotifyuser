/**
 * Make API request with error handling for backoff delays
 * @param {string} url - Request URL
 * @param {object} options - Fetch options
 * @returns {Promise} Response or throws error
 */
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  } catch (error) {
    console.warn('API request failed:', error.message);
    throw error;
  }
}

// 現在の再生位置から再開する再生ボタン
async function playTrack() {
  if (!accessToken) return;
async function playTrack() {
  if (!accessToken) return;
  try {
    // 現在の曲と再生位置を取得
    const res = await apiRequest(`/current?access_token=${accessToken}`);
    const data = await res.json();
    if (!data || !data.item) {
      // 曲がない場合はお気に入りの最初の曲を再生
      const favRes = await apiRequest(`/favorites?access_token=${accessToken}`);
      const favData = await favRes.json();
      if (favData.items && favData.items.length > 0 && favData.items[0].track) {
        await playTrackUri(favData.items[0].track.uri);
        showCurrentTrack();
      }
      return;
    }
    // 曲がある場合はそのまま再生
    await playTrackUri(data.item.uri);
    // 再生位置があればシーク
    if (typeof data.progress_ms === 'number' && data.progress_ms > 0) {
      await apiRequest(`/seek?access_token=${accessToken}&position_ms=${data.progress_ms}`, { method: 'PUT' });
    }
    showCurrentTrack();
  } catch (error) {
    console.error('Play track failed:', error.message);
    // Show user-friendly error message
    const block = document.getElementById('currentTrack');
    block.innerHTML = `<div style="color: #ff6b6b;">再生に失敗しました。しばらく待ってから再試行してください。</div>`;
  }
}
}




let accessToken = '';

window.onload = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('access_token')) {
    accessToken = params.get('access_token');
    showCurrentTrack();
    showFavorites();
    // 30秒ごとに自動更新
    setInterval(() => {
      showCurrentTrack();
      showFavorites();
    }, 30000);
  } else {
    window.location.href = '/login';
  }
};

async function showCurrentTrack() {
  if (!accessToken) return;
  const block = document.getElementById('currentTrack');
  
  try {
    block.innerHTML = '<div style="color: #888;">読み込み中...</div>';
    const res = await apiRequest(`/current?access_token=${accessToken}`);
    const data = await res.json();
    
    if (!data || !data.item) {
      block.innerHTML = '再生中の曲はありません';
      return;
    }
    
    const track = data.item;
    block.innerHTML = `
      <img src="${track.album.images[0]?.url}" alt="album">
      <div>
        <b>${track.name}</b>
        <div class="track-artist">${track.artists.map(a=>a.name).join(', ')}</div>
      </div>
    `;
  } catch (error) {
    console.error('Show current track failed:', error.message);
    block.innerHTML = '<div style="color: #ff6b6b;">現在の曲情報を取得できませんでした</div>';
  }
}

async function showFavorites() {
  if (!accessToken) return;
  const favDiv = document.getElementById('favoritesResults');
  
  try {
    favDiv.innerHTML = '<div style="color: #888;">お気に入りを読み込み中...</div>';
    const res = await apiRequest(`/favorites?access_token=${accessToken}`);
    const data = await res.json();
    const tracks = data.items || [];
    
    if (tracks.length === 0) {
      favDiv.innerHTML = 'お気に入り曲がありません';
      return;
    }
    
    favDiv.innerHTML = '';
    tracks.forEach(item => {
      if (!item.track) return;
      const track = item.track;
      const div = document.createElement('div');
      div.className = 'track';
      const img = document.createElement('img');
      img.src = track.album.images[0]?.url || '';
      img.alt = 'album';
      const info = document.createElement('div');
      info.className = 'track-info';
      const title = document.createElement('div');
      title.className = 'track-title';
      title.textContent = track.name;
      title.style.cursor = 'pointer';
      title.onclick = () => playTrackUri(track.uri);
      const artist = document.createElement('div');
      artist.className = 'track-artist';
      artist.textContent = track.artists.map(a=>a.name).join(', ');
      info.appendChild(title);
      info.appendChild(artist);
      div.appendChild(img);
      div.appendChild(info);
      favDiv.appendChild(div);
    });
    
    document.getElementById('playBtn').onclick = () => playTrack();
    document.getElementById('pauseBtn').onclick = () => pauseTrack();
  } catch (error) {
    console.error('Show favorites failed:', error.message);
    favDiv.innerHTML = '<div style="color: #ff6b6b;">お気に入り曲を取得できませんでした</div>';
  }
}

async function pauseTrack() {
  if (!accessToken) return;
  try {
    await apiRequest(`/pause?access_token=${accessToken}`, { method: 'PUT' });
    showCurrentTrack();
  } catch (error) {
    console.error('Pause track failed:', error.message);
  }
}

async function playTrackUri(uri) {
  if (!accessToken) return;
  try {
    await apiRequest(`/play?access_token=${accessToken}&track_uri=${encodeURIComponent(uri)}`, { method: 'PUT' });
    showCurrentTrack();
  } catch (error) {
    console.error('Play track URI failed:', error.message);
  }
}


