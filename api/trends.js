// CreativeVox Media: live trends for the Free Content Studio.
// Returns REAL data fetched on request (cached ~15 min):
//   - "trending": today's trending Google searches in India (Google Trends RSS)
//   - "news":     recent news headlines for the chosen industry or keyword (Google News RSS)
// Nothing is invented here. If a source cannot be reached, it is reported as unavailable.

const GEO = 'IN';
const TIMEOUT_MS = 8000;

const INDUSTRY_QUERY = {
  'Clothing & Fashion': 'fashion trends',
  'Beauty & Salon': 'beauty skincare hair trends',
  'Food & Cafe': 'cafe food trends',
  'Fitness & Wellness': 'fitness wellness trends',
  'Education & Coaching': 'education coaching online learning',
  'Real Estate': 'real estate market India',
  'Professional Services': 'small business services marketing',
  'E-commerce': 'ecommerce online shopping trends',
  'Local Business': 'local small business marketing',
  'Creator / Personal Brand': 'creator economy social media trends'
};
const DEFAULT_QUERY = 'social media marketing trends';

// Brands should not "ride" tragedies, so keep these topics out of suggestions.
const SENSITIVE = /\b(dies|died|dead|death|deaths|killed|killing|murder|murdered|suicide|rape|raped|accident|crash|crashed|blast|attack|attacks|terror|terrorist|shooting|shot|stabbed|riot|riots|violence|tragedy|funeral|obituary|abuse|assault|kidnap|kidnapped|flood|floods|earthquake|bomb|hostage|casualties|victim|victims)\b/i;

function decode(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function tag(block, name) {
  const m = block.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i'));
  return m ? decode(m[1]) : '';
}

function items(xml) {
  return xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
}

function safeUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : '';
  } catch (e) { return ''; }
}

async function getText(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CreativeVoxStudio/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTrending() {
  const xml = await getText('https://trends.google.com/trending/rss?geo=' + GEO);
  const out = [];
  for (const it of items(xml)) {
    const title = tag(it, 'title');
    if (!title || SENSITIVE.test(title)) continue;
    const nb = it.match(/<ht:news_item>[\s\S]*?<\/ht:news_item>/i);
    const nItem = nb ? nb[0] : '';
    const newsTitle = tag(nItem, 'ht:news_item_title');
    if (newsTitle && SENSITIVE.test(newsTitle)) continue;
    out.push({
      title,
      traffic: tag(it, 'ht:approx_traffic'),
      pubDate: tag(it, 'pubDate'),
      newsTitle,
      newsUrl: safeUrl(tag(nItem, 'ht:news_item_url')),
      newsSource: tag(nItem, 'ht:news_item_source')
    });
    if (out.length >= 8) break;
  }
  return out;
}

async function fetchNews(query, days) {
  const q = encodeURIComponent(query + ' when:' + days + 'd');
  const xml = await getText('https://news.google.com/rss/search?q=' + q + '&hl=en-IN&gl=IN&ceid=IN:en');
  const out = [];
  for (const it of items(xml)) {
    let title = tag(it, 'title');
    let source = tag(it, 'source');
    if (!source) {
      const i = title.lastIndexOf(' - ');
      if (i > 0) { source = title.slice(i + 3); }
    }
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    if (!title || SENSITIVE.test(title)) continue;
    const url = safeUrl(tag(it, 'link'));
    if (!url) continue;
    out.push({ title, source, url, pubDate: tag(it, 'pubDate') });
    if (out.length >= 6) break;
  }
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'GET') { res.statusCode = 405; return res.end(); }

  const params = new URL(req.url, 'http://localhost').searchParams;
  const type = params.get('type') || '';
  const keyword = (params.get('q') || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

  const newsQuery = keyword || INDUSTRY_QUERY[type] || DEFAULT_QUERY;
  const days = keyword ? 30 : 7;

  const [trendRes, newsRes] = await Promise.allSettled([fetchTrending(), fetchNews(newsQuery, days)]);
  const trending = trendRes.status === 'fulfilled' ? trendRes.value : [];
  const news = newsRes.status === 'fulfilled' ? newsRes.value : [];
  const trendingOk = trendRes.status === 'fulfilled';
  const newsOk = newsRes.status === 'fulfilled';

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!trendingOk && !newsOk) {
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 502;
    return res.end(JSON.stringify({ error: 'Live sources are not reachable right now.' }));
  }
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
  res.statusCode = 200;
  res.end(JSON.stringify({
    fetchedAt: new Date().toISOString(),
    geo: GEO,
    newsQuery,
    newsDays: days,
    sources: { trending: 'Google Trends (India)', news: 'Google News' },
    ok: { trending: trendingOk, news: newsOk },
    trending,
    news
  }));
};
