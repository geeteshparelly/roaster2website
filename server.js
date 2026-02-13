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
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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
  
  return getMockLandingPage(businessInfo);
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
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${info.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 80px 20px; text-align: center; }
    .hero h1 { font-size: 2.5rem; margin-bottom: 16px; }
    .hero p { font-size: 1.2rem; margin-bottom: 24px; opacity: 0.9; max-width: 600px; margin-left: auto; margin-right: auto; }
    .btn { display: inline-block; background: white; color: #667eea; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: transform 0.2s, box-shadow 0.2s; }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
    .features { padding: 60px 20px; max-width: 1000px; margin: 0 auto; }
    .features h2 { text-align: center; margin-bottom: 40px; font-size: 2rem; }
    .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .feature { background: #f8f9fa; padding: 24px; border-radius: 12px; text-align: center; }
    .feature h3 { color: #667eea; margin-bottom: 12px; }
    .contact { background: #f8f9fa; padding: 60px 20px; text-align: center; }
    .contact h2 { margin-bottom: 16px; }
    .contact p { color: #666; }
    footer { background: #333; color: white; padding: 24px; text-align: center; }
  </style>
</head>
<body>
  <section class="hero">
    <h1>${info.name}</h1>
    <p>${info.description}</p>
    <a href="#contact" class="btn">${info.cta}</a>
  </section>
  <section class="features">
    <h2>Why Choose Us</h2>
    <div class="feature-grid">
      <div class="feature"><h3>Quality</h3><p>${info.features || 'We deliver excellence'}</p></div>
      <div class="feature"><h3>Our Customers</h3><p>We serve ${info.targetCustomer || 'businesses like yours'}</p></div>
      <div class="feature"><h3>Results</h3><p>Get started today and see the difference</p></div>
    </div>
  </section>
  <section class="contact" id="contact">
    <h2>Get In Touch</h2>
    <p>${info.contact}</p>
  </section>
  <footer><p>&copy; ${new Date().getFullYear()} ${info.name}</p></footer>
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
