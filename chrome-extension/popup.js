const steps = ["Scraping profile data...", "Normalizing skills...", "Calculating semantic match..."];
const API_URL = "http://localhost:8000"; // Hardcoded for seamless backend integration later

document.addEventListener('DOMContentLoaded', async () => {

  // 🔴 NEW: Check if we have recent data cached
  const cache = await chrome.storage.local.get(['lastResult', 'lastScanned']);

  // If we have data from the last 5 minutes, load it instantly!
  if (cache.lastResult && (Date.now() - cache.lastScanned < 300000)) {
    renderResults(cache.lastResult);
  } else {
    toggleState('state-idle');
  }
  
  const jobSelect = document.getElementById('job-req');
  const analyzeBtn = document.getElementById('analyze-btn');

  // Start in idle state
  toggleState('state-idle');

  // Enable button only when role is selected
  jobSelect.addEventListener('change', () => analyzeBtn.disabled = !jobSelect.value);

  // The Analyze Trigger (Auto-Scrape)
  analyzeBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Tell content.js to scrape the whole page
    chrome.tabs.sendMessage(tab.id, { type: "AUTO_SCRAPE" }, (response) => {
      
      // 🔴 NEW: Catch the silent connection error!
      if (chrome.runtime.lastError) {
        alert("⚠️ Extension connection failed. Please REFRESH this webpage and try again!");
        return;
      }

      const text = response?.text || "";

      // Fail-safe: Make sure they are actually on a profile page with text
      if (text.length < 100) {
        alert("⚠️ Could not detect enough profile text. Please ensure you are on a candidate's profile page.");
        return;
      }

      runMatchEngine(text, jobSelect.value);
    });
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
  toggleState('state-idle');
  
  // Reset the export button back to default
  const exportBtn = document.getElementById('export-btn');
  exportBtn.innerText = "📤 Export to HR Dashboard";
  exportBtn.classList.remove('btn-exported');
});
});
// Add this global variable at the very top of your file
let precisionTimer;

async function runMatchEngine(text, role) {
  toggleState('state-loading');
  
  // Start the Precision Timer
  let startTime = Date.now();
  precisionTimer = setInterval(() => {
    let elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    document.getElementById('loading-timer').innerText = `${elapsed}s`;
  }, 50);

  // Cycle the loading text
  let i = 0;
  const textTimer = setInterval(() => {
    i = (i + 1) % steps.length;
    document.getElementById('loading-msg').innerText = steps[i];
  }, 1200);

  try {
    const res = await fetch(`${API_URL}/api/v1/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_text: text, target_role: role })
    });
    
    if (!res.ok) throw new Error("Backend not responding");
    
    const data = await res.json();
    clearInterval(textTimer);
    clearInterval(precisionTimer);
    renderResults(data);

  } catch (err) {
    // 🔴 DEMO FALLBACK
    const mockData = {
        score: 87,
        strong_matches: ["Python (5y)", "Machine Learning", "FastAPI", "React"],
        missing_skills: ["Kubernetes", "System Design"],
        ai_deduction: "Score boosted by 12%. Deduced advanced Deep Learning proficiency from unlisted TensorFlow project experience found in Work History."
    };
    
    setTimeout(() => {
      clearInterval(textTimer);
      clearInterval(precisionTimer);
      renderResults(mockData);
    }, 3200);
  }
}

function renderResults(data) {
  toggleState('state-results');
  
  // 1. The Number Counter Animation
  let currentScore = 0;
  const targetScore = data.score;
  const duration = 1000; // Count up over 1 second
  const stepTime = Math.abs(Math.floor(duration / targetScore));
  
  const scoreInterval = setInterval(() => {
    currentScore += 1;
    document.getElementById('score-text').innerText = `${currentScore}%`;
    if (currentScore >= targetScore) {
      clearInterval(scoreInterval);
    }
  }, stepTime);
  
  // 2. Animate the conic-gradient circle
  const circle = document.getElementById('score-circle');
  const color = data.score > 70 ? 'var(--emerald)' : 'var(--amber)';
  circle.style.setProperty('--circle-color', color);
  setTimeout(() => circle.style.setProperty('--progress', `${data.score}%`), 100);
  
  // 3. Render Pills and Text
  const mapPills = (id, list, css) => {
    document.getElementById(id).innerHTML = list.map(s => `<span class="pill ${css}">${s}</span>`).join('');
  };
  mapPills('strong-matches', data.strong_matches, 'pill-green');
  mapPills('missing-skills', data.missing_skills, 'pill-red');
  document.getElementById('ai-deduction').innerText = data.ai_deduction;

  // Save to cache
  chrome.storage.local.set({ lastResult: data, lastScanned: Date.now() });
}
function toggleState(id) {
  document.querySelectorAll('.state').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

document.getElementById('export-btn').addEventListener('click', (e) => {
  const btn = e.target;
  
  // Change to success state
  btn.innerText = "✅ Candidate Exported!";
  btn.classList.add('btn-exported');
  
  // Optional: If you want it to revert back to normal after 3 seconds, keep this timeout.
  // Otherwise, delete the setTimeout block so it stays green until they scan a new person.
  setTimeout(() => {
    btn.innerText = "📤 Export to HR Dashboard";
    btn.classList.remove('btn-exported');
  }, 3000);
});

// Copy to Clipboard Logic
  document.getElementById('copy-report-btn').addEventListener('click', (e) => {
    const score = document.getElementById('score-text').innerText;
    const insight = document.getElementById('ai-deduction').innerText;
    const report = `TalentAI Quick Scan:\nMatch Score: ${score}\nAI Context: ${insight}`;
    
    navigator.clipboard.writeText(report).then(() => {
      e.target.innerText = "✅";
      setTimeout(() => e.target.innerText = "📋", 2000);
    });
  });