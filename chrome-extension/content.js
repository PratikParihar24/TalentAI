chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_TEXT") {
    const selection = window.getSelection().toString().trim();
    sendResponse({ text: selection });
  }
  return true;
});