chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "AUTO_SCRAPE") {
    // Grabs all visible text on the page (works flawlessly on LinkedIn/Wellfound)
    let profileText = document.body.innerText;
    
    // Clean up excessive line breaks and spaces to keep the payload lightweight
    profileText = profileText.replace(/\s+/g, ' ').trim();
    
    sendResponse({ text: profileText });
  }
  return true;
});