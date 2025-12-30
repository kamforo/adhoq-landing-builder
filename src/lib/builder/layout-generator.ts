import type { PageAnalysis, LPFlow, FlowStage } from '@/types/analyzer';
import type { BuildOptions } from '@/types/builder';
import type { LLMProvider } from '@/lib/llm';

/**
 * Generate a completely new landing page layout based on the analysis
 * IMPORTANT: Preserves the LP Flow (funnel structure) while changing the visual design
 */
export async function generateNewLayout(
  analysis: PageAnalysis,
  options: BuildOptions,
  llm: LLMProvider
): Promise<string> {
  const lpFlow = analysis.lpFlow;

  // Extract key content from analysis
  const headlines = analysis.components.headlines.map(h => h.text).slice(0, 5);
  const buttons = analysis.components.buttons.map(b => ({
    text: b.text,
    url: b.href,
  })).slice(0, 3);

  // Build section order from flow stages
  const sectionOrder = lpFlow.stages.map(s => `${s.order}. ${s.sectionType} (${s.purpose})${s.hasCtaButton ? ' [CTA]' : ''}`);

  const prompt = `You are an expert landing page designer. Generate a complete, modern HTML landing page.

## CRITICAL: Preserve the LP Flow Structure
The page MUST follow this exact funnel flow (order and purpose):
${sectionOrder.join('\n')}

Flow Type: ${lpFlow.type}
Framework: ${lpFlow.framework || 'custom'}
CTA Strategy: "${lpFlow.ctaStrategy.primaryCta}" appears ${lpFlow.ctaStrategy.ctaFrequency === 'repeated' ? 'multiple times' : lpFlow.ctaStrategy.ctaFrequency === 'progressive' ? 'with evolving text' : 'once'}

## Messaging Flow to Preserve
${lpFlow.messagingFlow.hook ? `- Hook: "${lpFlow.messagingFlow.hook}"` : ''}
${lpFlow.messagingFlow.problem ? `- Problem: "${lpFlow.messagingFlow.problem}"` : ''}
${lpFlow.messagingFlow.solution ? `- Solution: "${lpFlow.messagingFlow.solution}"` : ''}
${lpFlow.messagingFlow.benefits?.length ? `- Benefits: ${lpFlow.messagingFlow.benefits.join(', ')}` : ''}
${lpFlow.messagingFlow.urgency ? `- Urgency: "${lpFlow.messagingFlow.urgency}"` : ''}
${lpFlow.messagingFlow.guarantee ? `- Guarantee: "${lpFlow.messagingFlow.guarantee}"` : ''}

## Headlines (preserve the messaging)
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

## Call-to-Action
Primary CTA: "${lpFlow.ctaStrategy.primaryCta}" → ${lpFlow.ctaStrategy.primaryCtaUrl || buttons[0]?.url || '#'}

## Design Requirements (CHANGE the design, KEEP the flow)
- Create a COMPLETELY NEW modern visual design
- Use a fresh, professional color scheme (different from original)
- MUST include all sections in the EXACT order specified above
- Preserve the headline messaging but you may improve wording slightly
- Place CTAs in the same positions as specified in the flow
- Make it mobile-responsive with inline styles
- Use modern typography, shadows, and rounded corners
- Ensure all CTA buttons link to: ${lpFlow.ctaStrategy.primaryCtaUrl || buttons[0]?.url || '#'}

## Technical Requirements
- Generate complete, valid HTML with inline CSS
- Use Google Fonts (Inter for body, Poppins for headings)
- Include viewport meta tag for mobile
- Make it a single self-contained HTML file
- Do NOT use external CSS frameworks, use inline styles only
- Ensure proper contrast for accessibility

Generate ONLY the complete HTML code, no explanations. Start with <!DOCTYPE html> and end with </html>.`;

  try {
    const response = await llm.generateText(prompt, {
      temperature: options.textOptions.creativity,
      maxTokens: 8000,
      systemPrompt: 'You are an expert web designer who creates beautiful, high-converting landing pages. Output only valid HTML code.',
    });

    // Extract HTML from response
    let html = response.content;

    // Clean up if wrapped in code blocks
    if (html.includes('```html')) {
      html = html.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    } else if (html.includes('```')) {
      html = html.replace(/```\n?/g, '');
    }

    // Ensure it starts with doctype
    if (!html.trim().toLowerCase().startsWith('<!doctype')) {
      html = '<!DOCTYPE html>\n' + html;
    }

    return html.trim();
  } catch (error) {
    console.error('Layout generation failed:', error);
    throw new Error('Failed to generate new layout');
  }
}

/**
 * Generate a simple fallback layout if AI fails
 */
export function generateFallbackLayout(analysis: PageAnalysis): string {
  const mainHeadline = analysis.components.headlines[0]?.text || 'Welcome';
  const subHeadline = analysis.components.headlines[1]?.text || 'Discover what we have to offer';
  const ctaButton = analysis.components.buttons[0];
  const ctaText = ctaButton?.text || 'Get Started';
  const ctaUrl = ctaButton?.href || '#';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${mainHeadline}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #1f2937; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
    .hero { min-height: 80vh; display: flex; align-items: center; justify-content: center; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .hero h1 { font-family: 'Poppins', sans-serif; font-size: clamp(2rem, 5vw, 3.5rem); margin-bottom: 1rem; }
    .hero p { font-size: 1.25rem; opacity: 0.9; margin-bottom: 2rem; max-width: 600px; }
    .btn { display: inline-block; padding: 16px 40px; background: #fbbf24; color: #1e3a8a; font-weight: 600; text-decoration: none; border-radius: 8px; font-size: 1.1rem; transition: transform 0.2s, box-shadow 0.2s; }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
    .features { padding: 80px 0; background: #f9fafb; }
    .features h2 { font-family: 'Poppins', sans-serif; text-align: center; font-size: 2rem; margin-bottom: 3rem; }
    .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; }
    .feature { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .feature h3 { font-size: 1.25rem; margin-bottom: 0.5rem; color: #667eea; }
    .cta-section { padding: 80px 0; text-align: center; background: #1e3a8a; color: white; }
    .cta-section h2 { font-family: 'Poppins', sans-serif; font-size: 2rem; margin-bottom: 1rem; }
    .cta-section p { margin-bottom: 2rem; opacity: 0.9; }
    footer { padding: 40px 0; text-align: center; background: #111827; color: #9ca3af; }
  </style>
</head>
<body>
  <section class="hero">
    <div class="container">
      <h1>${mainHeadline}</h1>
      <p>${subHeadline}</p>
      <a href="${ctaUrl}" class="btn">${ctaText}</a>
    </div>
  </section>

  <section class="features">
    <div class="container">
      <h2>Why Choose Us</h2>
      <div class="feature-grid">
        <div class="feature">
          <h3>Quality</h3>
          <p>We deliver exceptional quality in everything we do.</p>
        </div>
        <div class="feature">
          <h3>Speed</h3>
          <p>Fast turnaround times without compromising on quality.</p>
        </div>
        <div class="feature">
          <h3>Support</h3>
          <p>24/7 customer support to help you succeed.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="cta-section">
    <div class="container">
      <h2>Ready to Get Started?</h2>
      <p>Join thousands of satisfied customers today.</p>
      <a href="${ctaUrl}" class="btn">${ctaText}</a>
    </div>
  </section>

  <footer>
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`;
}
