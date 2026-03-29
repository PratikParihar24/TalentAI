const steps = ["Extracting experience...", "Normalizing skills...", "Calculating semantic match..."];

document.addEventListener('DOMContentLoaded', async () => {
  const jobSelect = document.getElementById('job-req');
  const analyzeBtn = document.getElementById('analyze-btn');

  // Load existing config
  const { apiUrl, apiKey } = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
  if (!apiUrl) toggleState('state-config');

  // Enable button only when role is selected
  jobSelect.addEventListener('change', () => analyzeBtn.disabled = !jobSelect.value);

  // Save Settings Logic
  document.getElementById('save-config').addEventListener('click', () => {
    const url = document.getElementById('api-url').value;
    const key = document.getElementById('api-key').value;
    chrome.storage.sync.set({ apiUrl: url, apiKey: key }, () => toggleState('state-idle'));
  });

  document.getElementById('settings-btn').addEventListener('click', () => toggleState('state-config'));

  // The Analyze Trigger
  analyzeBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Request highlight from content.js
    chrome.tabs.sendMessage(tab.id, { type: "GET_TEXT" }, (response) => {
      const text = response?.text || "";

      // Fail-safe: Text length validation
      if (text.split(/\s+/).length < 50) {
        alert("⚠️ Please highlight at least 50 words of the candidate's profile to ensure AI accuracy.");
        return;
      }

      runMatchEngine(text, jobSelect.value);
    });
  });

  document.getElementById('reset-btn').addEventListener('click', () => toggleState('state-idle'));
});

async function runMatchEngine(text, role) {
  toggleState('state-loading');
  let i = 0;
  const timer = setInterval(() => {
    i = (i + 1) % steps.length;
    document.getElementById('loading-msg').innerText = steps[i];
  }, 1800);

  const { apiUrl, apiKey } = await chrome.storage.sync.get(['apiUrl', 'apiKey']);

  try {
    const res = await fetch(`${apiUrl}/api/v1/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ candidate_text: text, target_role: role })
    });
    
    const data = await res.json();
    renderResults(data);
  } catch (err) {
    alert("Backend connection failed. Is your FastAPI server running at " + apiUrl + "?");
    toggleState('state-idle');
  } finally {
    clearInterval(timer);
  }
}

function renderResults(data) {
  toggleState('state-results');
  document.getElementById('score-text').innerText = `${data.score}%`;
  document.getElementById('score-circle').style.borderColor = data.score > 70 ? '#10b981' : '#f59e0b';
  
  const mapPills = (id, list, css) => {
    document.getElementById(id).innerHTML = list.map(s => `<span class="pill ${css}">${s}</span>`).join('');
  };

  mapPills('strong-matches', data.strong_matches, 'pill-green');
  mapPills('missing-skills', data.missing_skills, 'pill-red');
  document.getElementById('ai-deduction').innerText = data.ai_deduction;
}

function toggleState(id) {
  document.querySelectorAll('.state').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}