// background.js
chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
  if (message.type === "downloadMedia") {
    for (const item of message.payload) {
      if (item.type === 'youtube') {
        if (item.isDirectLink && item.url) {
          // We have a direct MP4 URL from YouTube that we can download
          console.log('Downloading direct YouTube video:', item.filename);
          chrome.downloads.download({
            url: item.url,
            filename: item.filename,
            saveAs: false
          });
        } else if (item.url.startsWith('youtube-dl://')) {
          // Fallback to opening the YouTube page
          const videoId = item.videoId;
          // Use the actual YouTube video URL that can be downloaded
          // This is a direct link to watch page which is better than blob URLs
          const downloadUrl = `https://www.youtube.com/watch?v=${videoId}`;
          
          // Open in new tab instead of trying to download directly
          // This is more reliable when direct link extraction failed
          chrome.tabs.create({ url: downloadUrl });
        }
      } else {
        // Handle normal media downloads
        chrome.downloads.download({
          url: item.url,
          filename: item.filename,
          saveAs: false
        });
      }
    }
  }
});
