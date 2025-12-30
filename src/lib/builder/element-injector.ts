import * as cheerio from 'cheerio';
import type { AddElementOptions } from '@/types/builder';

interface InjectedElement {
  type: string;
  selector: string;
  html: string;
}

/**
 * Detect the main CTA/redirect URL from the page
 */
function detectRedirectUrl($: cheerio.CheerioAPI): string | null {
  // Common CTA button selectors (prioritized)
  const ctaSelectors = [
    'a.btn[href], a.button[href]',
    'a[class*="cta"][href]',
    'a[class*="CTA"][href]',
    'a[class*="buy"][href], a[class*="Buy"][href]',
    'a[class*="order"][href], a[class*="Order"][href]',
    'a[class*="signup"][href], a[class*="sign-up"][href]',
    'a[class*="get-started"][href]',
    '.hero a[href]:not([href^="#"])',
    'section:first-of-type a[href]:not([href^="#"])',
  ];

  for (const selector of ctaSelectors) {
    const $el = $(selector).first();
    if ($el.length) {
      const href = $el.attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        return href;
      }
    }
  }

  // Fallback: find any prominent link with tracking parameters
  const trackingPatterns = ['?ref=', '?aff=', 'click', 'track', 'redirect', 'go', 'out'];
  let fallbackUrl: string | null = null;

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      for (const pattern of trackingPatterns) {
        if (href.toLowerCase().includes(pattern)) {
          fallbackUrl = href;
          return false; // break
        }
      }
    }
  });

  return fallbackUrl;
}

/**
 * Inject new elements into the page
 */
export function injectElements(
  $: cheerio.CheerioAPI,
  options: AddElementOptions
): InjectedElement[] {
  const injected: InjectedElement[] = [];

  // Detect or use provided redirect URL
  const redirectUrl = options.redirectUrl || detectRedirectUrl($);

  // Countdown timer
  if (options.countdown?.enabled) {
    const element = injectCountdown($, options.countdown);
    if (element) injected.push(element);
  }

  // Scarcity indicator
  if (options.scarcity?.enabled) {
    const element = injectScarcity($, options.scarcity);
    if (element) injected.push(element);
  }

  // Social proof
  if (options.socialProof?.enabled) {
    const element = injectSocialProof($, options.socialProof);
    if (element) injected.push(element);
  }

  // Trust badges
  if (options.trustBadges?.enabled) {
    const element = injectTrustBadges($, options.trustBadges);
    if (element) injected.push(element);
  }

  // Exit intent popup - pass redirect URL
  if (options.exitIntent?.enabled) {
    const element = injectExitIntent($, options.exitIntent, redirectUrl);
    if (element) injected.push(element);
  }

  // Sticky CTA bar - pass redirect URL
  if (options.stickyCta?.enabled) {
    const element = injectStickyCta($, options.stickyCta, redirectUrl);
    if (element) injected.push(element);
  }

  return injected;
}

/**
 * Inject countdown timer
 */
function injectCountdown(
  $: cheerio.CheerioAPI,
  options: NonNullable<AddElementOptions['countdown']>
): InjectedElement | null {
  const styles = {
    minimal: `
      background: #f8f8f8;
      padding: 10px 20px;
      text-align: center;
      font-size: 14px;
    `,
    prominent: `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
    `,
    urgent: `
      background: #ff4444;
      color: white;
      padding: 15px 20px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      animation: pulse 1s infinite;
    `,
  };

  const html = `
    <div id="countdown-timer" style="${styles[options.style || 'prominent']}">
      <span>${options.text || 'Offer expires in:'}</span>
      <span id="countdown-display" style="font-family: monospace; margin-left: 10px; font-size: 1.2em;">00:00:00</span>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
    </style>
    <script>
      (function() {
        var duration = ${options.duration};
        var display = document.getElementById('countdown-display');
        var timer = duration;

        function updateTimer() {
          var hours = Math.floor(timer / 3600);
          var minutes = Math.floor((timer % 3600) / 60);
          var seconds = timer % 60;

          display.textContent =
            String(hours).padStart(2, '0') + ':' +
            String(minutes).padStart(2, '0') + ':' +
            String(seconds).padStart(2, '0');

          if (--timer < 0) {
            timer = 0;
            display.textContent = 'EXPIRED';
          }
        }

        updateTimer();
        setInterval(updateTimer, 1000);
      })();
    </script>
  `;

  const selector = getPositionSelector($, options.position);
  insertAtPosition($, selector, html, options.position);

  return { type: 'countdown', selector, html };
}

/**
 * Inject scarcity indicator
 */
