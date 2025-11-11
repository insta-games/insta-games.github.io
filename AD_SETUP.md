# Advertisement Setup Guide

This website is prepared to accept advertisements. Follow these steps to enable ads:

## Quick Start

1. **Sign up for an ad network:**
   - Google AdSense: https://www.google.com/adsense/
   - Or use another ad network of your choice

2. **Get your Publisher ID:**
   - For AdSense, it looks like: `ca-pub-XXXXXXXXXXXXXXXX`

3. **Enable ads:**
   - Open `ads.js`
   - Change `enabled: false` to `enabled: true`
   - Replace `clientId: 'ca-pub-XXXXXXXXXXXXXXXX'` with your actual ID

4. **Configure ad placements:**
   - In `ads.js`, set which ad positions you want:
   ```javascript
   placements: {
     header: true,      // Banner ad in header
     sidebar: false,    // Sidebar ads on game pages  
     footer: true,      // Footer banner ad
     inContent: false   // In-content ads between game cards
   }
   ```

## Ad Placement Locations

### Homepage (index.html)
- **Header Ad**: Top of page, below navigation (728x90 banner)
- **Footer Ad**: Bottom of page, above footer (728x90 banner)

### Game Pages
You can add ads to individual game pages by:
1. Copy the ad container div from `index.html`
2. Paste into game HTML files where you want ads
3. Available container classes:
   - `.ad-header` - Top banner (728x90)
   - `.ad-sidebar` - Side banner (300x250)
   - `.ad-footer` - Bottom banner (728x90)
   - `.ad-content` - In-content responsive ad

## Example: Adding AdSense Code

Once you have your AdSense code, replace the placeholder div:

```html
<!-- Before (placeholder) -->
<div class="ad-container ad-footer" data-ad-placement="footer" id="ad-footer-bottom">
  <!-- Insert your footer ad code here when ready -->
</div>

<!-- After (with AdSense code) -->
<div class="ad-container ad-footer" data-ad-placement="footer" id="ad-footer-bottom">
  <ins class="adsbygoogle"
       style="display:block"
       data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
       data-ad-slot="1234567890"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>
       (adsbygoogle = window.adsbygoogle || []).push({});
  </script>
</div>
```

## Ad Sizes

Common ad sizes supported:
- **728x90** - Leaderboard (header/footer)
- **300x250** - Medium Rectangle (sidebar/content)
- **320x50** - Mobile Banner
- **Responsive** - Auto-adjusts to container

## Testing

Before going live:
1. Enable ads in `ads.js`
2. Test on localhost to verify layout
3. Check mobile responsiveness
4. Ensure ads don't break game functionality

## Notes

- Ads are hidden by default until you enable them
- Mobile users won't see sidebar ads (better UX)
- All ad containers have subtle styling to match your dark theme
- The `::before` label ("Advertisement") helps with transparency

## Support

If you need help with AdSense setup:
- AdSense Help: https://support.google.com/adsense
- Common issues: Make sure your site is publicly accessible before applying to AdSense

## Legal Requirements

Your website now includes:
- **Privacy Policy** (`privacy.html`) - Required for AdSense and GDPR compliance
- **Terms of Service** (`terms.html`) - Protects you legally

Both pages are linked in the footer. Make sure to:
1. Review both pages and customize contact information if needed
2. Update the "Last Updated" dates when you make changes
3. Ensure they're accessible before applying for AdSense (Google requires a privacy policy)
