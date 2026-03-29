chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "AUTO_SCRAPE") {
    let profileText = "";
    
    // 1. Try to grab ONLY the main LinkedIn profile column (Ignores sidebars/nav)
    const linkedinMainColumn = document.querySelector('main.scaffold-layout__main');
    
    if (linkedinMainColumn) {
      profileText = linkedinMainColumn.innerText;
      console.log("🎯 Targeted LinkedIn main column successfully.");
    } else {
      // 2. Fallback: If not on LinkedIn, or structure changed, grab the body
      profileText = document.body.innerText;
      console.log("⚠️ Fallback: Scraped entire document body.");
    }
    
    // Clean up excessive line breaks and spaces to keep the payload lightweight
    profileText = profileText.replace(/\s+/g, ' ').trim();
    
    sendResponse({ text: profileText });
  }
  return true;
});