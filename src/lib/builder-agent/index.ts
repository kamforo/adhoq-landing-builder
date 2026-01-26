import { getLLMProvider } from '@/lib/llm';
import type { BuilderPrompt, ComponentAnalysis } from '@/types/component-analysis';
import { getAllRules } from './lp-rules';

export interface BuilderResult {
  id: string;
  html: string;
  success: boolean;
  error?: string;
  generatedAt: Date;
}

/**
 * Builder Agent
 * Takes the custom prompt from Prompt Writer and generates HTML
 */
export async function buildLandingPage(
  builderPrompt: BuilderPrompt,
  analysis: ComponentAnalysis
): Promise<BuilderResult> {
  const llm = getLLMProvider('grok');

  // Construct the final prompt for the builder
  const isMultiStep = analysis.flow.type === 'multi-step';
  const stepCount = analysis.flow.totalSteps;

  // Get the universal LP rules
  const lpRules = getAllRules();

  const prompt = `You are an expert landing page developer. Generate a high-converting landing page based on these instructions.

${builderPrompt.fullPrompt}

${lpRules}

## CRITICAL REQUIREMENTS:

${isMultiStep ? `
### MULTI-STEP PAGE REQUIREMENTS (MUST FOLLOW):
1. Generate EXACTLY ${stepCount} steps/questions (not more, not less)
2. ONLY ONE step visible at a time (others have display:none)
3. Quiz question steps (1 to ${stepCount - 1}) can have:
   - Yes/No buttons
   - Multiple choice options (2-4 choices)
   - Single continue button
   - Whatever fits the question best
4. FINAL STEP (step ${stepCount}) - THE CTA STEP:
   - Must have exactly ONE single CTA button
   - NOT multiple buttons or choices
   - Button text should be action-oriented like "Find My Match", "Start Now", "Get Access"
   - This button triggers the redirect to: ${analysis.trackingUrl}
5. Include a progress indicator (e.g., "Question 1/${stepCount}")

### REQUIRED JAVASCRIPT STRUCTURE:
const REDIRECT_URL = "${analysis.trackingUrl}";
const TOTAL_STEPS = ${stepCount};
let currentStep = 1;

function nextStep() {
  document.getElementById('step' + currentStep).style.display = 'none';
  currentStep++;
  if (currentStep > TOTAL_STEPS) {
    // CRITICAL: Redirect after last step
    window.location.href = REDIRECT_URL;
  } else {
    document.getElementById('step' + currentStep).style.display = 'block';
    updateProgress();
  }
}
` : `
### SINGLE PAGE REQUIREMENTS:
1. All CTA buttons link to: ${analysis.trackingUrl}
2. Clear call-to-action visible above the fold
`}

## OTHER REQUIREMENTS:
- Use inline styles - no external CSS
- Include proper viewport meta tag
- Make it mobile-responsive

## OUTPUT FORMAT:

Generate ONLY the complete HTML code.
- Start with: <!DOCTYPE html>
- End with: </html>
- No explanation, no markdown, just pure HTML`;

  try {
    const response = await llm.generateText(prompt, {
      temperature: 0.7, // Some creativity for design
      maxTokens: 8000,  // Landing pages can be long
    });

    // Extract HTML from response
    let html = response.content;

    // Remove markdown code blocks if present
    const htmlMatch = response.content.match(/```(?:html)?\s*(<!DOCTYPE[\s\S]*<\/html>)\s*```/i);
    if (htmlMatch) {
      html = htmlMatch[1];
    } else {
      // Try to find HTML directly
      const directMatch = response.content.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
      if (directMatch) {
        html = directMatch[1];
      }
    }

    // Validate it looks like HTML
    if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
      throw new Error('Generated content does not appear to be valid HTML');
    }

    // Ensure tracking URL is present for multi-step
    if (analysis.flow.type === 'multi-step' && analysis.trackingUrl) {
      if (!html.includes(analysis.trackingUrl)) {
        // Inject the redirect URL if missing
        html = injectRedirectUrl(html, analysis.trackingUrl);
      }
    }

    return {
      id: `build-${Date.now()}`,
      html,
      success: true,
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error('Builder failed:', error);
    return {
      id: `build-${Date.now()}`,
      html: generateFallbackPage(analysis),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      generatedAt: new Date(),
    };
  }
}

/**
 * Generate multiple variations
 */
