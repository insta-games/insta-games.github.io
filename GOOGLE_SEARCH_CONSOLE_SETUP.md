# Google Search Console Setup Instructions

## Step 1: Go to Google Search Console
Visit: https://search.google.com/search-console/

## Step 2: Add Your Property
1. Click "Add Property"
2. Enter your website URL: https://sanjith-esp32.github.io
3. Choose verification method

## Step 3: HTML File Verification (Recommended)
1. Google will provide you a file like: google1234567890abcdef.html
2. Download this file
3. Upload it to the root of your website (same folder as index.html)
4. Commit and push to GitHub:
   ```
   git add google*.html
   git commit -m "Add Google Search Console verification"
   git push origin main
   ```
5. Go back to Search Console and click "Verify"

## Step 4: Submit Sitemap
1. After verification, go to "Sitemaps" in the left menu
2. Enter: sitemap.xml
3. Click "Submit"

## Alternative: HTML Tag Verification
If you prefer, you can use the meta tag method:
1. Google will give you a meta tag like:
   <meta name="google-site-verification" content="your-code-here" />
2. Let me know the code and I'll add it to your index.html

## What Happens Next?
- Google will start crawling your site within 24-48 hours
- You'll see data in Search Console after a few days
- You can monitor clicks, impressions, and search queries
- You can request indexing for new pages

## Your Sitemap is Ready!
Location: https://sanjith-esp32.github.io/sitemap.xml
This sitemap includes all 25+ game pages and important pages.