function injectScarcity(
  $: cheerio.CheerioAPI,
  options: NonNullable<AddElementOptions['scarcity']>
): InjectedElement | null {
  const messages = {
    spots: `Only <strong>${options.value || 7}</strong> spots left!`,
    stock: `<strong>${options.value || 12}</strong> items left in stock`,
    viewers: `<strong>${options.value || 23}</strong> people viewing this right now`,
  };

  const icons = {
    spots: '🔥',
    stock: '📦',
    viewers: '👀',
  };

  const html = `
    <div id="scarcity-indicator" style="
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 12px 20px;
      margin: 15px auto;
      max-width: 400px;
      text-align: center;
      font-size: 16px;
      color: #856404;
    ">
      <span style="margin-right: 8px;">${icons[options.type]}</span>
      ${messages[options.type]}
    </div>
  `;

  const selector = getPositionSelector($, options.position);
  insertAtPosition($, selector, html, options.position);

  return { type: 'scarcity', selector, html };
}

/**
 * Inject social proof
 */
function injectSocialProof(
  $: cheerio.CheerioAPI,
  options: NonNullable<AddElementOptions['socialProof']>
): InjectedElement | null {
  let html = '';

  if (options.type === 'counter') {
    const count = options.count || 10000;
    html = `
      <div id="social-proof" style="
        text-align: center;
        padding: 20px;
        margin: 20px 0;
      ">
        <div style="font-size: 36px; font-weight: bold; color: #2563eb;">
          ${count.toLocaleString()}+
        </div>
        <div style="font-size: 14px; color: #666; margin-top: 5px;">
          Happy Customers
        </div>
      </div>
    `;
  } else if (options.type === 'notification') {
    html = `
      <div id="social-proof-notification" style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 15px 20px;
        max-width: 300px;
        z-index: 9999;
        display: none;
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; background: #e5e7eb; border-radius: 50%;"></div>
          <div>
            <div style="font-weight: 600; font-size: 14px;">Someone just signed up!</div>
            <div style="font-size: 12px; color: #666;">2 minutes ago</div>
          </div>
        </div>
      </div>
      <script>
        (function() {
          var notification = document.getElementById('social-proof-notification');
          var names = ['John', 'Sarah', 'Mike', 'Emma', 'David', 'Lisa'];
          var actions = ['signed up', 'made a purchase', 'joined'];
          var times = ['just now', '1 minute ago', '2 minutes ago', '5 minutes ago'];

          function showNotification() {
            var name = names[Math.floor(Math.random() * names.length)];
            var action = actions[Math.floor(Math.random() * actions.length)];
            var time = times[Math.floor(Math.random() * times.length)];

            notification.querySelector('div > div:first-child').textContent = name + ' ' + action + '!';
            notification.querySelector('div > div:last-child').textContent = time;
            notification.style.display = 'block';

            setTimeout(function() {
              notification.style.display = 'none';
            }, 4000);
          }

          setTimeout(showNotification, 3000);
          setInterval(showNotification, 15000);
        })();
      </script>
    `;
  } else if (options.type === 'reviews') {
    html = `
      <div id="social-proof-reviews" style="
        display: flex;
        justify-content: center;
        gap: 5px;
        padding: 15px;
        margin: 15px 0;
      ">
        <span style="color: #fbbf24; font-size: 24px;">★★★★★</span>
        <span style="color: #666; font-size: 14px; align-self: center;">
          4.9/5 from ${(options.count || 500).toLocaleString()} reviews
        </span>
      </div>
    `;
  }

  const selector = getPositionSelector($, options.position);
  insertAtPosition($, selector, html, options.position);

  return { type: 'social-proof', selector, html };
}

/**
 * Inject trust badges
 */
function injectTrustBadges(
  $: cheerio.CheerioAPI,
  options: NonNullable<AddElementOptions['trustBadges']>
): InjectedElement | null {
  const badgeHtml: Record<string, string> = {
    secure: `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <span>Secure Checkout</span>
      </div>
    `,
    guarantee: `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <span>30-Day Guarantee</span>
      </div>
    `,
    verified: `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>Verified Business</span>
      </div>
    `,
    payment: `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">💳</span>
        <span>Secure Payment</span>
      </div>
    `,
  };

  const badges = options.badges
    .map(b => badgeHtml[b])
    .filter(Boolean)
    .join('');

  const html = `
    <div id="trust-badges" style="
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
      padding: 20px;
      margin: 20px 0;
      background: #f9fafb;
      border-radius: 8px;
      font-size: 14px;
      color: #374151;
    ">
      ${badges}
    </div>
  `;

  const selector = getPositionSelector($, options.position);
  insertAtPosition($, selector, html, options.position);

  return { type: 'trust-badges', selector, html };
}

