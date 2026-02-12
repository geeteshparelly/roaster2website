require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Anthropic client
const anthropic = process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Fetch and analyze website
async function fetchWebsite(url) {
  try {
    // Ensure URL has protocol
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
    
    // Extract key elements for analysis
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
      bodyText: $('body').text().replace(/\s+/g, ' ').trim().substring(0, 2000),
      hasFavicon: $('link[rel*="icon"]').length > 0,
      scriptCount: $('script').length,
      cssCount: $('link[rel="stylesheet"]').length + $('style').length,
      formCount: $('form').length,
      buttonCount: $('button').length + $('input[type="submit"]').length,
      socialLinks: {
        facebook: $('a[href*="facebook.com"]').length > 0,
        twitter: $('a[href*="twitter.com"], a[href*="x.com"]').length > 0,
        instagram: $('a[href*="instagram.com"]').length > 0,
        linkedin: $('a[href*="linkedin.com"]').length > 0
      }
    };
    
    return { success: true, analysis };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Generate roast using Claude
async function generateRoast(analysis, style = 'roast') {
  if (!anthropic) {
    // Return mock response if no API key
    return getMockResponse(analysis, style);
  }
  
  const prompt = style === 'roast' 
    ? `You are a brutally honest, sarcastic website critic with a great sense of humor. Analyze this website and ROAST it. Be funny, savage, but also helpful. Use emojis. Give it a grade (F to A+).

Website Analysis:
${JSON.stringify(analysis, null, 2)}

Format your response as:
1. Overall Grade: [grade]
2. First Impressions (roast the title/description)
3. Design Crimes (what looks bad)
4. Technical Sins (missing SEO, accessibility issues)
5. Content Critique (is the copy good?)
6. The Verdict (summary roast)
7. Redemption Path (3 quick fixes they NEED to make)

Be savage but constructive. Make them laugh, then make them fix their site.`
    : `You are a professional website consultant. Analyze this website and provide constructive, actionable feedback. Be encouraging but honest.

Website Analysis:
${JSON.stringify(analysis, null, 2)}

Format your response as:
1. Overall Grade: [grade]
2. First Impressions
3. Design Assessment
4. Technical Review (SEO, accessibility, performance)
5. Content Evaluation
6. Summary
7. Top 3 Priority Improvements

Be professional, helpful, and specific with recommendations.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return message.content[0].text;
}

// Generate landing page using Claude
async function generateLandingPage(businessInfo) {
  if (!anthropic) {
    return getMockLandingPage(businessInfo);
  }
  
  const prompt = `Create a complete, beautiful, modern HTML landing page for this business. Include inline CSS (no external files). Make it responsive and professional.

Business Info:
- Name: ${businessInfo.name}
- Description: ${businessInfo.description}
- Target Customer: ${businessInfo.targetCustomer}
- Key Features/Benefits: ${businessInfo.features}
- Call to Action: ${businessInfo.cta}
- Contact: ${businessInfo.contact}

Requirements:
1. Modern, clean design with a professional color scheme
2. Hero section with headline and CTA button
3. Features/benefits section
4. About section
5. Contact section with the provided info
6. Footer
7. Fully responsive (mobile-friendly)
8. Use modern CSS (flexbox/grid)
9. Include subtle animations/hover effects
10. Make the CTA button stand out

Return ONLY the complete HTML code, no explanation. Start with <!DOCTYPE html>`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return message.content[0].text;
}

// Mock responses for testing without API key
function getMockResponse(analysis, style) {
  if (style === 'roast') {
    return `## 🔥 Overall Grade: C-

### First Impressions
"${analysis.title}" - Oh honey, did you let your cat walk across the keyboard when naming this? I've seen better titles on spam emails.

### Design Crimes 👮
- ${analysis.imageCount} images and ${analysis.imagesWithoutAlt} are playing hide and seek with alt text
- ${analysis.h1Count === 0 ? "NO H1 TAG?! Google is crying somewhere." : "At least you have an H1. Gold star for the bare minimum."}

### Technical Sins 💀
- ${analysis.hasHttps ? "HTTPS: ✅ (congrats on doing the bare minimum in 2024)" : "NO HTTPS?! It's not 2005 anymore!"}
- ${analysis.hasViewport ? "Mobile viewport: ✅" : "No viewport meta tag = your mobile users hate you"}
- ${!analysis.metaDescription || analysis.metaDescription === 'No meta description' ? "No meta description. Google has no idea what you do." : "Meta description exists. Shocking."}

### The Verdict 🎤
This website is like a participation trophy - it exists, and that's about all we can say for it.

### Redemption Path 🛤️
1. ${analysis.imagesWithoutAlt > 0 ? "Add alt text to your images (accessibility AND SEO)" : "Keep those alt texts"}
2. ${!analysis.hasHttps ? "GET HTTPS IMMEDIATELY" : "Optimize those images"}
3. Write a meta description that doesn't make people fall asleep

*[DEMO MODE - Connect API key for real AI analysis]*`;
  } else {
    return `## 📊 Overall Grade: C

### First Impressions
The website "${analysis.title}" presents a functional foundation that could benefit from strategic improvements.

### Design Assessment
- Images: ${analysis.imageCount} total (${analysis.imagesWithoutAlt} missing alt text)
- Heading structure: ${analysis.h1Count} H1 tag(s)
- Forms: ${analysis.formCount} | Buttons: ${analysis.buttonCount}

### Technical Review
- SSL Security: ${analysis.hasHttps ? "✅ Enabled" : "⚠️ Not detected"}
- Mobile Responsiveness: ${analysis.hasViewport ? "✅ Viewport configured" : "⚠️ Viewport meta missing"}
- SEO Basics: ${analysis.metaDescription !== 'No meta description' ? "✅ Meta description present" : "⚠️ Meta description missing"}

### Summary
Your website has a solid foundation but needs attention in several key areas to improve user experience and search visibility.

### Top 3 Priority Improvements
1. ${analysis.imagesWithoutAlt > 0 ? "Add descriptive alt text to all images" : "Optimize image file sizes"}
2. ${!analysis.hasHttps ? "Implement SSL certificate (HTTPS)" : "Review page load performance"}
3. ${analysis.metaDescription === 'No meta description' ? "Add compelling meta descriptions" : "Enhance heading hierarchy"}

*[DEMO MODE - Connect API key for real AI analysis]*`;
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
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 100px 20px; text-align: center; }
    .hero h1 { font-size: 3rem; margin-bottom: 20px; }
    .hero p { font-size: 1.3rem; margin-bottom: 30px; opacity: 0.9; }
    .btn { display: inline-block; background: #fff; color: #667eea; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-weight: bold; transition: transform 0.3s, box-shadow 0.3s; }
    .btn:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
    .features { padding: 80px 20px; max-width: 1200px; margin: 0 auto; }
    .features h2 { text-align: center; margin-bottom: 50px; font-size: 2.5rem; }
    .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
    .feature-card { background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; }
    .feature-card h3 { color: #667eea; margin-bottom: 15px; }
    .contact { background: #f8f9fa; padding: 80px 20px; text-align: center; }
    .contact h2 { margin-bottom: 30px; }
    footer { background: #333; color: white; padding: 30px; text-align: center; }
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
      <div class="feature-card">
        <h3>Quality Service</h3>
        <p>${info.features}</p>
      </div>
      <div class="feature-card">
        <h3>Our Customers</h3>
        <p>We serve ${info.targetCustomer}</p>
      </div>
      <div class="feature-card">
        <h3>Get Started</h3>
        <p>Ready to work with us? Reach out today!</p>
      </div>
    </div>
  </section>
  <section class="contact" id="contact">
    <h2>Contact Us</h2>
    <p>${info.contact}</p>
  </section>
  <footer>
    <p>&copy; 2024 ${info.name}. All rights reserved.</p>
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    apiConnected: !!anthropic,
    mode: anthropic ? 'live' : 'demo'
  });
});

app.listen(PORT, () => {
  console.log(`🔥 Roaster2Website running at http://localhost:${PORT}`);
  console.log(`📡 API Mode: ${anthropic ? 'LIVE (Claude connected)' : 'DEMO (no API key)'}`);
});
