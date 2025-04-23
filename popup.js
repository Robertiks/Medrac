// popup.js
async function queryMedia() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tab.id, { type: 'getMedia' }, res => {
      resolve(res?.media || []);
    });
  });
}

function makeItem(media, idx) {
  const row = document.createElement('div');
  row.className = 'item';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.dataset.idx = idx;
  row.appendChild(cb);

  if (media.type === 'image') {
    const img = document.createElement('img');
    img.src = media.url;
    row.appendChild(img);
  } else if (media.type === 'youtube') {
    // Special icon for YouTube videos
    const icon = document.createElement('span');
    icon.textContent = '▶️';
    icon.style.color = 'red';
    row.appendChild(icon);
  } else {
    const icon = document.createElement('span');
    icon.textContent = media.type === 'video' ? '🎞️' : '🎵';
    row.appendChild(icon);
  }

  const name = document.createElement('span');
  name.textContent = media.filename;
  name.title = media.type === 'youtube' ? 'YouTube video: ' + media.videoId : media.url;
  row.appendChild(name);
  return row;
}

let cache = [];

async function refresh() {
  // Clear previous results
  const list = document.getElementById('media-list');
  list.innerHTML = '';
  
  cache = await queryMedia();
  // Get current URL to detect YouTube
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isYouTube = tab.url && tab.url.includes('youtube.com');

  // Display helpful message when no videos are found
  if (cache.length === 0) {
    const message = document.createElement('div');
    message.textContent = isYouTube ? 
      'YouTube video detected. Click Download to open in a new tab.' : 
      'No videos found on this page.';
    message.style.padding = '10px';
    message.style.textAlign = 'center';
    list.appendChild(message);
  }
  
  cache.forEach((m, idx) => list.appendChild(makeItem(m, idx)));
}

document.getElementById('refresh').addEventListener('click', refresh);
document.getElementById('download-selected').addEventListener('click', () => {
  const chosen = [...document.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cache[parseInt(cb.dataset.idx)]);
  chrome.runtime.sendMessage({ type: 'downloadMedia', payload: chosen });
});

// initial scan
document.addEventListener('DOMContentLoaded', refresh);
