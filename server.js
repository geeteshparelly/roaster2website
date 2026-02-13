require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Gemini API endpoint
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

// Call Gemini API
async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    return null;
  }
  
  try {
    const response = await axios.post(GEMINI_URL, {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2000,
      }
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    return null;
  }
}

// Fetch and analyze website
async function fetchWebsite(url) {
  try {
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    const analysis = {
      url: url,
      title: $('title').text() || 'No title found',
      metaDescription: $('meta[name="description"]').attr('content') || 'No meta description',
      h1Count: $('h1').length,
      h1Text: $('h1').first().text().trim() || 'No H1 found',
      imageCount: $('img').length,
      imagesWithoutAlt: $('img:not([alt]), img[alt=""]').length,
      hasHttps: url.startsWith('https'),
      linkCount: $('a').length,
      hasViewport: $('meta[name="viewport"]').length > 0,
      bodyText: $('body').text().replace(/\s+/g, ' ').trim().substring(0, 1500),
      hasFavicon: $('link[rel*="icon"]').length > 0,
      scriptCount: $('script').length,
      cssCount: $('link[rel="stylesheet"]').length + $('style').length,
      formCount: $('form').length,
      buttonCount: $('button').length + $('input[type="submit"]').length,
    };
    
    return { success: true, analysis };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Generate roast using Gemini
async function generateRoast(analysis, style = 'roast') {
  const prompt = style === 'roast' 
    ? `You are a brutally honest, sarcastic website critic with a great sense of humor. Analyze this website and ROAST it. Be funny, savage, but also helpful. Use emojis sparingly.

Website Analysis Data:
- URL: ${analysis.url}
- Title: ${analysis.title}
- Meta Description: ${analysis.metaDescription}
- H1 Tags: ${analysis.h1Count} (First H1: "${analysis.h1Text}")
- Images: ${analysis.imageCount} total, ${analysis.imagesWithoutAlt} missing alt text
- HTTPS: ${analysis.hasHttps ? 'Yes' : 'No'}
- Mobile Viewport: ${analysis.hasViewport ? 'Yes' : 'No'}
- Favicon: ${analysis.hasFavicon ? 'Yes' : 'No'}
- Forms: ${analysis.formCount}
- Buttons/CTAs: ${analysis.buttonCount}
- Scripts: ${analysis.scriptCount}

Give a score from 0-100 based on the technical factors above.

Format your response EXACTLY like this:
## 🔥 Score: [number]/100 | Grade: [letter]

### First Impressions
[Roast the title and first impression - be savage but funny]

### Technical Roast
[Roast the technical issues - HTTPS, viewport, images, etc.]

### What Actually Works
[Briefly mention 1-2 things that aren't terrible]

### The Verdict
[A funny one-liner summary]

### Quick Fixes (Do These NOW)
1. [Most important fix]
2. [Second fix]
3. [Third fix]`
    : `You are a professional website consultant. Analyze this website and provide constructive, actionable feedback. Be encouraging but honest.

Website Analysis Data:
- URL: ${analysis.url}
- Title: ${analysis.title}
- Meta Description: ${analysis.metaDescription}
- H1 Tags: ${analysis.h1Count} (First H1: "${analysis.h1Text}")
- Images: ${analysis.imageCount} total, ${analysis.imagesWithoutAlt} missing alt text
- HTTPS: ${analysis.hasHttps ? 'Yes' : 'No'}
- Mobile Viewport: ${analysis.hasViewport ? 'Yes' : 'No'}
- Favicon: ${analysis.hasFavicon ? 'Yes' : 'No'}
- Forms: ${analysis.formCount}
- Buttons/CTAs: ${analysis.buttonCount}

Give a score from 0-100 based on the technical factors above.

Format your response EXACTLY like this:
## 📊 Score: [number]/100 | Grade: [letter]

### Overview
[Professional assessment of the website]

### Technical Assessment
[Review HTTPS, mobile, SEO basics - be specific]

### Strengths
[What the site does well]

### Priority Improvements
1. [Most important improvement with explanation]
2. [Second improvement]
3. [Third improvement]

### Summary
[Professional one-paragraph summary]`;

  const result = await callGemini(prompt);
  
  if (result) {
    return result;
  }
  
  // Fallback to mock if API fails
  return getMockResponse(analysis, style);
}

// Generate landing page using Gemini
async function generateLandingPage(businessInfo) {
  console.log('Generating landing page for:', businessInfo.name);
  const prompt = `Create a complete, modern, professional HTML landing page. Include ALL CSS inline in a <style> tag. Do NOT use any external files or CDNs.

Business Details:
- Name: ${businessInfo.name}
- What they do: ${businessInfo.description}
- Target customer: ${businessInfo.targetCustomer || 'General audience'}
- Key benefits: ${businessInfo.features || 'Quality service'}
- Call to action: ${businessInfo.cta || 'Get Started'}
- Contact: ${businessInfo.contact || 'Contact us'}

Requirements:
1. Modern, clean design with a cohesive color scheme
2. Fully responsive (works on mobile)
3. Hero section with headline, subheadline, and CTA button
4. Features/benefits section with 3 items
5. About section
6. Contact section
7. Footer
8. Smooth hover effects on buttons
9. Professional typography
10. Make the CTA button prominent and eye-catching

Return ONLY the complete HTML code starting with <!DOCTYPE html>. No explanations, no markdown code blocks, just the raw HTML.`;

  const result = await callGemini(prompt);
  
  if (result) {
    console.log('Gemini returned HTML, length:', result.length);
    // Clean up the response - remove markdown code blocks if present
    let html = result.trim();
    if (html.startsWith('```html')) {
      html = html.slice(7);
    }
    if (html.startsWith('```')) {
      html = html.slice(3);
    }
    if (html.endsWith('```')) {
      html = html.slice(0, -3);
    }
    return html.trim();
  }
  
  console.log('Using mock landing page for:', businessInfo.name);
  const mockHtml = getMockLandingPage(businessInfo);
  console.log('Mock HTML starts with:', mockHtml.substring(0, 100));
  return mockHtml;
}

// Mock responses as fallback
function getMockResponse(analysis, style) {
  let score = 50;
  if (analysis.hasHttps) score += 15;
  if (analysis.hasViewport) score += 10;
  if (analysis.metaDescription && analysis.metaDescription !== 'No meta description') score += 10;
  if (analysis.h1Count > 0) score += 5;
  if (analysis.imagesWithoutAlt === 0 && analysis.imageCount > 0) score += 5;
  if (analysis.hasFavicon) score += 5;
  score = Math.min(100, Math.max(0, score));
  
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  
  if (style === 'roast') {
    return `## 🔥 Score: ${score}/100 | Grade: ${grade}

### First Impressions
"${analysis.title}" - ${score < 70 ? "Yikes. Did an intern name this during a coffee break?" : "Okay, the title doesn't make me want to close the tab. Low bar, but cleared."}

### Technical Roast
- HTTPS: ${analysis.hasHttps ? "✅ At least you're not completely living in 2005" : "🚨 NO HTTPS?! Chrome is literally warning people about you"}
- Mobile: ${analysis.hasViewport ? "✅ Won't look like a postage stamp on phones" : "❌ No viewport = mobile users are squinting"}
- Images: ${analysis.imagesWithoutAlt > 0 ? `${analysis.imagesWithoutAlt} images playing hide and seek with alt text` : "Alt texts present, someone cares about accessibility"}

### What Actually Works
${analysis.hasHttps ? "You have HTTPS, so you're not completely hopeless." : "The site... loads? That's something."}

### The Verdict
${score < 60 ? "This website needs CPR." : score < 80 ? "Mediocre. The beige of websites." : "Surprisingly not terrible."}

### Quick Fixes (Do These NOW)
1. ${!analysis.hasHttps ? "Get HTTPS immediately - it's free with Let's Encrypt" : analysis.imagesWithoutAlt > 0 ? "Add alt text to images" : "Optimize page speed"}
2. ${!analysis.metaDescription || analysis.metaDescription === 'No meta description' ? "Add a meta description for SEO" : "Review heading hierarchy"}
3. ${!analysis.hasViewport ? "Add viewport meta tag for mobile" : "Add more clear CTAs"}`;
  } else {
    return `## 📊 Score: ${score}/100 | Grade: ${grade}

### Overview
"${analysis.title}" presents a ${score >= 70 ? "solid foundation" : "functional but improvable"} website that ${score >= 70 ? "follows many best practices" : "needs attention in several key areas"}.

### Technical Assessment
- **Security**: ${analysis.hasHttps ? "✅ HTTPS enabled" : "⚠️ Missing HTTPS - critical issue"}
- **Mobile**: ${analysis.hasViewport ? "✅ Viewport configured" : "⚠️ No viewport meta - poor mobile experience"}
- **SEO**: ${analysis.metaDescription !== 'No meta description' ? "✅ Meta description present" : "⚠️ Missing meta description"}
- **Accessibility**: ${analysis.imagesWithoutAlt === 0 ? "✅ Images have alt text" : `⚠️ ${analysis.imagesWithoutAlt} images need alt text`}

### Strengths
${analysis.hasHttps ? "SSL certificate properly configured. " : ""}${analysis.hasViewport ? "Mobile-responsive setup. " : ""}${analysis.h1Count === 1 ? "Proper heading structure." : ""}

### Priority Improvements
1. ${!analysis.hasHttps ? "**Implement SSL** - Essential for security and SEO" : "**Optimize performance** - Review load times"}
2. ${analysis.imagesWithoutAlt > 0 ? "**Add alt text** - Improves accessibility and SEO" : "**Enhance meta tags** - Better search visibility"}
3. ${!analysis.hasViewport ? "**Add viewport meta** - Critical for mobile users" : "**Review CTAs** - Ensure clear user actions"}

### Summary
This website scores ${score}/100. ${score >= 70 ? "It has a solid foundation with room for optimization." : "Focus on the priority improvements above to significantly enhance user experience and search visibility."}`;
  }
}

function getMockLandingPage(info) {
  // Parse features into array
  const featureList = (info.features || 'Quality service, Fast delivery, Great support').split(',').map(f => f.trim());
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${info.name} - ${info.description}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1a1a2e; background: #fff; }
    
    /* Navigation */
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; z-index: 100; border-bottom: 1px solid #eee; }
    .logo { font-weight: 800; font-size: 1.4rem; color: #6366f1; }
    .nav-btn { background: #6366f1; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; }
    .nav-btn:hover { background: #4f46e5; transform: translateY(-1px); }
    
    /* Hero */
    .hero { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); color: white; padding: 140px 24px 100px; text-align: center; position: relative; overflow: hidden; }
    .hero::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%); animation: pulse 15s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
    .hero-content { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 50px; font-size: 0.85rem; margin-bottom: 24px; backdrop-filter: blur(10px); }
    .hero h1 { font-size: 3.5rem; font-weight: 800; margin-bottom: 20px; line-height: 1.1; }
    .hero p { font-size: 1.25rem; margin-bottom: 32px; opacity: 0.95; max-width: 600px; margin-left: auto; margin-right: auto; }
    .cta-btn { display: inline-block; background: white; color: #6366f1; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 1.1rem; transition: all 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
    .cta-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
    
    /* Features */
    .features { padding: 100px 24px; max-width: 1100px; margin: 0 auto; }
    .section-header { text-align: center; margin-bottom: 60px; }
    .section-header h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 16px; color: #1a1a2e; }
    .section-header p { color: #64748b; font-size: 1.1rem; }
    .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px; }
    .feature-card { background: #f8fafc; padding: 36px; border-radius: 20px; text-align: center; transition: all 0.3s; border: 1px solid #e2e8f0; }
    .feature-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
    .feature-icon { width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 20px; }
    .feature-card h3 { font-size: 1.3rem; font-weight: 700; margin-bottom: 12px; color: #1a1a2e; }
    .feature-card p { color: #64748b; line-height: 1.7; }
    
    /* Social Proof */
    .social-proof { background: #f8fafc; padding: 80px 24px; text-align: center; }
    .social-proof h2 { font-size: 2rem; font-weight: 700; margin-bottom: 40px; }
    .stats { display: flex; justify-content: center; gap: 60px; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-number { font-size: 3rem; font-weight: 800; color: #6366f1; }
    .stat-label { color: #64748b; font-size: 0.95rem; }
    
    /* CTA Section */
    .cta-section { background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%); padding: 100px 24px; text-align: center; color: white; }
    .cta-section h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 16px; }
    .cta-section p { opacity: 0.8; margin-bottom: 32px; font-size: 1.1rem; }
    .cta-section .cta-btn { background: #6366f1; color: white; }
    .cta-section .cta-btn:hover { background: #4f46e5; }
    
    /* Contact */
    .contact { padding: 80px 24px; text-align: center; }
    .contact h2 { font-size: 2rem; font-weight: 700; margin-bottom: 24px; }
    .contact-info { font-size: 1.2rem; color: #6366f1; font-weight: 600; }
    
    /* Footer */
    footer { background: #1a1a2e; color: white; padding: 40px 24px; text-align: center; }
    footer p { opacity: 0.7; }
    
    @media (max-width: 768px) {
      .hero h1 { font-size: 2.2rem; }
      .hero { padding: 120px 20px 80px; }
      .stats { gap: 40px; }
      .stat-number { font-size: 2.2rem; }
    }
  </style>
</head>
<body>
  <nav>
    <div class="logo">${info.name}</div>
    <a href="#contact" class="nav-btn">${info.cta}</a>
  </nav>
  
  <section class="hero">
    <div class="hero-content">
      <div class="badge">✨ Welcome to ${info.name}</div>
      <h1>${info.description}</h1>
      <p>We help ${info.targetCustomer || 'people like you'} achieve their goals with our exceptional service and dedication to quality.</p>
      <a href="#contact" class="cta-btn">${info.cta} →</a>
    </div>
  </section>
  
  <section class="features">
    <div class="section-header">
      <h2>Why Choose ${info.name}?</h2>
      <p>Here's what makes us different</p>
    </div>
    <div class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon">⭐</div>
        <h3>${featureList[0] || 'Quality Service'}</h3>
        <p>We're committed to delivering the highest quality in everything we do. Your satisfaction is our priority.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🚀</div>
        <h3>${featureList[1] || 'Fast & Reliable'}</h3>
        <p>Quick turnaround times without compromising on quality. We value your time as much as you do.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">💎</div>
        <h3>${featureList[2] || 'Premium Experience'}</h3>
        <p>From start to finish, enjoy a seamless experience that exceeds your expectations.</p>
      </div>
    </div>
  </section>
  
  <section class="social-proof">
    <h2>Trusted by Many</h2>
    <div class="stats">
      <div class="stat">
        <div class="stat-number">500+</div>
        <div class="stat-label">Happy Customers</div>
      </div>
      <div class="stat">
        <div class="stat-number">98%</div>
        <div class="stat-label">Satisfaction Rate</div>
      </div>
      <div class="stat">
        <div class="stat-number">24/7</div>
        <div class="stat-label">Support Available</div>
      </div>
    </div>
  </section>
  
  <section class="cta-section">
    <h2>Ready to Get Started?</h2>
    <p>Join hundreds of satisfied customers today</p>
    <a href="#contact" class="cta-btn">${info.cta} →</a>
  </section>
  
  <section class="contact" id="contact">
    <h2>Get In Touch</h2>
    <p class="contact-info">${info.contact}</p>
  </section>
  
  <footer>
    <p>&copy; ${new Date().getFullYear()} ${info.name}. All rights reserved.</p>
  </footer>
</body>
</html>`;
}

// API Routes
app.post('/api/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const result = await fetchWebsite(url);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const [roastFeedback, professionalFeedback] = await Promise.all([
      generateRoast(result.analysis, 'roast'),
      generateRoast(result.analysis, 'professional')
    ]);
    
    res.json({
      success: true,
      analysis: result.analysis,
      roastFeedback,
      professionalFeedback
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze website' });
  }
});

app.post('/api/generate-landing', async (req, res) => {
  try {
    const { name, description, targetCustomer, features, cta, contact } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({ error: 'Business name and description are required' });
    }
    
    const html = await generateLandingPage({
      name,
      description,
      targetCustomer: targetCustomer || 'everyone',
      features: features || 'Quality service',
      cta: cta || 'Get Started',
      contact: contact || 'Contact us for more info'
    });
    
    res.json({ success: true, html });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Failed to generate landing page' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    aiConnected: !!GEMINI_API_KEY,
    mode: GEMINI_API_KEY ? 'live' : 'demo'
  });
});

app.listen(PORT, () => {
  console.log(`🔥 Roast2Site running at http://localhost:${PORT}`);
  console.log(`📡 AI Mode: ${GEMINI_API_KEY ? 'LIVE (Gemini connected)' : 'DEMO (no API key)'}`);
});
