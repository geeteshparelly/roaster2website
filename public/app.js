// State
let analysisResults = null;
let generatedHTML = null;
let currentFeedbackMode = 'roast';

// Elements
const steps = {
  1: document.getElementById('step-1'),
  2: document.getElementById('step-2'),
  3: document.getElementById('step-3'),
  4: document.getElementById('step-4')
};

// Navigation
function showStep(stepNum) {
  Object.values(steps).forEach(step => step.classList.remove('active'));
  steps[stepNum].classList.add('active');
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

// Extract score from feedback
function extractScore(feedback) {
  // Look for patterns like "Score: 65" or "65/100" or "Grade: C"
  const scoreMatch = feedback.match(/(?:score|rating)[:\s]*(\d{1,3})/i) ||
                     feedback.match(/(\d{1,3})\/100/) ||
                     feedback.match(/Overall[:\s]*(\d{1,3})/i);
  
  if (scoreMatch) {
    return Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
  }
  
  // Try to extract from grade
  const gradeMatch = feedback.match(/Grade[:\s]*([A-F][+-]?)/i);
  if (gradeMatch) {
    const gradeScores = {
      'A+': 97, 'A': 94, 'A-': 90,
      'B+': 87, 'B': 84, 'B-': 80,
      'C+': 77, 'C': 74, 'C-': 70,
      'D+': 67, 'D': 64, 'D-': 60,
      'F': 50
    };
    return gradeScores[gradeMatch[1].toUpperCase()] || 70;
  }
  
  return 65; // Default score
}

// Get grade from score
function getGrade(score) {
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

// Animate score
function animateScore(targetScore) {
  const scoreNumber = document.getElementById('score-number');
  const gradeSpan = document.getElementById('grade-letter');
  let current = 0;
  const duration = 1000;
  const steps = 30;
  const increment = targetScore / steps;
  const stepTime = duration / steps;
  
  const timer = setInterval(() => {
    current += increment;
    if (current >= targetScore) {
      current = targetScore;
      clearInterval(timer);
    }
    scoreNumber.textContent = Math.round(current);
    gradeSpan.textContent = getGrade(Math.round(current));
  }, stepTime);
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

// Step 1: Analyze button
document.getElementById('btn-analyze').addEventListener('click', async () => {
  const urlInput = document.getElementById('url-input');
  const btn = document.getElementById('btn-analyze');
  let url = urlInput.value.trim();
  
  if (!url) {
    showToast('Please enter a URL');
    urlInput.focus();
    return;
  }
  
  // Clean up URL
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }
  
  btn.disabled = true;
  btn.classList.add('loading');
  
  try {
    analysisResults = await analyzeWebsite(url);
    
    // Update URL display
    document.getElementById('analyzed-url').textContent = url.replace(/^https?:\/\//, '');
    
    // Show roast by default
    document.getElementById('results-content').innerHTML = formatFeedback(analysisResults.roastFeedback);
    currentFeedbackMode = 'roast';
    document.getElementById('btn-roast-mode').classList.add('active');
    document.getElementById('btn-pro-mode').classList.remove('active');
    
    // Animate score
    const score = extractScore(analysisResults.professionalFeedback);
    showStep(2);
    setTimeout(() => animateScore(score), 300);
    
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

// No website button
document.getElementById('btn-no-website').addEventListener('click', () => {
  showStep(3);
});

// Step 2: Results toggle
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
  showStep(3);
});

document.getElementById('btn-try-another').addEventListener('click', () => {
  document.getElementById('url-input').value = '';
  showStep(1);
});

// Step 3: Landing page form
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
    
    // Update preview URL
    const fileName = businessInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.html';
    document.getElementById('preview-url').textContent = fileName;
    
    // Show preview
    const frame = document.getElementById('preview-frame');
    frame.srcdoc = generatedHTML;
    
    showStep(4);
  } catch (error) {
    showToast(error.message || 'Failed to generate landing page');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
});

document.getElementById('btn-back-form').addEventListener('click', () => {
  if (analysisResults) {
    showStep(2);
  } else {
    showStep(1);
  }
});

// Step 4: Download and copy
document.getElementById('btn-download').addEventListener('click', () => {
  if (!generatedHTML) return;
  
  const businessName = document.getElementById('business-name').value || 'landing-page';
  const fileName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.html';
  
  const blob = new Blob([generatedHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
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
  document.getElementById('score-number').textContent = '--';
  document.getElementById('grade-letter').textContent = '-';
  showStep(1);
});

// Check API status on load
fetch('/api/health')
  .then(r => r.json())
  .then(data => {
    if (data.mode === 'demo') {
      console.log('🔶 Running in demo mode - connect API key for full AI analysis');
    } else {
      console.log('🟢 Connected to Claude AI');
    }
  })
  .catch(() => {
    console.log('⚠️ API not available');
  });
