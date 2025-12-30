import type { PageAnalysis, LPFlow, FlowStage } from '@/types/analyzer';
import type { BuildOptions } from '@/types/builder';
import type { LLMProvider } from '@/lib/llm';

// Vertical types for dating LPs
export type DatingVertical = 'adult' | 'casual' | 'mainstream';

/**
 * Detect the vertical (adult/casual/mainstream) from the page content
 */
export function detectVertical(analysis: PageAnalysis): DatingVertical {
  const html = analysis.html.toLowerCase();
  const headlines = analysis.components.headlines.map(h => h.text.toLowerCase()).join(' ');
  const allText = html + ' ' + headlines;

  // Adult indicators (explicit content)
  const adultKeywords = [
    'sex', 'hookup', 'hook up', 'one night', 'one-night', 'nsa', 'no strings',
    'adult', 'xxx', 'erotic', 'fetish', 'kink', 'bdsm', 'discreet affair',
    'cheating', 'married dating', 'affair', 'milf', 'cougar', 'fwb',
    'friends with benefits', 'booty call', 'casual sex', 'sexual',
    'nude', 'naked', 'explicit', '18+', 'over 18', 'body type',
    'turns you on', 'horny', 'hot singles', 'get laid'
  ];

  // Casual indicators (sexy but not explicit)
  const casualKeywords = [
    'casual dating', 'casual relationship', 'fun', 'flirt', 'chemistry',
    'spark', 'connection', 'meet singles', 'local singles', 'date tonight',
    'singles near', 'attractive', 'hot', 'sexy', 'passion', 'intimate',
    'adventurous', 'exciting', 'spontaneous', 'no commitment'
  ];

  // Count matches
  let adultScore = 0;
  let casualScore = 0;

  for (const keyword of adultKeywords) {
    if (allText.includes(keyword)) adultScore++;
  }

  for (const keyword of casualKeywords) {
    if (allText.includes(keyword)) casualScore++;
  }

  // Determine vertical
  if (adultScore >= 3) return 'adult';
  if (casualScore >= 2 || adultScore >= 1) return 'casual';
  return 'mainstream';
}

/**
 * Generate a completely new landing page layout based on the analysis
 * IMPORTANT: For multi-step flows, generates JS-driven pages where only one step is visible at a time
 */
export async function generateNewLayout(
  analysis: PageAnalysis,
  options: BuildOptions,
  llm: LLMProvider,
  vertical?: DatingVertical
): Promise<string> {
  const lpFlow = analysis.lpFlow;

  // Auto-detect vertical if not provided
  const detectedVertical = vertical || detectVertical(analysis);

  // For multi-step flows, generate a JS-driven page
  if (lpFlow.type === 'multi-step') {
    return generateMultiStepLayout(analysis, options, llm, detectedVertical);
  }

  // For other flow types, generate static layout
  return generateStaticLayout(analysis, options, llm, detectedVertical);
}

/**
 * Generate a JavaScript-driven multi-step landing page
 * Only one step is visible at a time, with smooth transitions
 */
async function generateMultiStepLayout(
  analysis: PageAnalysis,
  options: BuildOptions,
  llm: LLMProvider,
  vertical: DatingVertical
): Promise<string> {
  const lpFlow = analysis.lpFlow;
  const ctaUrl = lpFlow.ctaStrategy.primaryCtaUrl || '#';

  // Extract original images from the page
  const originalImages = analysis.components.images
    .filter(img => !img.isIcon && img.src)
    .map(img => img.src)
    .slice(0, 10);

  // Build questions from stages
  const questions = lpFlow.stages
    .filter(s => s.keyMessage && s.keyMessage.length > 5)
    .map(s => s.keyMessage!);

  // Get vertical-appropriate styling
  const verticalStyle = getVerticalStyle(vertical);

  const prompt = `You are an expert landing page designer specializing in high-converting multi-step quiz funnels.

## TASK
Generate a JavaScript-driven multi-step landing page where ONLY ONE QUESTION IS VISIBLE AT A TIME.
Users click buttons to progress through the steps. This is NOT a static page with all sections visible.

## VERTICAL: ${vertical.toUpperCase()} DATING
${verticalStyle.description}

## QUESTIONS TO INCLUDE (in this order)
${questions.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

## FLOW STRUCTURE
- Total Steps: ${questions.length}
- Flow Type: Multi-step quiz funnel
- Each step shows ONE question with Yes/No or multiple choice buttons
- Progress indicator showing current step (e.g., "Question 2/9")
- Final step redirects to: ${ctaUrl}

## IMAGES TO USE
${originalImages.length > 0 ? `Use these EXACT image URLs from the original page:\n${originalImages.slice(0, 5).map(img => `- ${img}`).join('\n')}` : 'Use placeholder images appropriate for the dating vertical'}

## DESIGN REQUIREMENTS
- Color scheme: ${verticalStyle.colors}
- Mood: ${verticalStyle.mood}
- Full-screen steps with centered content
- Large, tappable buttons (Yes/No style for most questions)
- Progress bar or step indicator at top
- Background image or gradient fitting the ${vertical} dating vertical
- Mobile-first, responsive design
- Smooth fade transitions between steps

## CRITICAL TECHNICAL REQUIREMENTS
Generate a SINGLE HTML file with embedded JavaScript that:
1. Has a questionList array with all questions
2. Shows only ONE step at a time (others are display:none)
3. Has nextStep() function that hides current and shows next
4. Tracks activeIndex for current step
5. Final step redirects to: ${ctaUrl}
6. Include proper viewport meta tag
7. Use inline styles, no external CSS frameworks
8. Progress indicator updates with each step

## JAVASCRIPT STRUCTURE REQUIRED
\`\`\`javascript
const questionList = [
  { question: "...", type: "yesno" }, // or type: "choice" with options array
  ...
];
let activeIndex = 0;

function showStep(index) { /* show only step[index], hide others */ }
function nextStep() { activeIndex++; if (activeIndex >= questionList.length) redirect(); else showStep(activeIndex); }
function redirect() { window.location.href = "${ctaUrl}"; }
\`\`\`

Generate ONLY the complete HTML code. Start with <!DOCTYPE html> and end with </html>.`;

  try {
    const response = await llm.generateText(prompt, {
      temperature: options.textOptions.creativity,
      maxTokens: 12000,
      systemPrompt: `You are an expert web designer who creates high-converting multi-step quiz landing pages for ${vertical} dating sites. You MUST generate JavaScript-driven pages where only one step is visible at a time. Output only valid HTML code with embedded JavaScript.`,
    });

    let html = response.content;
    html = cleanHtmlResponse(html);

    // Validate it has JavaScript multi-step logic
    if (!html.includes('activeIndex') && !html.includes('currentStep')) {
      console.warn('Generated HTML may not have proper multi-step JS logic');
    }

    return html;
  } catch (error) {
    console.error('Multi-step layout generation failed:', error);
    // Return a fallback multi-step template
    return generateFallbackMultiStep(analysis, vertical, ctaUrl);
  }
}

