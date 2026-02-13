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

// Smart analysis (no external API needed)
function generateRoast(analysis, style = 'roast') {
  // Calculate score based on real factors
  let score = 40; // Base score
  
  if (analysis.hasHttps) score += 15;
  if (analysis.hasViewport) score += 12;
  if (analysis.metaDescription && analysis.metaDescription !== 'No meta description') score += 10;
  if (analysis.h1Count === 1) score += 8;
  if (analysis.h1Count > 1) score += 4;
  if (analysis.imagesWithoutAlt === 0 && analysis.imageCount > 0) score += 8;
  if (analysis.hasFavicon) score += 5;
  if (analysis.buttonCount > 0) score += 4;
  if (analysis.formCount > 0) score += 3;
  
  // Penalties
  if (analysis.imagesWithoutAlt > 5) score -= 10;
  if (!analysis.hasHttps) score -= 5;
  if (analysis.scriptCount > 20) score -= 5;
  
  score = Math.min(100, Math.max(0, score));
  
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B+' : score >= 70 ? 'B' : score >= 60 ? 'C+' : score >= 50 ? 'C' : score >= 40 ? 'D' : 'F';
  
  const domain = analysis.url.replace(/^https?:\/\//, '').split('/')[0];
  
  if (style === 'roast') {
    return `## 🔥 Score: ${score}/100 | Grade: ${grade}

### First Impressions
${analysis.title === 'No title found' 
  ? `No page title? Did someone forget to finish building this site? It's like showing up to a job interview without pants - technically you're there, but something's very wrong.`
  : score < 50 
    ? `"${analysis.title}" - I've seen more inspiring titles on spam emails. Was this written during a caffeine crash?`
    : score < 70
      ? `"${analysis.title}" - It's... fine? Like gas station sushi. It exists, it won't kill you, but you won't remember it tomorrow.`
      : `"${analysis.title}" - Okay, not terrible. You've cleared the very low bar of "having a title that makes sense."`}

### Technical Roast 🔧
${!analysis.hasHttps 
  ? `- 🚨 **NO HTTPS?!** It's ${new Date().getFullYear()}, not 2005! Chrome is literally warning visitors that your site is "Not Secure." Fix this immediately - Let's Encrypt is FREE.`
  : `- ✅ HTTPS enabled - congrats on doing the bare minimum for security in ${new Date().getFullYear()}.`}

${!analysis.hasViewport 
  ? `- 📱 **No viewport meta tag** - Your mobile users are currently pinching and zooming like it's 2010. Half your traffic is mobile. HALF.`
  : `- ✅ Mobile viewport configured - at least it won't look like a postage stamp on phones.`}

${analysis.metaDescription === 'No meta description'
  ? `- 🔍 **No meta description** - Google has literally no idea what you do. You're invisible in search results. Congrats?`
  : `- ✅ Meta description exists - Google at least knows you're alive.`}

${analysis.imagesWithoutAlt > 0
  ? `- 🖼️ **${analysis.imagesWithoutAlt} images without alt text** - Screen readers hate you. Google hates you. Accessibility lawsuits love you.`
  : analysis.imageCount > 0 
    ? `- ✅ All ${analysis.imageCount} images have alt text - someone actually cares about accessibility!`
    : `- 🤷 No images found - either very minimalist or very broken.`}

${analysis.h1Count === 0
  ? `- 📰 **No H1 tag** - The most important heading on your page... doesn't exist. Google is confused. I'm confused.`
  : analysis.h1Count > 1
    ? `- ⚠️ **${analysis.h1Count} H1 tags** - There should be ONE. You have ${analysis.h1Count}. It's not a competition.`
    : `- ✅ Single H1 tag - proper heading hierarchy. Gold star.`}

### What Actually Works ✨
${score >= 70 
  ? `Honestly? This site isn't bad. ${analysis.hasHttps ? 'HTTPS is there. ' : ''}${analysis.hasViewport ? 'Mobile works. ' : ''}${analysis.h1Count === 1 ? 'Heading structure is solid. ' : ''}You're ahead of like 60% of the internet.`
  : score >= 50
    ? `Well... it loads. That's something. ${analysis.hasHttps ? 'At least you have HTTPS, ' : ''}${analysis.hasViewport ? 'and it shows on mobile. ' : ''}Could be worse.`
    : `It... exists? The server responded? Look, we're grasping at straws here.`}

### The Verdict 🎯
${score >= 80 ? `Not bad at all. A few tweaks and you're golden.` 
  : score >= 60 ? `Mediocre. The Honda Civic of websites - it works, nobody's impressed.`
  : score >= 40 ? `This website needs therapy. And probably a rebuild.`
  : `I've seen better websites made by accident. This needs serious help.`}

### Quick Fixes (Do These NOW) 🛠️
1. ${!analysis.hasHttps ? `**Get HTTPS immediately** - It's free with Let's Encrypt and takes 10 minutes.` 
     : analysis.imagesWithoutAlt > 0 ? `**Add alt text to all ${analysis.imagesWithoutAlt} images** - Takes 20 minutes, helps SEO and accessibility.`
     : analysis.metaDescription === 'No meta description' ? `**Write a meta description** - 150-160 characters describing what you do. Critical for search.`
     : `**Optimize page speed** - Compress images, minimize scripts.`}
2. ${analysis.metaDescription === 'No meta description' && analysis.hasHttps ? `**Add a meta description** - Google will thank you.`
     : !analysis.hasViewport ? `**Add viewport meta tag** - One line of code for mobile users.`
     : analysis.h1Count !== 1 ? `**Fix your heading structure** - One H1, then H2s, H3s in order.`
     : `**Review your content** - Make sure your value proposition is clear above the fold.`}
3. ${!analysis.hasFavicon ? `**Add a favicon** - That tiny icon in the browser tab. Looks unprofessional without it.`
     : analysis.buttonCount === 0 ? `**Add clear call-to-action buttons** - Tell visitors what to do next!`
     : `**Set up Google Analytics** - Know who's visiting and what they're doing.`}`;
  } else {
    // Professional mode
    return `## 📊 Score: ${score}/100 | Grade: ${grade}

### Executive Summary
**${domain}** ${score >= 70 ? 'demonstrates solid web fundamentals with room for optimization' : score >= 50 ? 'has a functional foundation that requires attention in several key areas' : 'needs significant improvements to meet modern web standards'}. This analysis covers security, mobile compatibility, SEO, and accessibility factors.

### Technical Assessment

**🔒 Security & SSL**
${analysis.hasHttps 
  ? `✅ **HTTPS Enabled** - SSL certificate is active, providing encrypted connections and building user trust.`
  : `⚠️ **HTTPS Missing** - Critical issue. Sites without HTTPS are flagged as "Not Secure" by browsers and penalized by search engines. Implement SSL immediately using Let's Encrypt (free) or your hosting provider.`}

**📱 Mobile Responsiveness**  
${analysis.hasViewport
  ? `✅ **Viewport Configured** - The site includes proper viewport meta tags for mobile display.`
  : `⚠️ **Viewport Missing** - Mobile users (50%+ of traffic) will have a poor experience. Add: \`<meta name="viewport" content="width=device-width, initial-scale=1">\``}

**🔍 SEO Foundations**
- Title Tag: ${analysis.title !== 'No title found' ? `✅ Present ("${analysis.title.substring(0, 50)}${analysis.title.length > 50 ? '...' : ''}")` : '⚠️ Missing - Critical for search visibility'}
- Meta Description: ${analysis.metaDescription !== 'No meta description' ? '✅ Present' : '⚠️ Missing - Impacts click-through rates from search results'}
- H1 Structure: ${analysis.h1Count === 1 ? '✅ Single H1 (correct)' : analysis.h1Count === 0 ? '⚠️ No H1 found' : `⚠️ ${analysis.h1Count} H1 tags (should be 1)`}

**♿ Accessibility**
- Images with Alt Text: ${analysis.imagesWithoutAlt === 0 && analysis.imageCount > 0 ? `✅ All ${analysis.imageCount} images have alt text` : analysis.imageCount === 0 ? '➖ No images detected' : `⚠️ ${analysis.imagesWithoutAlt} of ${analysis.imageCount} images missing alt text`}
- Favicon: ${analysis.hasFavicon ? '✅ Present' : '⚠️ Missing'}

**📈 Engagement Elements**
- Forms: ${analysis.formCount > 0 ? `✅ ${analysis.formCount} form(s) detected` : '➖ No forms detected'}
- CTAs/Buttons: ${analysis.buttonCount > 0 ? `✅ ${analysis.buttonCount} button(s) detected` : '⚠️ No clear CTAs found'}

### Strengths
${score >= 60 ? `
- ${analysis.hasHttps ? 'Secure HTTPS connection established' : ''}
- ${analysis.hasViewport ? 'Mobile-responsive viewport configuration' : ''}
- ${analysis.h1Count === 1 ? 'Proper heading hierarchy' : ''}
- ${analysis.imagesWithoutAlt === 0 && analysis.imageCount > 0 ? 'Complete image accessibility' : ''}
`.split('\n').filter(line => line.trim().startsWith('-')).join('\n') || '- Site is accessible and loads correctly' : '- The website loads and is accessible'}

### Priority Recommendations

**1. ${!analysis.hasHttps ? 'Implement HTTPS (Critical)' : analysis.imagesWithoutAlt > 0 ? 'Add Missing Alt Text' : analysis.metaDescription === 'No meta description' ? 'Add Meta Description' : 'Performance Optimization'}**
${!analysis.hasHttps 
  ? 'SSL is mandatory for modern websites. Use Let\'s Encrypt for a free certificate or check with your hosting provider for one-click SSL setup.'
  : analysis.imagesWithoutAlt > 0 
    ? `Add descriptive alt text to ${analysis.imagesWithoutAlt} images. This improves SEO and makes your site accessible to screen reader users.`
    : analysis.metaDescription === 'No meta description'
      ? 'Write a compelling 150-160 character description of your page. This appears in search results and impacts click-through rates.'
      : 'Review Core Web Vitals. Consider image compression, lazy loading, and minimizing render-blocking scripts.'}

**2. ${!analysis.hasViewport ? 'Add Viewport Meta Tag' : analysis.h1Count !== 1 ? 'Fix Heading Structure' : 'Content Review'}**
${!analysis.hasViewport 
  ? 'Essential for mobile users. Add the viewport meta tag to your <head> section.'
  : analysis.h1Count !== 1 
    ? `Restructure to use exactly one H1 tag per page, with H2s and H3s for subsections.`
    : 'Ensure your value proposition is clear within the first viewport. Users decide in 3 seconds whether to stay.'}

**3. ${!analysis.hasFavicon ? 'Add Favicon' : 'Analytics Setup'}**
${!analysis.hasFavicon 
  ? 'A favicon improves brand recognition and makes your site look professional in browser tabs and bookmarks.'
  : 'If not already configured, set up Google Analytics or a privacy-focused alternative to understand user behavior.'}

### Summary
This website scores **${score}/100** (Grade: ${grade}). ${
  score >= 80 ? 'It demonstrates strong fundamentals. Focus on optimization and content strategy for continued improvement.'
  : score >= 60 ? 'The foundation is solid but requires attention to the recommendations above to meet modern standards.'
  : score >= 40 ? 'Several critical issues need addressing. Prioritize HTTPS, mobile compatibility, and SEO basics.'
  : 'Significant work is needed to bring this site up to standard. Consider a systematic approach starting with security and mobile responsiveness.'}`;
  }
}

// Generate landing page (smart template)
function generateLandingPage(businessInfo) {
  const featureList = (businessInfo.features || 'Quality service, Fast delivery, Great support').split(',').map(f => f.trim());
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessInfo.name} - ${businessInfo.description}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1a1a2e; background: #fff; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; z-index: 100; border-bottom: 1px solid #eee; }
    .logo { font-weight: 800; font-size: 1.4rem; color: #6366f1; }
    .nav-btn { background: #6366f1; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; }
    .nav-btn:hover { background: #4f46e5; transform: translateY(-1px); }
    .hero { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); color: white; padding: 140px 24px 100px; text-align: center; position: relative; overflow: hidden; }
    .hero::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%); animation: pulse 15s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
    .hero-content { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 50px; font-size: 0.85rem; margin-bottom: 24px; backdrop-filter: blur(10px); }
    .hero h1 { font-size: 3.5rem; font-weight: 800; margin-bottom: 20px; line-height: 1.1; }
    .hero p { font-size: 1.25rem; margin-bottom: 32px; opacity: 0.95; max-width: 600px; margin-left: auto; margin-right: auto; }
    .cta-btn { display: inline-block; background: white; color: #6366f1; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 1.1rem; transition: all 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
    .cta-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
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
    .social-proof { background: #f8fafc; padding: 80px 24px; text-align: center; }
    .social-proof h2 { font-size: 2rem; font-weight: 700; margin-bottom: 40px; }
    .stats { display: flex; justify-content: center; gap: 60px; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-number { font-size: 3rem; font-weight: 800; color: #6366f1; }
    .stat-label { color: #64748b; font-size: 0.95rem; }
    .cta-section { background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%); padding: 100px 24px; text-align: center; color: white; }
    .cta-section h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 16px; }
    .cta-section p { opacity: 0.8; margin-bottom: 32px; font-size: 1.1rem; }
    .cta-section .cta-btn { background: #6366f1; color: white; }
    .cta-section .cta-btn:hover { background: #4f46e5; }
    .contact { padding: 80px 24px; text-align: center; }
    .contact h2 { font-size: 2rem; font-weight: 700; margin-bottom: 24px; }
    .contact-info { font-size: 1.2rem; color: #6366f1; font-weight: 600; }
    footer { background: #1a1a2e; color: white; padding: 40px 24px; text-align: center; }
    footer p { opacity: 0.7; }
    @media (max-width: 768px) { .hero h1 { font-size: 2.2rem; } .hero { padding: 120px 20px 80px; } .stats { gap: 40px; } .stat-number { font-size: 2.2rem; } }
  </style>
</head>
<body>
  <nav>
    <div class="logo">${businessInfo.name}</div>
    <a href="#contact" class="nav-btn">${businessInfo.cta}</a>
  </nav>
  <section class="hero">
    <div class="hero-content">
      <div class="badge">✨ Welcome to ${businessInfo.name}</div>
      <h1>${businessInfo.description}</h1>
      <p>We help ${businessInfo.targetCustomer || 'people like you'} achieve their goals with our exceptional service and dedication to quality.</p>
      <a href="#contact" class="cta-btn">${businessInfo.cta} →</a>
    </div>
  </section>
  <section class="features">
    <div class="section-header">
      <h2>Why Choose ${businessInfo.name}?</h2>
      <p>Here's what makes us different</p>
    </div>
    <div class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon">⭐</div>
        <h3>${featureList[0] || 'Quality Service'}</h3>
        <p>We're committed to delivering the highest quality in everything we do.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🚀</div>
        <h3>${featureList[1] || 'Fast & Reliable'}</h3>
        <p>Quick turnaround times without compromising on quality.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">💎</div>
        <h3>${featureList[2] || 'Premium Experience'}</h3>
        <p>From start to finish, enjoy a seamless experience.</p>
      </div>
    </div>
  </section>
  <section class="social-proof">
    <h2>Trusted by Many</h2>
    <div class="stats">
      <div class="stat"><div class="stat-number">500+</div><div class="stat-label">Happy Customers</div></div>
      <div class="stat"><div class="stat-number">98%</div><div class="stat-label">Satisfaction Rate</div></div>
      <div class="stat"><div class="stat-number">24/7</div><div class="stat-label">Support</div></div>
    </div>
  </section>
  <section class="cta-section">
    <h2>Ready to Get Started?</h2>
    <p>Join hundreds of satisfied customers today</p>
    <a href="#contact" class="cta-btn">${businessInfo.cta} →</a>
  </section>
  <section class="contact" id="contact">
    <h2>Get In Touch</h2>
    <p class="contact-info">${businessInfo.contact}</p>
  </section>
  <footer><p>&copy; ${new Date().getFullYear()} ${businessInfo.name}. All rights reserved.</p></footer>
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
    
    const roastFeedback = generateRoast(result.analysis, 'roast');
    const professionalFeedback = generateRoast(result.analysis, 'professional');
    
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
    
    const html = generateLandingPage({
      name,
      description,
      targetCustomer: targetCustomer || 'everyone',
      features: features || 'Quality service, Fast delivery, Great support',
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
  res.json({ status: 'ok', mode: 'smart-analysis' });
});

app.listen(PORT, () => {
  console.log(`🔥 Roast2Site running at http://localhost:${PORT}`);
  console.log(`📡 Mode: Smart Analysis (no external API needed)`);
});
