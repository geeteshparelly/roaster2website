// State
let currentStep = 1;
let analysisResults = null;
let generatedHTML = null;
let currentFeedbackMode = 'roast';

// Elements
const steps = {
  1: document.getElementById('step-1'),
  2: document.getElementById('step-2'),
  3: document.getElementById('step-3'),
  4: document.getElementById('step-4'),
  5: document.getElementById('step-5')
};

// Navigation
function showStep(stepNum) {
  Object.values(steps).forEach(step => step.classList.remove('active'));
  steps[stepNum].classList.add('active');
  currentStep = stepNum;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Toast notification
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// Parse markdown-ish text to HTML
function formatFeedback(text) {
  return text
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

// API calls
async function analyzeWebsite(url) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze website');
  }
  
  return response.json();
}

async function generateLandingPage(businessInfo) {
  const response = await fetch('/api/generate-landing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(businessInfo)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate landing page');
  }
  
  return response.json();
}

// Event Listeners

// Step 1: Choice buttons
document.getElementById('btn-has-website').addEventListener('click', () => {
  showStep(2);
});

document.getElementById('btn-no-website').addEventListener('click', () => {
  showStep(4);
});

// Step 2: URL analysis
document.getElementById('btn-analyze').addEventListener('click', async () => {
  const urlInput = document.getElementById('url-input');
  const btn = document.getElementById('btn-analyze');
  const url = urlInput.value.trim();
  
  if (!url) {
    showToast('Please enter a URL');
    urlInput.focus();
    return;
  }
  
  btn.disabled = true;
  btn.classList.add('loading');
  
  try {
    analysisResults = await analyzeWebsite(url);
    
    // Show roast by default
    document.getElementById('results-content').innerHTML = formatFeedback(analysisResults.roastFeedback);
    currentFeedbackMode = 'roast';
    document.getElementById('btn-roast-mode').classList.add('active');
    document.getElementById('btn-pro-mode').classList.remove('active');
    
    showStep(3);
  } catch (error) {
    showToast(error.message || 'Failed to analyze website');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
});

// Enter key on URL input
document.getElementById('url-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('btn-analyze').click();
  }
});

document.getElementById('btn-back-1').addEventListener('click', () => {
  showStep(1);
});

// Step 3: Results toggle
document.getElementById('btn-roast-mode').addEventListener('click', () => {
  if (currentFeedbackMode !== 'roast' && analysisResults) {
    document.getElementById('results-content').innerHTML = formatFeedback(analysisResults.roastFeedback);
    currentFeedbackMode = 'roast';
    document.getElementById('btn-roast-mode').classList.add('active');
    document.getElementById('btn-pro-mode').classList.remove('active');
  }
});

document.getElementById('btn-pro-mode').addEventListener('click', () => {
  if (currentFeedbackMode !== 'professional' && analysisResults) {
    document.getElementById('results-content').innerHTML = formatFeedback(analysisResults.professionalFeedback);
    currentFeedbackMode = 'professional';
    document.getElementById('btn-pro-mode').classList.add('active');
    document.getElementById('btn-roast-mode').classList.remove('active');
  }
});

document.getElementById('btn-build-landing').addEventListener('click', () => {
  showStep(4);
});

document.getElementById('btn-try-another').addEventListener('click', () => {
  document.getElementById('url-input').value = '';
  showStep(2);
});

// Step 4: Landing page form
document.getElementById('landing-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = e.target.querySelector('.primary-btn');
  btn.disabled = true;
  btn.classList.add('loading');
  
  const businessInfo = {
    name: document.getElementById('business-name').value,
    description: document.getElementById('business-description').value,
    targetCustomer: document.getElementById('target-customer').value,
    features: document.getElementById('features').value,
    cta: document.getElementById('cta').value,
    contact: document.getElementById('contact-info').value
  };
  
  try {
    const result = await generateLandingPage(businessInfo);
    generatedHTML = result.html;
    
    // Show preview
    const frame = document.getElementById('preview-frame');
    frame.srcdoc = generatedHTML;
    
    showStep(5);
  } catch (error) {
    showToast(error.message || 'Failed to generate landing page');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
});

document.getElementById('btn-back-3').addEventListener('click', () => {
  if (analysisResults) {
    showStep(3);
  } else {
    showStep(1);
  }
});

// Step 5: Download and copy
document.getElementById('btn-download').addEventListener('click', () => {
  if (!generatedHTML) return;
  
  const blob = new Blob([generatedHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'landing-page.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('Downloaded! 🎉');
});

document.getElementById('btn-copy-code').addEventListener('click', async () => {
  if (!generatedHTML) return;
  
  try {
    await navigator.clipboard.writeText(generatedHTML);
    showToast('Copied to clipboard! 📋');
  } catch (err) {
    showToast('Failed to copy');
  }
});

document.getElementById('btn-start-over').addEventListener('click', () => {
  // Reset everything
  analysisResults = null;
  generatedHTML = null;
  document.getElementById('url-input').value = '';
  document.getElementById('landing-form').reset();
  showStep(1);
});

// Check API status on load
fetch('/api/health')
  .then(r => r.json())
  .then(data => {
    if (data.mode === 'demo') {
      console.log('Running in demo mode - connect API key for full functionality');
    }
  })
  .catch(() => {
    console.log('API not available');
  });