/**
 * Generate static layout for non-multi-step flows
 */
async function generateStaticLayout(
  analysis: PageAnalysis,
  options: BuildOptions,
  llm: LLMProvider,
  vertical: DatingVertical
): Promise<string> {
  const lpFlow = analysis.lpFlow;
  const headlines = analysis.components.headlines.map(h => h.text).slice(0, 5);
  const buttons = analysis.components.buttons.map(b => ({
    text: b.text,
    url: b.href,
  })).slice(0, 3);
  const verticalStyle = getVerticalStyle(vertical);

  const sectionOrder = lpFlow.stages.map(s => `${s.order}. ${s.sectionType} (${s.purpose})${s.hasCtaButton ? ' [CTA]' : ''}`);

  const prompt = `You are an expert landing page designer. Generate a complete, modern HTML landing page.

## VERTICAL: ${vertical.toUpperCase()} DATING
${verticalStyle.description}

## LP Flow Structure
${sectionOrder.join('\n')}

Flow Type: ${lpFlow.type}
Framework: ${lpFlow.framework || 'custom'}

## Messaging Flow
${lpFlow.messagingFlow.hook ? `- Hook: "${lpFlow.messagingFlow.hook}"` : ''}
${lpFlow.messagingFlow.problem ? `- Problem: "${lpFlow.messagingFlow.problem}"` : ''}
${lpFlow.messagingFlow.benefits?.length ? `- Benefits: ${lpFlow.messagingFlow.benefits.join(', ')}` : ''}

## Headlines
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

## Call-to-Action
Primary CTA: "${lpFlow.ctaStrategy.primaryCta}" → ${lpFlow.ctaStrategy.primaryCtaUrl || buttons[0]?.url || '#'}

## Design Requirements
- Color scheme: ${verticalStyle.colors}
- Mood: ${verticalStyle.mood}
- Modern, professional design
- Mobile-responsive with inline styles
- Ensure all CTA buttons link to: ${lpFlow.ctaStrategy.primaryCtaUrl || buttons[0]?.url || '#'}

Generate ONLY the complete HTML code. Start with <!DOCTYPE html> and end with </html>.`;

  try {
    const response = await llm.generateText(prompt, {
      temperature: options.textOptions.creativity,
      maxTokens: 8000,
      systemPrompt: `You are an expert web designer who creates beautiful landing pages for ${vertical} dating sites. Output only valid HTML code.`,
    });

    return cleanHtmlResponse(response.content);
  } catch (error) {
    console.error('Static layout generation failed:', error);
    throw new Error('Failed to generate layout');
  }
}

/**
 * Get styling guidance based on vertical
 */