/**
 * Inject exit intent popup
 */
function injectExitIntent(
  $: cheerio.CheerioAPI,
  options: NonNullable<AddElementOptions['exitIntent']>,
  redirectUrl: string | null
): InjectedElement | null {
  // Use <a> tag if we have a redirect URL, otherwise use <button>
  const ctaButton = redirectUrl
    ? `<a href="${redirectUrl}" style="
        display: inline-block;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-decoration: none;
        border: none;
        padding: 15px 40px;
        font-size: 18px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
      ">${options.buttonText}</a>`
    : `<button onclick="document.getElementById('exit-intent-popup').style.display='none'" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 15px 40px;
        font-size: 18px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
      ">${options.buttonText}</button>`;

  const html = `
    <div id="exit-intent-popup" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 99999;
    ">
      <div style="
        background: white;
        border-radius: 12px;
        padding: 40px;
        max-width: 500px;
        text-align: center;
        position: relative;
      ">
        <button onclick="document.getElementById('exit-intent-popup').style.display='none'" style="
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        ">&times;</button>
        <h2 style="font-size: 28px; margin-bottom: 15px;">${options.headline}</h2>
        <p style="color: #666; margin-bottom: 25px;">${options.text}</p>
        ${ctaButton}
      </div>
    </div>
    <script>
      (function() {
        var shown = false;
        document.addEventListener('mouseout', function(e) {
          if (!shown && e.clientY < 10) {
            document.getElementById('exit-intent-popup').style.display = 'flex';
            shown = true;
          }
        });
      })();
    </script>
  `;

  $('body').append(html);

  return { type: 'exit-intent', selector: 'body', html };
}

/**
 * Inject sticky CTA bar
 */
function injectStickyCta(
  $: cheerio.CheerioAPI,
  options: NonNullable<AddElementOptions['stickyCta']>,
  redirectUrl: string | null
): InjectedElement | null {
  const position = options.position === 'top' ? 'top: 0;' : 'bottom: 0;';

  // Use <a> tag if we have a redirect URL, otherwise use <button>
  const ctaButton = redirectUrl
    ? `<a href="${redirectUrl}" style="
        display: inline-block;
        background: #fbbf24;
        color: #1e3a8a;
        text-decoration: none;
        border: none;
        padding: 10px 25px;
        font-size: 14px;
        font-weight: bold;
        border-radius: 6px;
        cursor: pointer;
      ">${options.buttonText}</a>`
    : `<button style="
        background: #fbbf24;
        color: #1e3a8a;
        border: none;
        padding: 10px 25px;
        font-size: 14px;
        font-weight: bold;
        border-radius: 6px;
        cursor: pointer;
      ">${options.buttonText}</button>`;

  const html = `
    <div id="sticky-cta" style="
      position: fixed;
      ${position}
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: white;
      padding: 12px 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      z-index: 9998;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    ">
      <span style="font-size: 16px;">${options.text}</span>
      ${ctaButton}
    </div>
    <style>
      body { padding-${options.position}: 60px; }
    </style>
  `;

  $('body').append(html);

  return { type: 'sticky-cta', selector: 'body', html };
}

/**
 * Get selector for position
 */
function getPositionSelector(
  $: cheerio.CheerioAPI,
  position: string
): string {
  switch (position) {
    case 'top':
      return 'body';
    case 'bottom':
      return 'body';
    case 'above-cta':
      // Find CTA buttons
      const ctaBtn = $('a.btn, a.button, a[class*="cta"], button[class*="cta"]').first();
      return ctaBtn.length ? ctaBtn.parent().get(0)?.tagName || 'body' : 'body';
    case 'below-cta':
      return 'body';
    case 'below-headline':
      const h1 = $('h1').first();
      return h1.length ? 'h1' : 'body';
    case 'footer':
      return $('footer').length ? 'footer' : 'body';
    default:
      return 'body';
  }
}

/**
 * Insert HTML at position
 */
function insertAtPosition(
  $: cheerio.CheerioAPI,
  selector: string,
  html: string,
  position: string
): void {
  const $target = $(selector);

  if (position === 'top') {
    $target.prepend(html);
  } else if (position === 'bottom' || position === 'footer') {
    $target.append(html);
  } else if (position === 'above-cta' || position === 'below-headline') {
    $target.after(html);
  } else if (position === 'below-cta') {
    const cta = $('a.btn, a.button, a[class*="cta"]').first();
    if (cta.length) {
      cta.after(html);
    } else {
      $('body').append(html);
    }
  } else {
    $target.append(html);
  }
}
