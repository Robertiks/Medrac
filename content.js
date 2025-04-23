// content.js
function parseSrcset(srcset) {
  if (!srcset) return null;
  const sources = srcset.split(',').map(s => s.trim().split(' '));
  let best = sources[0];
  for (const s of sources) {
    if (!s[1] || !best[1]) continue;
    const val = parseFloat(s[1]);
    const bestVal = parseFloat(best[1]);
    if (val > bestVal) best = s;
  }
  return best[0];
}

function collectMedia() {
  const items = [];
  // Images
  document.querySelectorAll('img').forEach((img, idx) => {
    const url = img.currentSrc || parseSrcset(img.getAttribute('srcset')) || img.src;
    if (!url) return;
    const ext = (url.split('?')[0].match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0];
    items.push({
      type: 'image',
      url,
      filename: `image_${idx}${ext}`
    });
  });
  // Videos
  document.querySelectorAll('video').forEach((video, idx) => {
    let url = video.currentSrc || video.src;
    if (!url) {
      const source = [...video.querySelectorAll('source')].find(s => s.src);
      if (source) url = source.src;
    }
    if (!url) return;
    const ext = (url.split('?')[0].match(/\.[a-zA-Z0-9]+$/) || ['.mp4'])[0];
    items.push({
      type: 'video',
      url,
      filename: `video_${idx}${ext}`
    });
  });
  
  // YouTube specific handling
  if (window.location.hostname.includes('youtube.com')) {
    // Get video ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    
    if (videoId) {
      // Extract YouTube video direct download URLs
      try {
        // Find the player config data in the page
        let playerData = null;
        
        // Try to get player data from window.ytplayer if available
        if (window.ytplayer && window.ytplayer.config) {
          playerData = window.ytplayer.config.args.player_response;
          if (typeof playerData === 'string') {
            playerData = JSON.parse(playerData);
          }
        }
        
        // Alternative method to extract from page source
        if (!playerData) {
          const scriptTags = Array.from(document.getElementsByTagName('script'));
          for (const script of scriptTags) {
            const text = script.text || script.textContent;
            if (text && text.includes('player_response')) {
              const match = text.match(/player_response\s*=\s*([^\n]+?});/i) || 
                          text.match(/"player_response"\s*:\s*"([^"]+)"/i);
              if (match && match[1]) {
                try {
                  playerData = JSON.parse(match[1].replace(/\\\"|\\\\/g, ''));
                  break;
                } catch (e) {
                  // Continue to the next script tag
                }
              }
            }
          }
        }
        
        // Extract video formats
        let formats = [];
        if (playerData && playerData.streamingData) {
          formats = [
            ...(playerData.streamingData.formats || []),
            ...(playerData.streamingData.adaptiveFormats || [])
          ];
        }
        
        // Filter for MP4 video formats and sort by quality
        const mp4Formats = formats.filter(f => {
          return f.mimeType && f.mimeType.includes('video/mp4') && f.url;
        }).sort((a, b) => {
          // Sort by height (resolution) in descending order
          return (b.height || 0) - (a.height || 0);
        });
        
        if (mp4Formats.length > 0) {
          // Get the best quality MP4 URL
          const bestFormat = mp4Formats[0];
          const directUrl = bestFormat.url;
          const resolution = bestFormat.height ? `${bestFormat.height}p` : 'HD';
          
          // Add the direct downloadable URL
          items.push({
            type: 'youtube',
            url: directUrl, // Direct MP4 URL instead of custom protocol
            videoId: videoId,
            filename: `youtube_video_${videoId}_${resolution}.mp4`,
            pageUrl: window.location.href,
            isDirectLink: true
          });
          
          // Also add medium quality if available
          if (mp4Formats.length > 1) {
            const medFormat = mp4Formats[Math.floor(mp4Formats.length / 2)];
            const medResolution = medFormat.height ? `${medFormat.height}p` : 'MD';
            items.push({
              type: 'youtube',
              url: medFormat.url,
              videoId: videoId,
              filename: `youtube_video_${videoId}_${medResolution}.mp4`,
              pageUrl: window.location.href,
              isDirectLink: true
            });
          }
        } else {
          // Fallback to our custom protocol if no direct URL found
          const specialUrl = `youtube-dl://${videoId}`;
          items.push({
            type: 'youtube',
            url: specialUrl,
            videoId: videoId,
            filename: `youtube_video_${videoId}.mp4`,
            pageUrl: window.location.href
          });
        }
      } catch (error) {
        // Fallback to our custom protocol on error
        const specialUrl = `youtube-dl://${videoId}`;
        items.push({
          type: 'youtube',
          url: specialUrl,
          videoId: videoId,
          filename: `youtube_video_${videoId}.mp4`,
          pageUrl: window.location.href,
          error: error.message
        });
      }
    }
  }
  // Audio
  document.querySelectorAll('audio').forEach((audio, idx) => {
    let url = audio.currentSrc || audio.src;
    if (!url) {
      const source = [...audio.querySelectorAll('source')].find(s => s.src);
      if (source) url = source.src;
    }
    if (!url) return;
    const ext = (url.split('?')[0].match(/\.[a-zA-Z0-9]+$/) || ['.mp3'])[0];
    items.push({
      type: 'audio',
      url,
      filename: `audio_${idx}${ext}`
    });
  });
  return items;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'getMedia') {
    sendResponse({ media: collectMedia() });
  }
  return true; // keep the message port open for async response
});