function getVerticalStyle(vertical: DatingVertical): {
  colors: string;
  mood: string;
  description: string;
} {
  switch (vertical) {
    case 'adult':
      return {
        colors: 'Dark backgrounds (black, deep purple, dark red), neon accents (pink, red, purple), gold highlights',
        mood: 'Seductive, bold, provocative, intimate',
        description: 'This is an ADULT dating site. Content can be explicit and sexually suggestive. Use sultry imagery, bold colors, and provocative language. Images should feature attractive adults in intimate/suggestive poses (but not explicit).',
      };
    case 'casual':
      return {
        colors: 'Warm tones (coral, peach, soft pink), with dark accents. Romantic but playful.',
        mood: 'Flirty, fun, exciting, spontaneous',
        description: 'This is a CASUAL dating site. Content is sexy but not explicit. Focus on chemistry, attraction, and fun. Images should be attractive and slightly suggestive but tasteful.',
      };
    case 'mainstream':
    default:
      return {
        colors: 'Professional and warm (rose gold, soft purple, teal), clean whites',
        mood: 'Romantic, trustworthy, genuine, hopeful',
        description: 'This is a MAINSTREAM dating site. Content is completely SFW. Focus on relationships, connection, and finding love. Images should be wholesome, showing happy couples or friendly singles.',
      };
  }
}

/**
 * Clean HTML response from LLM
 */
function cleanHtmlResponse(html: string): string {
  // Remove code blocks if present
  if (html.includes('```html')) {
    html = html.replace(/```html\n?/g, '').replace(/```\n?/g, '');
  } else if (html.includes('```')) {
    html = html.replace(/```\n?/g, '');
  }

  // Ensure it starts with doctype
  html = html.trim();
  if (!html.toLowerCase().startsWith('<!doctype')) {
    html = '<!DOCTYPE html>\n' + html;
  }

  return html;
}

/**
 * Generate a fallback multi-step template when AI fails
 */
function generateFallbackMultiStep(
  analysis: PageAnalysis,
  vertical: DatingVertical,
  ctaUrl: string
): string {
  const lpFlow = analysis.lpFlow;
  const questions = lpFlow.stages
    .filter(s => s.keyMessage && s.keyMessage.length > 5)
    .map(s => ({
      question: s.keyMessage!,
      type: s.keyMessage!.toLowerCase().includes('?') ? 'yesno' : 'choice',
    }));

  const style = getVerticalStyle(vertical);
  const bgColor = vertical === 'adult' ? '#1a0a1a' : vertical === 'casual' ? '#2d1f3d' : '#f5f0ff';
  const textColor = vertical === 'adult' || vertical === 'casual' ? '#ffffff' : '#333333';
  const accentColor = vertical === 'adult' ? '#ff1493' : vertical === 'casual' ? '#ff6b9d' : '#8b5cf6';

  const questionsJson = JSON.stringify(questions, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Find Your Match</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: ${bgColor};
      color: ${textColor};
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .progress-bar {
      height: 4px;
      background: rgba(255,255,255,0.2);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
    }
    .progress-fill {
      height: 100%;
      background: ${accentColor};
      transition: width 0.3s ease;
    }
    .step-indicator {
      text-align: center;
      padding: 20px;
      font-size: 14px;
      opacity: 0.7;
    }
    .step {
      display: none;
      flex: 1;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      animation: fadeIn 0.3s ease;
    }
    .step.active { display: flex; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .question {
      font-family: 'Poppins', sans-serif;
      font-size: clamp(1.5rem, 5vw, 2.5rem);
      font-weight: 600;
      margin-bottom: 40px;
      max-width: 600px;
    }
    .buttons {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .btn {
      padding: 16px 48px;
      font-size: 1.1rem;
      font-weight: 600;
      border: none;
      border-radius: 50px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 140px;
    }
    .btn-yes {
      background: ${accentColor};
      color: white;
    }
    .btn-no {
      background: rgba(255,255,255,0.1);
      color: ${textColor};
      border: 2px solid rgba(255,255,255,0.3);
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div class="progress-bar">
    <div class="progress-fill" id="progress"></div>
  </div>
  <div class="step-indicator">
    Question <span id="current">1</span> / <span id="total">${questions.length}</span>
  </div>
  <div id="steps-container"></div>

  <script>
    const questionList = ${questionsJson};
    const ctaUrl = "${ctaUrl}";
    let activeIndex = 0;

    function init() {
      const container = document.getElementById('steps-container');
      questionList.forEach((q, i) => {
        const step = document.createElement('div');
        step.className = 'step' + (i === 0 ? ' active' : '');
        step.id = 'step-' + i;
        step.innerHTML = \`
          <h2 class="question">\${q.question}</h2>
          <div class="buttons">
            <button class="btn btn-yes" onclick="nextStep()">Yes</button>
            <button class="btn btn-no" onclick="nextStep()">No</button>
          </div>
        \`;
        container.appendChild(step);
      });
      updateProgress();
    }

    function showStep(index) {
      document.querySelectorAll('.step').forEach((s, i) => {
        s.classList.toggle('active', i === index);
      });
      document.getElementById('current').textContent = index + 1;
      updateProgress();
    }

    function updateProgress() {
      const progress = ((activeIndex + 1) / questionList.length) * 100;
      document.getElementById('progress').style.width = progress + '%';
    }

    function nextStep() {
      activeIndex++;
      if (activeIndex >= questionList.length) {
        window.location.href = ctaUrl;
      } else {
        showStep(activeIndex);
      }
    }

    init();
  </script>
</body>
</html>`;
}

/**
 * Generate a simple fallback layout if AI fails (for static pages)
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
</body>
</html>`;
}