export async function buildVariations(
  builderPrompt: BuilderPrompt,
  analysis: ComponentAnalysis,
  count: number = 1
): Promise<BuilderResult[]> {
  const results: BuilderResult[] = [];

  for (let i = 0; i < count; i++) {
    console.log(`Building variation ${i + 1} of ${count}...`);
    const result = await buildLandingPage(builderPrompt, analysis);
    result.id = `variation-${i + 1}-${Date.now()}`;
    results.push(result);

    // Small delay between generations to avoid rate limiting
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Inject redirect URL if builder forgot it
 */
function injectRedirectUrl(html: string, trackingUrl: string): string {
  // Check if redirect is already there
  if (html.includes('window.location.href') || html.includes('location.href =')) {
    // Redirect exists, just make sure URL is correct
    return html;
  }

  // If there's a nextStep function, inject redirect logic
  if (html.includes('nextStep')) {
    // Try to find the nextStep function and add redirect
    const patterns = [
      // Pattern 1: function nextStep() { ... }
      /(function\s+nextStep\s*\([^)]*\)\s*\{)/,
      // Pattern 2: nextStep = function() { ... }
      /(nextStep\s*=\s*function\s*\([^)]*\)\s*\{)/,
    ];

    for (const pattern of patterns) {
      if (pattern.test(html)) {
        html = html.replace(pattern, `$1
    // Auto-injected redirect check
    if (typeof currentStep !== 'undefined' && typeof TOTAL_STEPS !== 'undefined' && currentStep >= TOTAL_STEPS) {
      window.location.href = "${trackingUrl}";
      return;
    }`);
        break;
      }
    }
  }

  // Add REDIRECT_URL constant if missing
  if (!html.includes('REDIRECT_URL')) {
    html = html.replace(
      /<script[^>]*>/i,
      `<script>
const REDIRECT_URL = "${trackingUrl}";`
    );
  }

  // If still no redirect, add it at the end of the script
  if (!html.includes('window.location.href') && !html.includes('location.href =')) {
    // Add a failsafe redirect function
    html = html.replace(
      /<\/script>/i,
      `
// Failsafe redirect function
function redirectToOffer() {
  window.location.href = "${trackingUrl}";
}
</script>`
    );
  }

  return html;
}

/**
 * Generate a basic fallback page
 */
function generateFallbackPage(analysis: ComponentAnalysis): string {
  const isMultiStep = analysis.flow.type === 'multi-step';
  const trackingUrl = analysis.trackingUrl || '#';

  if (isMultiStep) {
    return generateFallbackMultiStep(analysis, trackingUrl);
  }

  return generateFallbackSinglePage(analysis, trackingUrl);
}

function generateFallbackMultiStep(analysis: ComponentAnalysis, trackingUrl: string): string {
  // Extract quiz questions from components (now includes JS-extracted questions)
  const quizComponents = analysis.components.filter(
    c => c.role === 'engagement' || c.type === 'quiz-question'
  );

  const questions: string[] = [];
  for (const comp of quizComponents) {
    if (comp.content && comp.content.length > 5) {
      // Clean up the question text
      const cleanQuestion = comp.content
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
      if (cleanQuestion.length > 5 && !questions.includes(cleanQuestion)) {
        questions.push(cleanQuestion);
      }
    }
  }

  // Limit to 5 questions max
  const finalQuestions = questions.slice(0, 5);

  // Only use defaults if we found absolutely nothing
  if (finalQuestions.length === 0) {
    console.log('[Builder Fallback] No quiz questions found in analysis, using defaults');
    finalQuestions.push('Are you over 18?', 'Are you looking to meet someone?', 'Are you ready to start?');
  } else {
    console.log(`[Builder Fallback] Using ${finalQuestions.length} extracted quiz questions`);
  }

  const questionsJs = finalQuestions.map((q, i) => `{ question: "${q.replace(/"/g, '\\"')}", type: "yesno" }`).join(',\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${analysis.strategySummary.mainHook || 'Find Your Match'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; min-height: 100vh; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .container { max-width: 500px; width: 90%; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .step { display: none; text-align: center; }
    .step.active { display: block; }
    h1 { font-size: 24px; margin-bottom: 30px; color: #333; }
    .progress { background: #eee; border-radius: 10px; height: 8px; margin-bottom: 30px; overflow: hidden; }
    .progress-bar { background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; transition: width 0.3s; }
    .btn { display: block; width: 100%; padding: 15px 30px; margin: 10px 0; border: none; border-radius: 10px; font-size: 18px; cursor: pointer; transition: transform 0.2s; }
    .btn-yes { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
    .btn-no { background: #f5f5f5; color: #333; }
    .btn:hover { transform: scale(1.02); }
  </style>
</head>
<body>
  <div class="container">
    <div class="progress"><div class="progress-bar" id="progressBar"></div></div>
    <div id="steps"></div>
  </div>
  <script>
    const questionList = [
    ${questionsJs}
    ];
    const REDIRECT_URL = "${trackingUrl}";
    let activeIndex = 0;

    function init() {
      const container = document.getElementById('steps');
      questionList.forEach((q, i) => {
        const step = document.createElement('div');
        step.className = 'step' + (i === 0 ? ' active' : '');
        step.innerHTML = \`
          <h1>\${q.question}</h1>
          <button class="btn btn-yes" onclick="nextStep()">Yes</button>
          <button class="btn btn-no" onclick="nextStep()">No</button>
        \`;
        container.appendChild(step);
      });
      updateProgress();
    }

    function updateProgress() {
      const progress = ((activeIndex + 1) / questionList.length) * 100;
      document.getElementById('progressBar').style.width = progress + '%';
    }

    function nextStep() {
      document.querySelectorAll('.step')[activeIndex].classList.remove('active');
      activeIndex++;
      if (activeIndex >= questionList.length) {
        window.location.href = REDIRECT_URL;
        return;
      }
      document.querySelectorAll('.step')[activeIndex].classList.add('active');
      updateProgress();
    }

    init();
  </script>
</body>
</html>`;
}

function generateFallbackSinglePage(analysis: ComponentAnalysis, trackingUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${analysis.strategySummary.mainHook || 'Find Your Match'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .hero { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40px 20px; }
    h1 { font-size: 48px; color: white; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
    p { font-size: 20px; color: rgba(255,255,255,0.9); margin-bottom: 40px; max-width: 600px; }
    .cta { display: inline-block; padding: 20px 60px; background: white; color: #764ba2; font-size: 24px; font-weight: bold; border-radius: 50px; text-decoration: none; transition: transform 0.3s, box-shadow 0.3s; }
    .cta:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
  </style>
</head>
<body>
  <div class="hero">
    <h1>${analysis.strategySummary.mainHook || 'Find Singles Near You'}</h1>
    <p>${analysis.strategySummary.valueProposition || 'Connect with local singles looking to meet someone like you.'}</p>
    <a href="${trackingUrl}" class="cta">Get Started</a>
  </div>
</body>
</html>`;
}
