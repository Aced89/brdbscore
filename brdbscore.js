import { handleStatsRequest } from "./stats.js";
// ═══════════════════════════════════════════════════════════════
// BRDb Score Worker v3.0 - NO BITLIST
// Endpoints:
//   GET  /                          → Direct Bitcointalk scraping via Recent Posts and Recent Merits
//   POST /cache                     → Save calculated BRDb data
//   GET  /user?uid=X                → Single user from D1
//   GET  /leaderboard               → Global leaderboard
//   GET  /leaderboard/local?board=X → Local board leaderboard
//   POST /users-index               → Bulk save UserIDs from post scraping
//   GET  /history?uid=X             → BRDb history for a user
//   GET  /stats                     → Global DB statistics
//   GET  /users-index/pending       → Users not yet scraped (for cron)
// Cron: runs daily to scrape all users in users_index
// ═══════════════════════════════════════════════════════════════

// ─── Local Board Map ────────────────────────────────────────────
// Maps board_id → local board name (only local/language boards)
const LOCAL_BOARD_MAP = {
  1: 'Bitcoin Discussion',
  4: 'Bitcoin Technical Support',
  5: 'Marketplace',
  6: 'Development & Technical Discussion',
  7: 'Economics',
  8: 'Trading Discussion',
  9: 'Off-topic',
  10: 'Russian',
  11: 'Other languages/locations',
  12: 'Project Development',
  13: 'French',
  14: 'Mining',
  16: 'German',
  17: 'Chinese students',
  18: 'Разное',
  19: 'Юристы',
  20: 'Трейдеры',
  21: 'Майнеры',
  22: 'Новички',
  23: 'Бизнес',
  24: 'Meta',
  25: 'Obsolete (buying)',
  26: 'Obsolete (selling)',
  27: 'Spanish',
  28: 'Italian',
  29: 'Portuguese',
  30: 'Mandarin',
  31: 'Mercado y Economía',
  32: 'Hardware y Minería',
  33: 'Esquina Libre',
  34: 'Politics & Society',
  35: 'Biete',
  36: 'Suche',
  37: 'Wallet software',
  39: 'Beginners & Help',
  40: 'Mining support',
  41: 'Pools',
  42: 'Mining software (miners)',
  44: 'CPU/GPU Bitcoin mining hardware',
  45: 'Scandinavian',
  46: 'Mercato valute',
  47: 'Discussions générales et utilisation du Bitcoin',
  48: 'Mining et Hardware',
  49: 'Place de marché',
  50: 'Hors-sujet',
  51: 'Goods',
  52: 'Services',
  53: 'Currency exchange',
  54: 'Wiki, documentation et traduction',
  55: 'Хайпы',
  56: 'Gambling',
  57: 'Speculation',
  59: 'Archival',
  60: 'Mining (Deutsch)',
  61: 'Trading und Spekulation',
  62: 'Anfänger und Hilfe',
  63: 'Projektentwicklung',
  64: 'Off-Topic (Deutsch)',
  65: 'Lending',
  66: 'Кодеры',
  67: 'Altcoin Discussion',
  69: 'Economia & Mercado',
  70: 'Mineração em Geral',
  71: 'Games and rounds',
  72: 'Альтернативные криптовалюты',
  73: 'Auctions',
  74: 'Legal',
  75: 'Computer hardware',
  76: 'Hardware',
  77: 'Press',
  78: 'Securities',
  79: 'Dutch',
  80: 'Markt',
  81: 'Mining speculation',
  82: 'Korean',
  83: 'Scam Accusations',
  84: 'Service Announcements',
  85: 'Service Discussion',
  86: 'Meetups',
  87: 'Important Announcements',
  88: 'Long-term offers',
  89: 'India',
  90: 'Идеи',
  91: 'Политика',
  92: 'Корзина',
  93: 'Digital goods',
  94: 'Gokken/lotterijen',
  95: 'Hebrew',
  97: 'Armory',
  98: 'Electrum',
  99: 'MultiBit',
  100: 'Bitcoin Wallet for Android',
  101: 'Mercadillo',
  102: 'Mexico',
  103: 'Argentina',
  104: 'España',
  105: 'Centroamerica y Caribe',
  107: 'Beni',
  108: 'Romanian',
  109: 'Anunturi importante',
  110: 'Offtopic',
  111: 'Market',
  112: 'Tutoriale',
  113: 'Bine ai venit!',
  114: 'Presa',
  115: 'Mining (Italiano)',
  116: 'Mining (Nederlands)',
  117: '跳蚤市场',
  118: '山寨币',
  119: '媒体',
  120: 'Greek',
  121: 'Mining (India)',
  122: 'Marketplace (India)',
  123: 'Regional Languages (India)',
  124: 'Press & News from India',
  125: 'Alt Coins (India)',
  126: 'Buyer/ Seller Reputations (India)',
  127: 'Off-Topic (India)',
  128: 'Новости',
  129: 'Reputation',
  130: 'Primeros pasos y ayuda',
  131: 'Primeiros Passos (Iniciantes)',
  132: 'Alt-Currencies (Italiano)',
  133: 'Turkish',
  134: 'Brasil',
  135: 'Portugal',
  136: 'Αγορά',
  137: 'Group buys',
  138: 'BitcoinJ',
  139: 'Treffen',
  140: 'Presse ',
  141: 'Auktionen',
  142: 'Polish',
  143: 'Beurzen',
  144: 'Raduni/Meeting (Italiano)',
  145: 'Off-Topic (Italiano)',
  146: '挖矿',
  147: 'Alt Coins (Nederlands)',
  148: 'Off-topic (Nederlands)',
  149: 'Altcoins (Français)',
  150: 'Meetings (Nederlands)',
  151: 'Altcoins (criptomonedas alternativas)',
  152: 'Altcoins (Deutsch)',
  153: 'Guide (Italiano)',
  155: 'Pazar Alanı',
  156: 'Madencilik',
  157: 'Alternatif Kripto-Paralar',
  158: 'Konu Dışı',
  159: 'Announcements (Altcoins)',
  160: 'Mining (Altcoins)',
  161: 'Marketplace (Altcoins)',
  162: 'Accuse scam/truffe',
  163: 'Tablica ogłoszeń',
  164: 'Alternatywne kryptowaluty',
  165: 'Crittografia e decentralizzazione',
  166: 'Minerit',
  167: 'New forum software',
  168: 'Bitcoin Wiki',
  169: 'Progetti',
  170: 'Mercato',
  171: 'Servizi',
  172: 'Esercizi commerciali',
  173: 'Hardware/Mining (Italiano)',
  174: 'Yeni Başlayanlar & Yardım',
  175: 'Trading, analisi e speculazione',
  176: 'Annunci',
  177: 'Minería de altcoins',
  178: 'Anunturi Monede Alternative',
  179: 'Altcoins (Ελληνικά)',
  180: 'Bitcoin Haberleri',
  181: 'Criptomoedas Alternativas',
  182: '대체코인 Alt Coins (한국어)',
  183: 'Actualité et News',
  184: 'Vos sites et projets',
  185: 'Работа',
  186: 'Développement et technique',
  187: 'Économie et spéculation',
  188: 'Le Bitcoin et la loi',
  189: 'Ekonomi',
  190: 'Servisler',
  191: 'Indonesian',
  192: 'Altcoins (Bahasa Indonesia)',
  193: 'Jual Beli',
  194: 'Mining (Bahasa Indonesia)',
  195: 'Mining Discussion (Ελληνικά)',
  196: '离题万里',
  197: 'Service Announcements (Altcoins)',
  198: 'Service Discussion (Altcoins)',
  199: 'Pools (Altcoins)',
  200: 'Gambling (Italiano)',
  201: 'Croatian',
  202: 'Servicios',
  203: 'Trading y especulación',
  204: 'Servicios',
  205: 'Discussioni avanzate e sviluppo',
  206: 'Desenvolvimento & Discussões Técnicas',
  207: 'Investor-based games',
  208: 'Débutants',
  209: 'Échanges',
  210: 'Produits et services',
  211: 'Petites annonces',
  212: 'Micro Earnings',
  217: 'Collectibles',
  219: 'Filipino',
  220: 'Trgovina',
  221: 'Altcoins (Hrvatski)',
  222: 'Web Wallets',
  223: 'Exchanges',
  224: 'Speculation (Altcoins)',
  228: 'Gambling discussion',
  229: 'Proje Geliştirme',
  230: 'Buluşmalar',
  231: 'Mycelium',
  232: 'Fonlar',
  234: 'Invites & Accounts',
  235: 'Madencilik (Alternatif Kripto-Paralar)',
  236: 'Барахолка',
  237: 'Обменники',
  238: 'Bounties (Altcoins)',
  239: 'Duyurular (Alternatif Kripto-Paralar)',
  240: 'Tokens (Altcoins)',
  241: 'Arabic',
  242: 'العملات البديلة (Altcoins)',
  243: 'Altcoins (Pilipinas)',
  246: 'Altcoin Announcements (Ελληνικά)',
  247: 'Altcoin Mining (Ελληνικά)',
  248: 'Токены',
  250: 'Serious discussion',
  251: 'Ivory Tower',
  252: 'Japanese',
  253: 'إستفسارات و أسئلة المبتدئين',
  254: 'Tokens (Español)',
  255: 'アルトコイン',
  256: 'Бayнти и aиpдpoпы',
  257: 'Discutii Servicii',
  258: 'Annonces',
  259: 'Altcoins (Monede Alternative)',
  260: 'Altcoin Announcements (Pilipinas)',
  261: 'Hardware wallets',
  262: 'Oбcyждeниe Bitcoin',
  263: 'Nowe kryptowaluty i tokeny',
  264: 'Tablica ogłoszeń (altcoiny)',
  265: 'النقاشات',
  266: 'التعدين',
  267: 'النقاشات الأخرى',
  268: 'Pamilihan',
  269: 'Marktplatz',
  270: 'Announcements (Deutsch)',
  271: 'منصات التبادل',
  272: 'Off-topic (Hrvatski)',
  273: 'Announcements (Hrvatski)',
  274: 'Others (Pilipinas)',
  275: 'Nigerian',
  276: 'Trading dan Spekulasi',
  277: 'Ekonomi, Politik, dan Budaya',
  278: 'Topik Lainnya',
  279: 'Politics and society (Naija)',
  280: 'Off-topic (Naija)'
};

// Detect dominant local board from posts array
// Solo board locali nazionali top-level (valori usati come local_board nel DB)
const LOCAL_NATIONAL_BOARDS = new Set([
  'Italian','German','Spanish','French','Portuguese','Russian','Turkish',
  'Dutch','Polish','Romanian','Greek','Croatian','Mandarin','Japanese',
  'Korean','Arabic','Indonesian','Filipino','Nigerian','India','Scandinavian','Hebrew','Other languages/locations'
]);

// Board generiche con icone
const GENERIC_BOARD_ICONS = {
  'Gambling discussion':'🎲','Other languages/locations':'🌐','Other languages/locations':'🌐','Games and rounds':'🎮',
  'Investor-based games':'🎯','Speculation':'📈','Speculation (Altcoins)':'📈',
  'Trading Discussion':'💹','Trading und Spekulation':'💹',
  'Trading, analisi e speculazione':'💹','Trading y especulación':'💹',
  'Trading dan Spekulasi':'💹',
  'Mining':'⛏️','Mining support':'⛏️','Mining (Altcoins)':'⛏️',
  'Marketplace':'🛒','Altcoin Discussion':'🪙','Economics':'💰',
  'Off-topic':'💬','Serious discussion':'🎓',
  'Meta':'🔧','Politics & Society':'🏛️','Beginners & Help':'🆕',
  'Development & Technical Discussion':'💻','Announcements (Altcoins)':'📢',
  'Services':'🔌','Scam Accusations':'🚨',
  'Reputation':'🔍','Legal':'⚖️','Press':'📰','Project Development':'🚀',
  'Guide (Italiano)':'📖','Progetti':'🚀','Ivory Tower':'🏰',
};

// Ritorna { national, topBoards }
function detectBoards(posts) {
  if (!posts || posts.length === 0) return { national: null, topBoards: [] };
  const natCounts = {}, genCounts = {};
  for (const post of posts) {
    const board = LOCAL_BOARD_MAP[post.board_id];
    if (!board) continue;
    if (LOCAL_NATIONAL_BOARDS.has(board)) {
      natCounts[board] = (natCounts[board] || 0) + 1;
    } else if (GENERIC_BOARD_ICONS[board]) {
      genCounts[board] = (genCounts[board] || 0) + 1;
    }
  }
  // National: top nazionale con almeno 3 post
  const natSorted = Object.entries(natCounts).sort((a,b) => b[1]-a[1]);
  const national = natSorted.length && natSorted[0][1] >= 3 ? natSorted[0][0] : null;
  // Top 2 generiche con almeno 5 post
  const topBoards = Object.entries(genCounts)
    .sort((a,b) => b[1]-a[1])
    .filter(([,c]) => c >= 5)
    .slice(0,2)
    .map(([b]) => b);
  return { national, topBoards };
}

function detectLocalBoard(posts) {
  if (!posts || posts.length === 0) return null;
  const counts = {};
  let localTotal = 0;
  for (const post of posts) {
    const board = LOCAL_BOARD_MAP[post.board_id];
    if (board && LOCAL_NATIONAL_BOARDS.has(board)) {
      counts[board] = (counts[board] || 0) + 1;
      localTotal++;
    }
  }
  if (Object.keys(counts).length === 0) return null;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topBoard, topCount] = sorted[0];
  // Richiede almeno 3 post locali E almeno 25% dei post locali totali
  if (topCount < 3) return null;
  if (localTotal > 0 && (topCount / localTotal) < 0.25) return null;
  return topBoard;
}

// ─── SQL Init Statements (run once via dashboard) ────────────────
// Run these manually in Cloudflare D1 console to set up new tables:
//
// ALTER TABLE brdb_users ADD COLUMN posts_total INTEGER DEFAULT 0;
// ALTER TABLE brdb_users ADD COLUMN merit_total INTEGER DEFAULT 0;
// ALTER TABLE brdb_users ADD COLUMN reg_date TEXT;
// ALTER TABLE brdb_users ADD COLUMN last_active TEXT;
// ALTER TABLE brdb_users ADD COLUMN local_board TEXT;
//
// CREATE TABLE IF NOT EXISTS users_index (
//   uid TEXT PRIMARY KEY,
//   username TEXT,
//   local_board TEXT,
//   first_seen INTEGER NOT NULL,
//   last_scraped INTEGER,
//   scrape_failed INTEGER DEFAULT 0
// );
//
// CREATE TABLE IF NOT EXISTS brdb_history (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   uid TEXT NOT NULL,
//   username TEXT,
//   snapshot_date TEXT NOT NULL,
//   BRDb REAL DEFAULT 0,
//   Reputation REAL DEFAULT 0,
//   posts_total INTEGER DEFAULT 0,
//   merit_total INTEGER DEFAULT 0,
//   posts120 INTEGER DEFAULT 0,
//   merit120 INTEGER DEFAULT 0,
//   merits_sent120 INTEGER DEFAULT 0,
//   status TEXT,
//   local_board TEXT,
//   UNIQUE(uid, snapshot_date)
// );
//
// CREATE INDEX IF NOT EXISTS idx_history_uid ON brdb_history(uid);
// CREATE INDEX IF NOT EXISTS idx_history_date ON brdb_history(snapshot_date);
// CREATE INDEX IF NOT EXISTS idx_users_local_board ON brdb_users(local_board);



export default {

  // ─── CRON TRIGGER (daily scraping) ────────────────────────────
  async scheduled(event, env, ctx) {
    console.log('[BRDb Cron] Starting daily scrape...');
    await runSingleUserScrape(env);
  },

  async fetch(request, env, ctx) {
    try {
    // REMOVED: Bitcointalk scraping code
    const u = new URL(request.url);
    const path = u.pathname;

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status, headers: { ...cors, 'Content-Type': 'application/json' }
      });

    // ═══════════════════════════════════════════════════════════════
    // POST /cache — save BRDb calculated data + save to history
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'POST' && path === '/cache') {
      try {
        const body = await request.json();

        // Version check — rifiuta script obsoleti
        const MIN_VERSION = '1.0.0';
        const scriptVersion = body.scriptVersion || body.script_version || null;
        if (!scriptVersion) {
          return json({ error: 'outdated_script', message: 'Script version required. Please update to the latest version from Greasy Fork.' }, 403);
        }
        const parseVer = v => v.split('.').map(Number);
        const [ma, mi, pa] = parseVer(scriptVersion);
        const [mma, mmi, mpa] = parseVer(MIN_VERSION);
        const isOld = ma < mma || (ma === mma && mi < mmi) || (ma === mma && mi === mmi && pa < mpa);
        if (isOld) {
          return json({ error: 'outdated_script', message: `Script v${scriptVersion} is outdated. Minimum required: v${MIN_VERSION}. Please update from Greasy Fork.` }, 403);
        }

        const uid           = body.uid;
        const username      = body.username;
        const BRDb          = body.BRDb;
        const status        = body.status;
        const color         = body.color;
        const Reputation    = body.Reputation;
        const Reliability   = body.Reliability;
        const posts120      = body.posts120;
        const merit120      = body.merit120;
        const meritsSent120 = body.merits_sent120 ?? body.meritsSent120;
        const avgAll        = body.avg_all ?? body.avgAll;
        const avg120        = body.avg_120 ?? body.avg120;
        const impactAll     = body.impact_all ?? body.impactAll;
        const impact120     = body.impact_120 ?? body.impact120;
        const activeDays120 = body.active_days120 ?? body.activeDays120;
        const consistencyScore       = body.consistency_score ?? body.consistencyScore;
        const recentMeritRatio       = body.recent_merit_ratio ?? body.recentMeritRatio;
        const recentPostRatio        = body.recent_post_ratio ?? body.recentPostRatio;
        const meritRateMultiplier    = body.merit_rate_multiplier ?? body.meritRateMultiplier;
        const postRateMultiplier     = body.post_rate_multiplier ?? body.postRateMultiplier;
        const recentMeritRate        = body.recent_merit_rate ?? body.recentMeritRate;
        const historicalMeritRate    = body.historical_merit_rate ?? body.historicalMeritRate;
        const recentPostRate         = body.recent_post_rate ?? body.recentPostRate;
        const historicalPostRate     = body.historical_post_rate ?? body.historicalPostRate;
        const meritSentReceivedRatio = body.merit_sent_received_ratio ?? body.meritSentReceivedRatio;
        const postsTotal    = body.posts_total ?? body.postsTotal ?? 0;
        const meritTotal    = body.merit_total ?? body.meritTotal ?? 0;
        const regDate       = body.reg_date ?? body.regDate ?? null;
        const lastActive    = body.last_active ?? body.lastActive ?? null;
        const localBoard    = body.local_board ?? body.localBoard ?? null;
        const updatedAt     = body.updated_at || Date.now();

        if (!uid || BRDb === undefined) {
          return json({ error: 'Missing uid or BRDb' }, 400);
        }

        // Upsert brdb_users
        await env.brdb_users.prepare(`
          INSERT INTO brdb_users (
            uid, username, BRDb, status, color,
            Reputation, Reliability,
            posts120, merit120, merits_sent120,
            avg_all, avg_120, impact_all, impact_120,
            active_days120, consistency_score,
            recent_merit_ratio, recent_post_ratio,
            merit_rate_multiplier, post_rate_multiplier,
            recent_merit_rate, historical_merit_rate,
            recent_post_rate, historical_post_rate,
            merit_sent_received_ratio,
            posts_total, merit_total, reg_date, last_active, local_board,
            updated_at
          ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?,
            ?, ?,
            ?, ?,
            ?, ?,
            ?,
            ?, ?, ?, ?, ?, ?,
            ?
          )
          ON CONFLICT(uid) DO UPDATE SET
            username = excluded.username,
            BRDb = excluded.BRDb,
            status = CASE WHEN brdb_users.banned=1 THEN 'Banned' ELSE excluded.status END,
            color = CASE WHEN brdb_users.banned=1 THEN '#7f1d1d' ELSE excluded.color END,
            Reputation = excluded.Reputation,
            Reliability = excluded.Reliability,
            posts120 = excluded.posts120,
            merit120 = excluded.merit120,
            merits_sent120 = excluded.merits_sent120,
            avg_all = excluded.avg_all,
            avg_120 = excluded.avg_120,
            impact_all = excluded.impact_all,
            impact_120 = excluded.impact_120,
            active_days120 = excluded.active_days120,
            consistency_score = excluded.consistency_score,
            recent_merit_ratio = excluded.recent_merit_ratio,
            recent_post_ratio = excluded.recent_post_ratio,
            merit_rate_multiplier = excluded.merit_rate_multiplier,
            post_rate_multiplier = excluded.post_rate_multiplier,
            recent_merit_rate = excluded.recent_merit_rate,
            historical_merit_rate = excluded.historical_merit_rate,
            recent_post_rate = excluded.recent_post_rate,
            historical_post_rate = excluded.historical_post_rate,
            merit_sent_received_ratio = excluded.merit_sent_received_ratio,
            posts_total = excluded.posts_total,
            merit_total = excluded.merit_total,
            reg_date = COALESCE(excluded.reg_date, brdb_users.reg_date),
            last_active = COALESCE(excluded.last_active, brdb_users.last_active),
            local_board = COALESCE(excluded.local_board, brdb_users.local_board),
            posts_wiped = CASE WHEN excluded.posts120 > 0 AND excluded.merit120 > 0 THEN 0 ELSE COALESCE(brdb_users.posts_wiped, 0) END,
            updated_at = excluded.updated_at
        `).bind(
          uid, username || null, BRDb, status || null, color || null,
          Reputation || 0, Reliability || 0,
          posts120 || 0, merit120 || 0, meritsSent120 || 0,
          avgAll || 0, avg120 || 0, impactAll || 0, impact120 || 0,
          activeDays120 || 0, consistencyScore || 0,
          recentMeritRatio || 0, recentPostRatio || 0,
          meritRateMultiplier || 0, postRateMultiplier || 0,
          recentMeritRate || 0, historicalMeritRate || 0,
          recentPostRate || 0, historicalPostRate || 0,
          meritSentReceivedRatio || 0,
          postsTotal, meritTotal, regDate, lastActive, localBoard,
          updatedAt
        ).run();

        // Aggiorna merit_total_bt_removed e last_scraped
        if (meritTotalBt > 0) {
          await env.brdb_users.prepare(
            'UPDATE brdb_users SET merit_total_bt_removed = ?, last_scraped = ? WHERE uid = ?'
          ).bind(meritTotalBt, Date.now(), uid).run();
        } else {
          await env.brdb_users.prepare(
            'UPDATE brdb_users SET last_scraped = ? WHERE uid = ?'
          ).bind(Date.now(), uid).run();
        }

        // Save daily snapshot to brdb_history (INSERT OR IGNORE = one per day)
        const today = new Date().toISOString().split('T')[0]; console.log(`[DEBUG] Server date: ${today}`);
        await env.brdb_users.prepare(`
          INSERT OR IGNORE INTO brdb_history (
            uid, username, snapshot_date,
            BRDb, Reputation,
            posts_total, merit_total, merit_total_bt_removed,
            posts120, merit120, merits_sent120,
            status, local_board, scrape_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          uid, username || null, today,
          BRDb, Reputation || 0,
          postsTotal, meritTotal,
          posts120 || 0, merit120 || 0, meritsSent120 || 0,
          status || null, localBoard || null
        ).run();

  // ═══════════════════════════════════════════════════════════════
  // SALVATAGGIO SNAPSHOT GIORNALIERO AUTOMATICO
  // ═══════════════════════════════════════════════════════════════
  const _snapshotTodayStr = new Date().toISOString().split('T')[0];
  const _existingSnapshotToday = await env.brdb_users.prepare(
    'SELECT id FROM brdb_history WHERE uid = ? AND snapshot_date = ?'
  ).bind(uid, _snapshotTodayStr).first();
  
  if (!_existingSnapshotToday) {
    await env.brdb_users.prepare(`
      INSERT OR IGNORE INTO brdb_history (
        uid, username, snapshot_date,
        BRDb, Reputation,
        posts_total, merit_total,
        posts120, merit120, merits_sent120,
        status, local_board, scrape_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      uid, username, _snapshotTodayStr,
      BRDb, scores.Reputation,
      postsTotal, meritTotal,
      posts120, merit120, merits_sent120,
      status, localBoard, 'auto_snapshot'
    ).run();
    console.log(`[Snapshot] Auto-snapshot per ${uid} al ${_snapshotTodayStr}, BRDb=${BRDb}`);
  }


        // REMOVED: old code
        let resolvedLocalBoard = localBoard || null;
        if (!resolvedLocalBoard && APIkey && username) {
          try {
            const postsRes = await fetch(
              `// REMOVED: old API endpoint`,
              { headers: { 'X-API-KEY': APIkey, 'Accept': 'application/json' } }
            );
            if (postsRes.ok) {
              const postsData = await postsRes.json();
              resolvedLocalBoard = detectLocalBoard(postsData.posts || []);
            }
          } catch (_) { /* best effort */ }
        }

        // If we detected a board, update brdb_users too
        if (resolvedLocalBoard && !localBoard) {
          await env.brdb_users.prepare(
            'UPDATE brdb_users SET local_board = ? WHERE uid = ? AND local_board IS NULL'
          ).bind(resolvedLocalBoard, uid).run();
        }

        // Upsert users_index so we track this user
        await env.brdb_users.prepare(`
          INSERT INTO users_index (uid, username, local_board, first_seen, last_scraped)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(uid) DO UPDATE SET
            username = excluded.username,
            local_board = COALESCE(excluded.local_board, users_index.local_board),
            last_scraped = excluded.last_scraped
        `).bind(uid, username || null, resolvedLocalBoard || null, updatedAt, updatedAt).run();

        return json({ ok: true, local_board: resolvedLocalBoard });
      } catch (err) {
        console.error('POST /cache error:', err);
        return json({ error: err.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // GET /populate-bans — fetch banned users from loyce.club and mark them
    // ═══════════════════════════════════════════════════════════════
    if ((request.method === 'GET' || request.method === 'POST') && path === '/populate-bans') {
      const secret = u.searchParams.get('secret');
      if (!secret || secret !== env.CRON_SECRET) return json({ error: 'Unauthorized' }, 401);
      try {
        // Supporta sia fetch diretto che ricezione dati via POST body
        let lines = [];
        if (request.method === 'POST') {
          const body = await request.json();
          lines = (body.bans || '').trim().split('\n');
        } else {
          const res = await fetch('https://loyce.club/bans/usernames.txt');
          if (!res.ok) throw new Error('Failed to fetch bans: HTTP ' + res.status);
          const text = await res.text();
          lines = text.trim().split('\n');
        }
        let marked = 0, notFound = 0;
        const stmts = [];
        for (const line of lines) {
          const match = line.match(/^(\d+):/);
          if (!match) continue;
          const uid = match[1];
          stmts.push(env.brdb_users.prepare(
            'UPDATE brdb_users SET banned = 1, status = \'Banned\', color = \'#7f1d1d\' WHERE uid = ?'
          ).bind(uid));
          stmts.push(env.brdb_users.prepare(
            'UPDATE users_index SET banned = 1 WHERE uid = ?'
          ).bind(uid));
        }
        // Execute in batches of 100
        for (let i = 0; i < stmts.length; i += 100) {
          const results = await env.brdb_users.batch(stmts.slice(i, i + 100));
          for (const r of results) {
            if (r.meta?.changes > 0) marked++;
          }
        }
        return json({ ok: true, total_bans: lines.length, marked: Math.floor(marked / 2), not_in_db: Math.floor((stmts.length - marked) / 2) });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // GET /search?q=XXX — search users by username or uid (autocomplete)
    if (request.method === 'GET' && path === '/search') {
      const q = u.searchParams.get('q') || '';
      if (q.length < 2) return json({ results: [] });
      try {
        const isUid = /^\d+$/.test(q);
        let rows;
        if (isUid) {
          rows = await env.brdb_users.prepare(
            `SELECT uid, username, BRDb, status, color, local_board FROM brdb_users
             WHERE uid LIKE ? AND COALESCE(banned,0)=0 AND COALESCE(posts_wiped,0)=0
             ORDER BY BRDb DESC LIMIT 10`
          ).bind(q + '%').all();
        } else {
          rows = await env.brdb_users.prepare(
            `SELECT uid, username, BRDb, status, color, local_board FROM brdb_users
             WHERE username LIKE ? AND COALESCE(banned,0)=0 AND COALESCE(posts_wiped,0)=0
             ORDER BY BRDb DESC LIMIT 10`
          ).bind(q + '%').all();
        }
        return json({ results: rows.results || [] });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // POST /populate-merit?secret=XXX — import earned merit from Loyce
    // Body: { merits: { "uid": earned_merit, ... } }
    if (request.method === 'POST' && path === '/populate-merit') {
      const secret = u.searchParams.get('secret');
      if (!secret || secret !== env.CRON_SECRET) return json({ error: 'Unauthorized' }, 401);
      try {
        const body = await request.json();
        const merits = body.merits || {};
        const entries = Object.entries(merits);
        if (!entries.length) return json({ error: 'Missing merits object' }, 400);
        let updated = 0, notFound = 0;
        const BATCH = 100;
        for (let i = 0; i < entries.length; i += BATCH) {
          const batch = entries.slice(i, i + BATCH);
          const stmts = batch.map(([uid, earned]) =>
            env.brdb_users.prepare(
              'UPDATE brdb_users SET merit_earned = ? WHERE uid = ?'
            ).bind(earned, String(uid))
          );
          const results = await env.brdb_users.batch(stmts);
          for (const r of results) {
            if (r.meta?.changes > 0) updated++;
            else notFound++;
          }
        }
        return json({ ok: true, updated, not_in_db: notFound, total: entries.length });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // POST /populate-loyce — bulk import UIDs from external sources (Loyce, trust lists)
    // Body: { uids: ["123","456",...] }
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'POST' && path === '/populate-loyce') {
      const secret = u.searchParams.get('secret');
      if (!secret || secret !== env.CRON_SECRET) return json({ error: 'Unauthorized' }, 401);
      try {
        const body = await request.json();
        const uids = (body.uids || []).map(String).filter(Boolean);
        if (!uids.length) return json({ error: 'Missing uids array' }, 400);
        const now = Date.now();
        const BATCH_SIZE = 100;
        let inserted = 0, skipped = 0;
        for (let i = 0; i < uids.length; i += BATCH_SIZE) {
          const batch = uids.slice(i, i + BATCH_SIZE);
          const stmts = batch.map(uid =>
            env.brdb_users.prepare(`
              INSERT INTO users_index (uid, first_seen)
              VALUES (?, ?)
              ON CONFLICT(uid) DO NOTHING
            `).bind(uid, now)
          );
          const results = await env.brdb_users.batch(stmts);
          for (const r of results) {
            if (r.meta?.changes > 0) inserted++;
            else skipped++;
          }
        }
        return json({ ok: true, inserted, skipped, total: uids.length });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // POST /users-index — bulk save UserIDs from post scraping
    // Body: { users: [{ uid, username, board_id? }] }
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'POST' && path === '/users-index') {
      try {
        const body = await request.json();
        const users = body.users || [];
        if (!Array.isArray(users) || users.length === 0) {
          return json({ error: 'Missing users array' }, 400);
        }

        let inserted = 0;
        const now = Date.now();

        // Batch insert — D1 supports up to 100 statements per batch
        const BATCH_SIZE = 50;
        for (let i = 0; i < users.length; i += BATCH_SIZE) {
          const batch = users.slice(i, i + BATCH_SIZE);
          const stmts = batch.map(u =>
            env.brdb_users.prepare(`
              INSERT INTO users_index (uid, username, local_board, first_seen)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(uid) DO UPDATE SET
                username = COALESCE(excluded.username, users_index.username)
            `).bind(
              String(u.uid),
              u.username || null,
              LOCAL_BOARD_MAP[u.board_id] || null,
              now
            )
          );
          await env.brdb_users.batch(stmts);
          inserted += batch.length;
        }

        return json({ ok: true, inserted });
      } catch (err) {
        console.error('POST /users-index error:', err);
        return json({ error: err.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // GET /cron?secret=XXX — trigger manual scrape of 1 user
    // Utile con cron-job.org per girare ogni minuto gratuitamente
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/cron') {
      const secret = u.searchParams.get('secret');
      if (!secret || secret !== env.CRON_SECRET) {
        return json({ error: 'Unauthorized' }, 401);
      }
      try {
        const today = new Date().toISOString().split('T')[0]; console.log(`[DEBUG] Server date: ${today}`);
        const dateMin120 = new Date(Date.now() - 120 * 86400000).toISOString().split('T')[0];
        const threshold24h = 0; // Accetta tutti, esaurisci la coda
        const batchSize = Math.min(parseInt(u.searchParams.get('batch') || '5'), 20);
        const forceUid = u.searchParams.get('uid');

        const rows = await env.brdb_users.prepare(forceUid
          ? `SELECT ui.uid, ui.username, ui.local_board, bu.merit_earned
             FROM users_index ui LEFT JOIN brdb_users bu ON bu.uid = ui.uid
             WHERE ui.uid = ? LIMIT 1`
          : `SELECT ui.uid, ui.username, ui.local_board, bu.merit_earned
             FROM users_index ui LEFT JOIN brdb_users bu ON bu.uid = ui.uid
             WHERE ui.uid != '__cron_counter__'
             AND ui.uid != '__cron_counter__'
          ORDER BY ui.last_scraped ASC NULLS FIRST
          LIMIT ?
        `).bind(...(forceUid ? [forceUid] : [batchSize])).all();

        // Auto-populate ogni 50 invocazioni (circa ogni 10 minuti con batch=5)
        // Usa un contatore nel D1 tramite una chiave speciale in users_index
        const cronCounter = await env.brdb_users.prepare(
          `SELECT scrape_failed as val FROM users_index WHERE uid = '__cron_counter__'`
        ).first();
        const counter = (cronCounter?.val || 0) + 1;
        await env.brdb_users.prepare(
          `INSERT INTO users_index (uid, scrape_failed, first_seen) VALUES ('__cron_counter__', ?, 0)
           ON CONFLICT(uid) DO UPDATE SET scrape_failed = ?`
        ).bind(counter, counter).run();

        // Ogni 500 invocazioni aggiorna la lista dei bannati (~42 min con 2 job batch=20)
        if (counter % 500 === 0) {
          try {
            const banRes = await fetch('https://loyce.club/bans/usernames.txt', {
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (banRes.ok) {
              const banText = await banRes.text();
              const banLines = banText.trim().split('\n');
              const banStmts = [];
              for (const line of banLines) {
                const m = line.match(/^(\d+):/);
                if (!m) continue;
                banStmts.push(env.brdb_users.prepare(
                  'UPDATE brdb_users SET banned = 1, status = \'Banned\', color = \'#7f1d1d\' WHERE uid = ?'
                ).bind(m[1]));
              }
              for (let i = 0; i < banStmts.length; i += 100) {
                await env.brdb_users.batch(banStmts.slice(i, i + 100));
              }
              console.log('[Cron] Auto-ban update: ' + banLines.length + ' bans processed');
            }
          } catch (_) { /* best-effort */ }
        }

        // Ogni 50 invocazioni esegui un populate automatico
        if (counter % 50 === 0) {
          // Offset sempre crescente — esplora sempre più indietro nel tempo
          const populateIndex = Math.floor(counter / 50) % 200; // reset ogni 10000 invocazioni (~200 pagine max)
          const offset = populateIndex * 100;
          // Fetcha 5 pagine da 100 post = 500 post per ciclo di populate
          const foundUsers = new Map();
          let totalPopPosts = 0;
          for (let pg = 0; pg < 5; pg++) {
            const popRes = await fetch(
              `// REMOVED: old API endpoint`,
              { headers: { 'X-API-KEY': APIkey, 'Accept': 'application/json' } }
            );
            if (!popRes.ok) break;
            const popData = await popRes.json();
            const posts = popData.posts || [];
            if (posts.length === 0) break;
            totalPopPosts += posts.length;

            for (const post of posts) {
              // 1. Autore del post
              const pUid = String(post.author_uid);
              if (pUid && pUid !== '__cron_counter__') {
                const board = post.board_id ? (LOCAL_BOARD_MAP[post.board_id] || null) : null;
                if (!foundUsers.has(pUid)) foundUsers.set(pUid, { username: post.author || null, board });
              }
              // 2. UID estratti da link profilo nel corpo HTML (quote, menzioni, tabelle)
              const body = post.body_html || post.body || '';
              const re = /action=profile;u=(\d+)/g;
              let m;
              while ((m = re.exec(body)) !== null) {
                const mUid = m[1];
                if (mUid && !foundUsers.has(mUid)) {
                  foundUsers.set(mUid, { username: null, board: null });
                }
              }
            }
          }

          // Inserisci tutti in users_index
          let newUsers = 0;
          const nowPop = Date.now();
          for (const [uid, info] of foundUsers) {
            const r = await env.brdb_users.prepare(
              `INSERT INTO users_index (uid, username, local_board, first_seen)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(uid) DO UPDATE SET
                 username = COALESCE(users_index.username, excluded.username),
                 local_board = COALESCE(users_index.local_board, excluded.local_board)`
            ).bind(uid, info.username, info.board, nowPop).run();
            if (r.meta?.changes > 0) newUsers++;
          }
          console.log(`[Cron] Auto-populate offset=${offset}: ${foundUsers.size} users found (${newUsers} new) from ${totalPopPosts} posts`);
        }

        if (!rows.results.length) return json({ ok: true, message: 'All users up to date', counter });

        const users = rows.results;

        // Rispondo subito a cron-job.org — il lavoro continua in background
        ctx.waitUntil((async () => {
          const now = Date.now();
          const markStmts = users.map(row =>
            env.brdb_users.prepare('UPDATE users_index SET last_scraped = ? WHERE uid = ?').bind(now, row.uid)
          );
          await env.brdb_users.batch(markStmts);

          for (const row of users) {
            try {
              await scrapeAndSave(row, dateMin120, today, APIkey, env);
            } catch (err) {
              if (err.message.startsWith('SKIP:')) {
                await env.brdb_users.prepare(
                  'UPDATE users_index SET last_scraped = ?, scrape_failed = scrape_failed + 1 WHERE uid = ?'
                ).bind(Date.now(), row.uid).run();
              } else {
                await env.brdb_users.prepare(
                  'UPDATE users_index SET scrape_failed = scrape_failed + 1 WHERE uid = ?'
                ).bind(row.uid).run();
                console.error(`[Cron] Failed uid ${row.uid}:`, err.message);
              }
            }
          }
        })());

        return json({ ok: true, queued: users.length, uids: users.map(r => r.uid), counter });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // POST /migrate?secret=X — esegui SQL DDL
    if (request.method === 'POST' && path === '/migrate') {
      const secret = u.searchParams.get('secret');
      if (!secret || secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      try {
        const body = await request.json();
        if (!body.sql) return json({ error: 'Missing sql' }, 400);
        const result = await env.brdb_users.prepare(body.sql).run();
        return json({ ok: true, meta: result.meta });
      } catch(err) { return json({ error: err.message }, 500); }
    }

    // POST /query?secret=X — esegui SQL SELECT (solo lettura)
    if (request.method === 'POST' && path === '/query') {
      const secret = u.searchParams.get('secret');
      if (!secret || secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      try {
        const body = await request.json();
        if (!body.sql) return json({ error: 'Missing sql' }, 400);
        const result = await env.brdb_users.prepare(body.sql).all();
        return json({ ok: true, results: result.results });
      } catch(err) { return json({ error: err.message }, 500); }
    }

    // POST /set-posts-wiped?uid=X&wiped=1&secret=Y
    if (request.method === 'POST' && path === '/set-posts-wiped') {
      const secret = u.searchParams.get('secret');
      if (!secret || secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const uid = u.searchParams.get('uid');
      const wiped = u.searchParams.get('wiped') !== '0' ? 1 : 0;
      if (!uid) return json({ error: 'Missing uid' }, 400);
      try {
        await env.brdb_users.prepare(
          'UPDATE brdb_users SET posts_wiped = ? WHERE uid = ?'
        ).bind(wiped, uid).run();
        const row = await env.brdb_users.prepare(
          'SELECT uid, username, posts_wiped FROM brdb_users WHERE uid = ?'
        ).bind(uid).first();
        return json({ ok: true, uid, username: row?.username, posts_wiped: wiped });
      } catch(err) { return json({ error: err.message }, 500); }
    }

    // POST /force-rescore?uid=X&secret=Y — ricalcola BRDb/Reputation con merit_earned dal DB
    if (request.method === 'POST' && path === '/force-rescore') {
      const secret = u.searchParams.get('secret');
      if (!secret || secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const uid = u.searchParams.get('uid');
      if (!uid) return json({ error: 'Missing uid' }, 400);
      try {
        const today = new Date().toISOString().split('T')[0]; console.log(`[DEBUG] Server date: ${today}`);
        const dateMin120 = new Date(Date.now() - 120 * 86400000).toISOString().split('T')[0];
        const dbRow = await env.brdb_users.prepare(
          'SELECT * FROM brdb_users WHERE uid = ?'
        ).bind(uid).first();
        if (!dbRow) return json({ error: 'User not found in DB' }, 404);

        const user = { uid, username: dbRow.username, local_board: dbRow.local_board, merit_earned: dbRow.merit_earned };
        // REMOVED: old scraping code
        await scrapeUserFromBitcointalk(user, env);

        const updated = await env.brdb_users.prepare(
          'SELECT uid, username, BRDb, Reputation, merit_total, merit_earned, status FROM brdb_users WHERE uid = ?'
        ).bind(uid).first();
        return json({ ok: true, before: { BRDb: dbRow.BRDb, Reputation: dbRow.Reputation }, after: updated });
      } catch(err) { return json({ error: err.message }, 500); }
    }

    // POST /zero-merit?secret=X — setta merit_earned=0 per tutti i NULL (non in lista Loyce)
    if (request.method === 'POST' && path === '/zero-merit') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      try {
        const result = await env.brdb_users.prepare(
          'UPDATE brdb_users SET merit_earned = 0 WHERE merit_earned IS NULL'
        ).run();
        return json({ ok: true, updated: result.meta?.changes ?? 0 });
      } catch(err) { return json({ error: err.message }, 500); }
    }

    // GET /rank-debug?uid=X — mostra chi sta davanti in classifica
    if (request.method === 'GET' && path === '/rank-debug') {
      const uid = u.searchParams.get('uid');
      if (!uid) return json({ error: 'Missing uid' }, 400);
      try {
        const target = await env.brdb_users.prepare(
          'SELECT uid, username, Reputation, BRDb, impact_all, banned, status FROM brdb_users WHERE uid = ?'
        ).bind(uid).first();
        if (!target) return json({ error: 'not found' }, 404);

        const above = await env.brdb_users.prepare(
          'SELECT uid, username, Reputation, BRDb, banned, status FROM brdb_users WHERE Reputation >= ? ORDER BY Reputation DESC, CAST(uid AS INTEGER) ASC LIMIT 20'
        ).bind(target.Reputation).all();

        return json({ target, above_in_reputation: above.results });
      } catch(err) { return json({ error: err.message }, 500); }
    }

    // GET /rank?uid=X — posizione globale nelle classifiche BRDb, Reputation, impact
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/rank') {
      const uid = u.searchParams.get('uid');
      if (!uid) return json({ error: 'Missing uid' }, 400);
      try {
        // ROW_NUMBER() con stesso ordinamento della leaderboard (col DESC, uid ASC come tiebreaker)
        const row = await env.brdb_users.prepare(`
          SELECT
            brdb_rn   as BRDb,
            rep_rn    as Reputation,
            impact_rn as impact,
            total
          FROM (
            SELECT
              uid,
              ROW_NUMBER() OVER (ORDER BY BRDb       DESC, CAST(uid AS INTEGER) ASC) as brdb_rn,
              ROW_NUMBER() OVER (ORDER BY Reputation  DESC, CAST(uid AS INTEGER) ASC) as rep_rn,
              ROW_NUMBER() OVER (ORDER BY impact_all  DESC, CAST(uid AS INTEGER) ASC) as impact_rn,
              COUNT(*) OVER () as total
            FROM brdb_users
            WHERE COALESCE(banned,0) = 0 AND status != 'Banned' AND COALESCE(posts_wiped,0) = 0
          )
          WHERE uid = ?
        `).bind(uid).first();

        if (!row) return json({ error: 'User not found' }, 404);
        return json({
          uid,
          BRDb:       row.BRDb,
          Reputation: row.Reputation,
          impact:     row.impact,
          total:      row.total,
        });
      } catch(err) { return json({ error: err.message }, 500); }
    }

    // GET /debug-board?uid=X&secret=XXX — show board distribution for a user
    // GET /debug-merit?uid=X — confronto merit_total vs merit_earned vs BRDb calcolato
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/debug-merit') {
      const uid = u.searchParams.get('uid');
      if (!uid) return json({ error: 'Missing uid' }, 400);

      const row = await env.brdb_users.prepare(`
        SELECT uid, username, merit_total, merit_earned, BRDb, Reputation,
               posts_total, posts120, merit120, status, local_board, updated_at
        FROM brdb_users WHERE uid = ?
      `).bind(uid).first();

      if (!row) return json({ error: 'User not found' }, 404);

      const merit_airdrop = (row.merit_total || 0) - (row.merit_earned != null ? row.merit_earned : row.merit_total);
      const merit_for_calc = row.merit_earned != null ? row.merit_earned : row.merit_total;

      // Ricalcola BRDb con merit_total (senza correzione)
      const regDate = row.reg_date ? new Date(row.reg_date) : null;
      const scoresWithTotal = calculateScores(row.posts_total||0, row.merit_total||0, row.posts120||0, row.merit120||0, [], regDate, new Date(), 0);
      const BRDbWithTotal = calcBRDb(scoresWithTotal.Reputation, row.merit120||0, row.posts120||0, scoresWithTotal.badgeFormer, scoresWithTotal.isHistoricalUser, new Date(), row.merit_total||0);

      // Ricalcola BRDb con merit_earned (con correzione airdrop)
      const scoresWithEarned = calculateScores(row.posts_total||0, merit_for_calc, row.posts120||0, row.merit120||0, [], regDate, new Date(), 0);
      const BRDbWithEarned = calcBRDb(scoresWithEarned.Reputation, row.merit120||0, row.posts120||0, scoresWithEarned.badgeFormer, scoresWithEarned.isHistoricalUser, new Date(), merit_for_calc);

      return new Response(JSON.stringify({
        uid: row.uid,
        username: row.username,
        status: row.status,
        merit: {
          merit_total:   row.merit_total   || 0,
          merit_earned:  row.merit_earned  != null ? row.merit_earned : '(not set)',
          merit_airdrop: row.merit_earned  != null ? merit_airdrop : '(unknown)',
          merit_used_for_calc: merit_for_calc,
        },
        BRDb_current_in_db: row.BRDb,
        BRDb_with_merit_total:  parseFloat(BRDbWithTotal.toFixed(3)),
        BRDb_with_merit_earned: parseFloat(BRDbWithEarned.toFixed(3)),
        BRDb_difference: parseFloat((BRDbWithTotal - BRDbWithEarned).toFixed(3)),
        Reputation_with_total:  parseFloat(scoresWithTotal.Reputation.toFixed(3)),
        Reputation_with_earned: parseFloat(scoresWithEarned.Reputation.toFixed(3)),
        posts_total: row.posts_total,
        posts120:    row.posts120,
        merit120:    row.merit120,
        last_updated: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      }, null, 2), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (request.method === 'GET' && path === '/debug-board') {
      const secret = u.searchParams.get('secret');
      if (!secret || secret !== env.CRON_SECRET) return json({ error: 'Unauthorized' }, 401);
      const testUid = u.searchParams.get('uid');
      if (!testUid) return json({ error: 'Missing uid' }, 400);
      // Get username first
      const userRow = await env.brdb_users.prepare('SELECT username FROM brdb_users WHERE uid = ?').bind(testUid).first();
      const username = userRow?.username;
      if (!username) return json({ error: 'User not in DB', uid: testUid }, 404);
      const postsRes = await fetch(
        `// REMOVED: old API endpoint`,
        { headers: { 'X-API-KEY': APIkey, 'Accept': 'application/json' } }
      );
      if (!postsRes.ok) return json({ error: `Bitcointalk posts HTTP ${postsRes.status}` }, 500);
      const postsData = await postsRes.json();
      const posts = postsData.posts || [];
      // Count by board_id
      const boardCounts = {};
      for (const p of posts) {
        const bid = p.board_id;
        const name = LOCAL_BOARD_MAP[bid] || `board_${bid}`;
        boardCounts[name] = (boardCounts[name] || 0) + 1;
      }
      const sorted = Object.entries(boardCounts).sort((a, b) => b[1] - a[1]);
      const detected = detectLocalBoard(posts);
      return json({ uid: testUid, username, total_posts: posts.length, board_distribution: sorted, detected_board: detected });
    }

    // ═══════════════════════════════════════════════════════════════
    // GET /populate?secret=XXX&pages=N — fetch posts from Bitcointalk
    // and populate users_index with all found author_uids
    // pages default 50 = 5000 posts, max 200 = 20000 posts
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/populate') {
      const secret = u.searchParams.get('secret');
      if (!secret || secret !== env.CRON_SECRET) return json({ error: 'Unauthorized' }, 401);

      const pages = Math.min(parseInt(u.searchParams.get('pages') || '50'), 200);
      const offset_start = parseInt(u.searchParams.get('offset') || '0');
      const now = Date.now();
      let inserted = 0, alreadyKnown = 0, totalPosts = 0;
      const seenInSession = new Set(); // solo per dedup dentro questa sessione

      for (let page = 0; page < pages; page++) {
        const offset = offset_start + page * 100;
        try {
          const res = await fetch(
            `// REMOVED: old API endpoint`,
            { headers: { 'X-API-KEY': APIkey, 'Accept': 'application/json' } }
          );
          if (!res.ok) {
            console.warn(`[Populate] Page ${page} HTTP ${res.status}, stopping`);
            break; 
          }
          const data = await res.json();
          const posts = data.posts || [];
          if (posts.length === 0) {
            console.log(`[Populate] No more posts at offset ${offset}, stopping`);
            break;
          }
          totalPosts += posts.length;

          // Collect unique uids: autori + UID estratti dal corpo HTML
          const newUsers = [];
          for (const post of posts) {
            // 1. Autore del post
            const uid = String(post.author_uid || post.user_id || '');
            if (uid && !seenInSession.has(uid)) {
              seenInSession.add(uid);
              const localBoard = LOCAL_BOARD_MAP[post.board_id] || null;
              newUsers.push({ uid, username: post.author || null, localBoard });
            }
            // 2. UID da link profilo nel corpo HTML (quote, menzioni, tabelle)
            const body = post.body_html || post.body || '';
            const re = /action=profile;u=(\d+)/g;
            let m;
            while ((m = re.exec(body)) !== null) {
              const mUid = m[1];
              if (mUid && !seenInSession.has(mUid)) {
                seenInSession.add(mUid);
                newUsers.push({ uid: mUid, username: null, localBoard: null });
              }
            }
          }

          // Batch upsert — ON CONFLICT aggiorna solo se migliora i dati
          if (newUsers.length > 0) {
            const stmts = newUsers.map(uu =>
              env.brdb_users.prepare(`
                INSERT INTO users_index (uid, username, local_board, first_seen)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(uid) DO UPDATE SET
                  username = COALESCE(excluded.username, users_index.username),
                  local_board = COALESCE(excluded.local_board, users_index.local_board)
              `).bind(uu.uid, uu.username, uu.localBoard, now)
            );
            const results = await env.brdb_users.batch(stmts);
            // changes=1 → nuova riga inserita, changes=0 → già esisteva (ON CONFLICT no-op o update senza modifica)
            for (const r of results) {
              if ((r.meta?.last_row_id > 0) && (r.meta?.changes > 0)) inserted++;
              else alreadyKnown++;
            }
          }

          console.log(`[Populate] Page ${page+1}/${pages} (offset ${offset}): ${posts.length} posts, ${newUsers.length} unique uids this page`);
        } catch (err) {
          console.error(`[Populate] Error at page ${page}:`, err.message);
          break;
        }
      }

      // Get current total in users_index
      const totalIndex = await env.brdb_users.prepare('SELECT COUNT(*) as count FROM users_index').first();

      return json({
        ok: true,
        pages_fetched: Math.ceil(totalPosts / 100) || 0,
        total_posts_scanned: totalPosts,
        new_users_inserted: inserted,
        already_in_db: alreadyKnown,
        total_users_index: totalIndex.count,
        has_api_key: !!APIkey,
        params: { pages, offset_start }
      });
    }

// POST /recalc-brdb?uid=X&secret=Y — ricalcola BRDb usando i dati del tuo database
if (request.method === 'POST' && path === '/recalc-brdb') {
  const secret = u.searchParams.get('secret');
  if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
  const uid = u.searchParams.get('uid');
  if (!uid) return json({ error: 'Missing uid' }, 400);
  
  try {
    const profile = await env.MERIT_DB.prepare('SELECT * FROM user_profiles WHERE uid = ?').bind(uid).first();
    if (!profile) return json({ error: 'User not found in MERIT_DB' }, 404);
    
    const merits120 = await env.MERIT_DB.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM merit_events WHERE to_uid = ? AND collected_at > ?'
    ).bind(uid, Date.now() - 120*86400000).first();
    
    const sent120 = await env.MERIT_DB.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM merit_events WHERE from_uid = ? AND collected_at > ?'
    ).bind(uid, Date.now() - 120*86400000).first();
    
    const posts120 = profile.posts_120d || 0;
    const merit120 = merits120?.total || 0;
    const postsTotal = profile.posts_total || 0;
    const meritTotal = profile.merit_total || 0;
    const regDate = profile.reg_date || null;
    
    // Calcola active_days120 da post_events
    const activeDaysResult = await env.MERIT_DB.prepare(
      'SELECT COUNT(DISTINCT DATE(timestamp)) as days FROM post_events WHERE uid = ? AND collected_at > ?'
    ).bind(uid, Date.now() - 120*86400000).first();
    const activeDays = activeDaysResult?.days || 0;
    
    // Crea un array fittizio per il calcolo
    const postsArr = new Array(120).fill(0);
    for (let i = 0; i < Math.min(activeDays, 120); i++) postsArr[i] = 1;
    
    const scores = calculateScores(postsTotal, meritTotal, posts120, merit120, postsArr, regDate ? new Date(regDate) : null, new Date(), sent120?.total || 0);
    const BRDb = calcBRDb(scores.Reputation, merit120, posts120, scores.badgeFormer, scores.isHistoricalUser, new Date(), meritTotal);
    const status = statusLabel(scores.promising, scores.badgeDormant, scores.badgeFormer, scores.badgeReactivated, scores.isHistoricalUser);
    
    // Aggiorna brdb_users con TUTTI i campi calcolati
    await env.brdb_users.prepare(`
      INSERT OR REPLACE INTO brdb_users (
        uid, username, BRDb, status, color,
        Reputation, Reliability,
        posts120, merit120, merits_sent120,
        avg_all, avg_120, impact_all, impact_120,
        active_days120, consistency_score,
        recent_merit_ratio, recent_post_ratio,
        merit_rate_multiplier, post_rate_multiplier,
        recent_merit_rate, historical_merit_rate,
        recent_post_rate, historical_post_rate,
        merit_sent_received_ratio,
        posts_total, merit_total, reg_date, last_active, local_board,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?,
        ?, ?, ?, ?, ?,
        ?
      ) 
    `).bind(
      uid, profile.username || null, BRDb, status, '#22c55e',
      scores.Reputation, scores.Reliability,
      posts120, merit120, sent120?.total || 0,
      postsTotal > 0 ? meritTotal / postsTotal : 0,
      posts120 > 0 ? merit120 / posts120 : 0,
      meritTotal * 1.5 + postsTotal * 0.5,
      merit120 * 1.5 + posts120 * 0.5,
      scores.activeDays120, scores.consistencyScore,
      scores.recentMeritRatio, scores.recentPostRatio,
      scores.meritRateMultiplier, scores.postRateMultiplier,
      scores.recentMeritRate, scores.historicalMeritRate,
      scores.recentPostRate, scores.historicalPostRate,
      scores.meritSentReceivedRatio,
      postsTotal, meritTotal,
      profile.reg_date || null,
      profile.last_active || null,
      profile.local_board || null,
      Date.now()
    ).run();
    
    // Salva anche nella history
    const today = new Date().toISOString().split('T')[0];
    await env.brdb_users.prepare(`
      INSERT OR REPLACE INTO brdb_history (
        uid, username, snapshot_date,
        BRDb, Reputation, posts_total, merit_total,
        posts120, merit120, merits_sent120,
        status, local_board, scrape_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      uid, profile.username || null, today,
      BRDb, scores.Reputation, postsTotal, meritTotal,
      posts120, merit120, sent120?.total || 0,
      status, profile.local_board || null, 'recalc'
    ).run();
    
    return json({ ok: true, uid, BRDb, status, postsTotal, meritTotal, posts120, merit120, history_saved: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

        // ═══════════════════════════════════════════════════════════════
    //     // ═══════════════════════════════════════════════════════════════
    // GET /profile/:uid — public BRDb profile page
    const profileMatch = path.match(/^\/profile\/(\d+)$/);
    if (request.method === 'GET' && profileMatch) {
      const uid = profileMatch[1];
      try {
        // 1. Fetch dati freschi da user_profiles (scrapati da Bitcointalk)
        const userProfile = await env.MERIT_DB.prepare(
          'SELECT * FROM user_profiles WHERE uid = ?'
        ).bind(uid).first();

        // 2. Fetch dati calcolati da brdb_users
        const brdbRow = await env.brdb_users.prepare(
          'SELECT * FROM brdb_users WHERE uid = ?'
        ).bind(uid).first();

        if (!brdbRow && !userProfile) {
          return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Not Found</title>
     <style>body{background:#060a14;color:#e2e8f0;font-family:sans-serif;font-size:16px;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px}
     a{color:#3b82f6}</style></head><body>
     <div style="font-size:48px">🔍</div>
     <div style="font-size:20px;font-weight:bold">User #${uid} not found</div>
     <div style="color:#64748b">This user hasn't been scored yet</div>
     </body></html>`, { status: 404, headers: { ...cors, 'Content-Type': 'text/html' } });
        }

        // Merge: partiamo da brdbRow (tutti i calcoli), sovrascrivi con dati freschi da user_profiles
        const mergedRow = {
          ...brdbRow,
          username: userProfile?.username || brdbRow?.username || null,
          posts_total: userProfile?.posts_total ?? brdbRow?.posts_total ?? 0,
          merit_total: userProfile?.merit_total ?? brdbRow?.merit_total ?? 0,
          posts120: userProfile?.posts_120d ?? brdbRow?.posts120 ?? 0,
          merit120: userProfile?.merit_received_120d ?? brdbRow?.merit120 ?? 0,
          merits_sent120: userProfile?.merit_sent_120d ?? brdbRow?.merits_sent120 ?? 0,
          reg_date: userProfile?.reg_date || brdbRow?.reg_date || null,
          last_active: userProfile?.last_active || brdbRow?.last_active || null,
          local_board: userProfile?.local_board || brdbRow?.local_board || null,
          updated_at: userProfile?.updated_at || brdbRow?.updated_at || Date.now(),
        };

        // 2. Fetch ranks da brdb_users
        const [rankRow, queueRow] = await Promise.all([
          env.brdb_users.prepare(`
            SELECT brdb_rn as BRDb, rep_rn as Reputation, impact_rn as impact, recv_rn, send_rn, total
            FROM (
              SELECT uid,
                ROW_NUMBER() OVER (ORDER BY BRDb      DESC, CAST(uid AS INTEGER) ASC) as brdb_rn,
                ROW_NUMBER() OVER (ORDER BY Reputation DESC, CAST(uid AS INTEGER) ASC) as rep_rn,
                ROW_NUMBER() OVER (ORDER BY impact_all DESC, CAST(uid AS INTEGER) ASC) as impact_rn,
                ROW_NUMBER() OVER (ORDER BY merit_total DESC, CAST(uid AS INTEGER) ASC) as recv_rn,
                ROW_NUMBER() OVER (ORDER BY COALESCE(merits_sent_total,0) DESC, CAST(uid AS INTEGER) ASC) as send_rn,
                COUNT(*) OVER () as total
              FROM brdb_users WHERE COALESCE(banned,0) = 0 AND status != 'Banned' AND COALESCE(posts_wiped,0) = 0 AND Reputation IS NOT NULL
            ) WHERE uid = ?
          `).bind(uid).first(),
          env.brdb_users.prepare(`
            SELECT
              ui.last_scraped,
              (SELECT COUNT(*) FROM users_index
               WHERE uid != '__cron_counter__'
               AND (last_scraped IS NULL OR last_scraped <= ui.last_scraped)) as queue_position,
              (SELECT COUNT(*) FROM users_index WHERE uid != '__cron_counter__') as queue_total
            FROM users_index ui WHERE ui.uid = ?
          `).bind(uid).first()
        ]);

        const ranks = rankRow
          ? { BRDb: rankRow.BRDb, Reputation: rankRow.Reputation, impact: rankRow.impact, recv: rankRow.recv_rn, send: rankRow.send_rn, total: rankRow.total }
          : {};

        const queuePos = queueRow?.queue_position || null;
        const queueTotal = queueRow?.queue_total || null;
        const lastScraped = queueRow?.last_scraped || null;
        const nextScrapeEta = lastScraped ? new Date(lastScraped + 7 * 24 * 60 * 60 * 1000) : 'queued';

        // Fetch trust score
        let trustData = null;
        try {
          const trustCached = await env.MERIT_DB.prepare(
            'SELECT data FROM merit_cache WHERE uid = ?'
          ).bind(parseInt(uid)).first().catch(() => null);
          if (trustCached) {
            const meritData = JSON.parse(trustCached.data);
            const allSenders = meritData.all_senders || [];
            const recvTotal = meritData.recv_total || 0;
            if (allSenders.length && recvTotal) {
              const senderUids = allSenders.map(s => s.uid).filter(Boolean);
              const brdbMap = {};
              for (let i = 0; i < senderUids.length; i += 50) {
                const chunk = senderUids.slice(i, i + 50);
                const ph = chunk.map(() => '?').join(',');
                const rows = await env.brdb_users.prepare(
                  `SELECT uid, BRDb FROM brdb_users WHERE uid IN (${ph})`
                ).bind(...chunk.map(String)).all();
                for (const r of (rows.results || [])) brdbMap[String(r.uid)] = r.BRDb || 0;
              }
              let weightedSum = 0;
              for (const s of allSenders) weightedSum += s.total * (brdbMap[String(s.uid)] || 0);
              trustData = { score: Math.round((weightedSum / recvTotal) * 100) / 100, senders: allSenders.length };
            }
          }
        } catch(e) { console.warn('[trust]', e.message); }

        // Fetch community award
        let awardData = null;
        try {
          const awardRow = await env.brdb_users.prepare(
            'SELECT title, year FROM community_awards WHERE uid = ? AND expires_at > ?'
          ).bind(uid, Date.now()).first();
          if (awardRow) awardData = { title: awardRow.title, year: awardRow.year };
        } catch(e) {}

        const html = generateProfileHTML(uid, mergedRow, ranks, { queuePos, queueTotal, lastScraped, nextScrapeEta }, trustData, awardData);
        return new Response(html, {
          status: 200,
          headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' }
        });
      } catch (err) {
        console.error('GET /profile error:', err);
        return json({ error: err.message }, 500);
      }
    }

    // GET /merit-proxy/:uid?type=receiver|sender&page=N
    // Proxy REMOVED con API key nascosta — il browser può paginare liberamente
    const meritProxyMatch = path.match(/^\/merit-proxy\/(\d+)$/);
    if (request.method === 'GET' && meritProxyMatch) {
      const uid = meritProxyMatch[1];
      const type = u.searchParams.get('type') || 'receiver';
      const page = parseInt(u.searchParams.get('page') || '1');
      const row = await env.brdb_users.prepare(
        'SELECT username, merit_total, merits_sent120, merit120 FROM brdb_users WHERE uid = ?'
      ).bind(uid).first();
      if (!row || !row.username) return json({ error: 'User not found' }, 404);
      const enc = encodeURIComponent(row.username).replace(/\*/g, '%2A');
      const res = await fetch(
        '// REMOVED: old API endpoint' + type + '=' + enc + '&limit=100&page=' + page,
        { headers: { 'X-API-KEY': APIkey, 'Accept': 'application/json' } }
      );
      const data = res.ok ? await res.json() : { merits: [], totalHits: 0, hasNextPage: false };
      // page=1 include also DB totals for accuracy
      const extras = page === 1 ? {
        db_recv_total: row.merit_total || 0,
        db_recv_120: row.merit120 || 0,
      } : {};
      return json({ ...data, username: row.username, ...extras });
    }

    // GET /merit-stats-json/:uid — returns cached merit stats (cache 24h)
    const meritJsonMatch = path.match(/^\/merit-stats-json\/(\d+)$/);
    if (request.method === 'GET' && meritJsonMatch) {
      const uid = parseInt(meritJsonMatch[1]);
      const ttl = 24 * 60 * 60 * 1000; // 24h
      try {
        // Check cache
        const cached = await env.brdb_users.prepare(
          'SELECT data, cached_at FROM merit_cache WHERE uid = ?'
        ).bind(uid).first();
        if (cached && (Date.now() - cached.cached_at) < ttl) {
          return new Response(cached.data, {
            headers: { ...cors, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
          });
        }
      } catch(e) {
        // merit_cache table might not exist yet — proceed without cache
        console.warn('[merit-cache] read error:', e.message);
      }
      return json({ uid, cached: false, message: 'No cache yet — load the Merit tab to populate' });
    }

    // POST /merit-stats-json/:uid — save aggregated merit stats to cache
    const meritSaveMatch = path.match(/^\/merit-stats-json\/(\d+)$/);
    if (request.method === 'POST' && meritSaveMatch) {
      const uid = parseInt(meritSaveMatch[1]);
      try {
        const body = await request.json();
        const data = JSON.stringify(body);
        await env.brdb_users.prepare(
          'INSERT INTO merit_cache (uid, data, cached_at) VALUES (?,?,?) ON CONFLICT(uid) DO UPDATE SET data=excluded.data, cached_at=excluded.cached_at'
        ).bind(uid, data, Date.now()).run();
        return json({ ok: true, uid, cached_at: Date.now() });
      } catch(e) {
        console.warn('[merit-cache] write error:', e.message);
        return json({ ok: false, error: e.message }, 500);
      }
    }

    // GET /admin/init-merit-cache — create merit_cache table
    if (request.method === 'GET' && path === '/admin/init-merit-cache') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      await env.brdb_users.prepare(`CREATE TABLE IF NOT EXISTS merit_cache (
        uid INTEGER PRIMARY KEY,
        data TEXT NOT NULL,
        cached_at INTEGER NOT NULL
      )`).run();
      return json({ ok: true, message: 'merit_cache table ready' });
    }

    // GET /admin/add-top-boards-column — add top_boards column to brdb_users
    if (request.method === 'GET' && path === '/admin/add-top-boards-column') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      try {
        await env.brdb_users.prepare('ALTER TABLE brdb_users ADD COLUMN top_boards TEXT').run();
        return json({ ok: true, message: 'top_boards column added' });
      } catch(e) {
        return json({ ok: false, message: e.message });
      }
    }

    // GET /debug-boards?uid=X&secret=Y — show board distribution for a user
    if (request.method === 'GET' && path === '/debug-boards') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const uid = u.searchParams.get('uid');
      if (!uid) return json({ error: 'Missing uid' }, 400);
      const row = await env.brdb_users.prepare('SELECT username FROM brdb_users WHERE uid = ?').bind(uid).first();
      if (!row) return json({ error: 'User not found' }, 404);
      // REMOVED: Bitcointalk scraping code
      const postsRes = await fetch(
        `// REMOVED: old API endpoint`,
        { headers: { 'X-API-KEY': APIkey, 'Accept': 'application/json' } }
      );
      if (!postsRes.ok) return json({ error: 'Bitcointalk error', status: postsRes.status });
      const postsData = await postsRes.json();
      const counts = {};
      for (const post of postsData.posts || []) {
        const name = LOCAL_BOARD_MAP[post.board_id] || `board_${post.board_id}`;
        counts[name] = (counts[name] || 0) + 1;
      }
      const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
      return json({ username: row.username, total_posts: postsData.posts?.length, board_distribution: sorted });
    }

    // GET /admin/build-merit-cache?uid=X — fetch merits from Bitcointalk and build cache server-side
    if (request.method === 'GET' && path === '/admin/build-merit-cache') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const uid = parseInt(u.searchParams.get('uid'));
      if (!uid) return json({ error: 'Missing uid' }, 400);

      const row = await env.brdb_users.prepare('SELECT username, merit_total FROM brdb_users WHERE uid = ?').bind(String(uid)).first();
      if (!row) return json({ error: 'User not found' }, 404);

      // REMOVED: Bitcointalk scraping code
      const h = { 'X-API-KEY': APIkey, 'Accept': 'application/json' };
      const enc = encodeURIComponent(row.username).replace(/\*/g, '%2A');

      // Fetch all received merits (paginated)
      let recvM = [], page = 1, hasMore = true;
      while (hasMore && page <= 5) {
        const res = await fetch(`// REMOVED: old API endpoint`, { headers: h });
        if (!res.ok) break;
        const d = await res.json();
        recvM = recvM.concat(d.merits || []);
        hasMore = d.hasNextPage;
        page++;
      }

      // Aggregate senders
      const sMap = {};
      let recvTotal = 0;
      for (const m of recvM) {
        recvTotal += m.amount || 0;
        if (m.sender_uid) {
          if (!sMap[m.sender_uid]) sMap[m.sender_uid] = { uid: m.sender_uid, username: m.sender, total: 0 };
          sMap[m.sender_uid].total += m.amount || 0;
        }
      }
      const allSenders = Object.values(sMap);
      const topSenders = allSenders.sort((a, b) => b.total - a.total).slice(0, 10);

      // Merge all_senders into existing cache without overwriting other fields
      const existing = await env.brdb_users.prepare('SELECT data FROM merit_cache WHERE uid = ?').bind(uid).first();
      let merged;
      if (existing) {
        const existingData = JSON.parse(existing.data);
        merged = { ...existingData, all_senders: allSenders.map(s => ({ uid: s.uid, total: s.total })) };
      } else {
        merged = {
          recv_total: recvTotal, sent_total: 0, recv_120: 0, sent_120: 0,
          all_senders: allSenders.map(s => ({ uid: s.uid, total: s.total })),
          top_senders: topSenders, top_receivers: [], top_boards: [], top_posts: [],
        };
      }

      await env.brdb_users.prepare(
        'INSERT INTO merit_cache (uid, data, cached_at) VALUES (?,?,?) ON CONFLICT(uid) DO UPDATE SET data=excluded.data, cached_at=excluded.cached_at'
      ).bind(uid, JSON.stringify(merged), Date.now()).run();

      return json({ ok: true, uid, recv_total: recvTotal, senders: allSenders.length, pages_fetched: page - 1 });
    }

    // GET /admin/fix-wrong-national-boards — reset local_board for users with non-national boards
    if (request.method === 'GET' && path === '/admin/fix-wrong-national-boards') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      // Reset local_board for users with non-national boards (hardcoded list avoids D1 bind limits)
      const fix = await env.brdb_users.prepare(
        "UPDATE brdb_users SET local_board = NULL WHERE local_board IS NOT NULL AND local_board NOT IN ('Italian','German','Spanish','French','Portuguese','Russian','Turkish','Dutch','Polish','Romanian','Greek','Croatian','Mandarin','Japanese','Korean','Arabic','Indonesian','Filipino','Nigerian','India','Scandinavian','Hebrew','Other languages/locations')"
      ).run();
      await env.brdb_users.prepare(
        'UPDATE users_index SET last_scraped = NULL WHERE uid IN (SELECT uid FROM brdb_users WHERE local_board IS NULL AND top_boards IS NOT NULL)'
      ).run();
      return json({ ok: true, fixed: fix.changes || 'done' });
    }

    // GET /admin/fix-merit?uid=X&merit=N — fix merit_total manualmente
    if (request.method === 'GET' && path === '/admin/fix-merit') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const uid = u.searchParams.get('uid');
      const merit = parseInt(u.searchParams.get('merit'));
      if (!uid || !merit) return json({ error: 'Missing uid or merit' }, 400);
      await env.brdb_users.prepare(
        'UPDATE brdb_users SET merit_total = ? WHERE uid = ?'
      ).bind(merit, uid).run();
      return json({ ok: true, uid, merit_total: merit });
    }

    // GET /admin/scrape-now?uid=X — scrape sincrono che salva nel DB
    if (request.method === 'GET' && path === '/admin/scrape-now') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const uid = u.searchParams.get('uid');
      if (!uid) return json({ error: 'Missing uid' }, 400);
      // REMOVED: Bitcointalk scraping code
      const today = new Date().toISOString().split('T')[0]; console.log(`[DEBUG] Server date: ${today}`);
      const dateMin120 = new Date(Date.now() - 120*24*60*60*1000).toISOString().split('T')[0];
      const row = await env.brdb_users.prepare(
        'SELECT ui.uid, ui.username, ui.local_board, bu.merit_earned FROM users_index ui LEFT JOIN brdb_users bu ON bu.uid = ui.uid WHERE ui.uid = ?'
      ).bind(uid).first();
      if (!row) return json({ error: 'User not found' }, 404);
      try {
        await scrapeAndSave(row, dateMin120, today, APIkey, env);
        const updated = await env.brdb_users.prepare('SELECT updated_at FROM brdb_users WHERE uid = ?').bind(uid).first();
        return json({ ok: true, uid, updated_at: updated?.updated_at });
      } catch (err) {
        return json({ ok: false, uid, error: err.message });
      }
    }

    // GET /admin/cron-stats — statistiche stato cron
    if (request.method === 'GET' && path === '/admin/cron-stats') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const now = Date.now();
      const [total, stuck, ready, scraped24h, neverScraped] = await Promise.all([
        env.brdb_users.prepare("SELECT COUNT(*) as n FROM users_index WHERE uid != '__cron_counter__'").first(),
        env.brdb_users.prepare("SELECT COUNT(*) as n FROM users_index WHERE scrape_in_progress IS NOT NULL AND scrape_in_progress > 0").first(),
        env.brdb_users.prepare("SELECT COUNT(*) as n FROM users_index WHERE (last_scraped IS NULL OR last_scraped < ?) AND (scrape_in_progress IS NULL OR scrape_in_progress < ?) AND uid != '__cron_counter__'").bind(now - 24*60*60*1000, now - 10*60*1000).first(),
        env.brdb_users.prepare("SELECT COUNT(*) as n FROM users_index WHERE last_scraped > ? AND uid != '__cron_counter__'").bind(now - 24*60*60*1000).first(),
        env.brdb_users.prepare("SELECT COUNT(*) as n FROM users_index WHERE last_scraped IS NULL AND uid != '__cron_counter__'").first(),
      ]);
      return json({
        total: total.n,
        stuck_in_progress: stuck.n,
        ready_to_scrape: ready.n,
        scraped_last_24h: scraped24h.n,
        never_scraped: neverScraped.n,
      });
    }

    // GET /award/:uid — community award for user
    if (request.method === 'GET' && path.startsWith('/award/')) {
      const uid = path.split('/')[2];
      const now = Date.now();
      const award = await env.brdb_users.prepare(
        'SELECT title, year, expires_at FROM community_awards WHERE uid = ? AND expires_at > ?'
      ).bind(uid, now).first();
      if (!award) return json({ award: null });
      return json({ award: { title: award.title, year: award.year, expires_at: award.expires_at } });
    }

    // GET /admin/reset-stuck — reset scrape_in_progress bloccati da più di 30 min
    if (request.method === 'GET' && path === '/admin/reset-stuck') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const threshold = Date.now() - 2 * 60 * 1000;
      const result = await env.brdb_users.prepare(
        'UPDATE users_index SET scrape_in_progress = NULL WHERE scrape_in_progress IS NOT NULL AND scrape_in_progress < ?'
      ).bind(threshold).run();
      return json({ ok: true, reset: result.changes || 'done' });
    }

    // GET /admin/reset-missing-sent — reset last_scraped for users with merits_sent_total = 0
    if (request.method === 'GET' && path === '/admin/reset-missing-sent') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const result = await env.brdb_users.prepare(
        `UPDATE users_index SET last_scraped = NULL WHERE uid IN (
          SELECT uid FROM brdb_users WHERE COALESCE(merits_sent_total, 0) = 0
        )`
      ).run();
      return json({ ok: true, reset: result.changes });
    }

    // GET /admin/sent-stats — count users with merits_sent_total = 0
    if (request.method === 'GET' && path === '/admin/sent-stats') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const [total, missing, nonzero] = await Promise.all([
        env.brdb_users.prepare('SELECT COUNT(*) as n FROM brdb_users').first(),
        env.brdb_users.prepare('SELECT COUNT(*) as n FROM brdb_users WHERE COALESCE(merits_sent_total,0) = 0').first(),
        env.brdb_users.prepare('SELECT COUNT(*) as n FROM brdb_users WHERE merits_sent_total > 0').first(),
      ]);
      return json({ total: total.n, missing_sent: missing.n, have_sent: nonzero.n });
    }

    // GET /admin/clear-merit-cache?uid=X — force merit cache refresh
    if (request.method === 'GET' && path === '/admin/clear-merit-cache') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const uid = u.searchParams.get('uid');
      if (uid) {
        await env.brdb_users.prepare('DELETE FROM merit_cache WHERE uid = ?').bind(parseInt(uid)).run();
        return json({ ok: true, cleared: uid });
      } else {
        await env.brdb_users.prepare('DELETE FROM merit_cache').run();
        return json({ ok: true, cleared: 'all' });
      }
    }

    // GET /trust-score/:uid — weighted trust score based on sender BRDb
    const trustMatch = path.match(/^\/trust-score\/(\d+)$/);
    if (request.method === 'GET' && trustMatch) {
      const uid = parseInt(trustMatch[1]);
      try {
        // 1. Get merit cache for this user
        const cached = await env.brdb_users.prepare(
          'SELECT data FROM merit_cache WHERE uid = ?'
        ).bind(uid).first();
        if (!cached) return json({ uid, trust_score: null, reason: 'no_merit_cache' });

        const meritData = JSON.parse(cached.data);
        const allSenders = meritData.all_senders || [];
        const recvTotal  = meritData.recv_total || 0;
        if (!allSenders.length || !recvTotal) return json({ uid, trust_score: 0, reason: 'no_senders' });

        // 2. Fetch BRDb for all senders in one query
        const senderUids = allSenders.map(s => s.uid).filter(Boolean);
        if (!senderUids.length) return json({ uid, trust_score: 0, reason: 'no_sender_uids' });

        // D1 doesn't support large IN clauses well — batch in chunks of 50
        const chunkSize = 50;
        const brdbMap = {};
        for (let i = 0; i < senderUids.length; i += chunkSize) {
          const chunk = senderUids.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => '?').join(',');
          const rows = await env.brdb_users.prepare(
            `SELECT uid, BRDb FROM brdb_users WHERE uid IN (${placeholders})`
          ).bind(...chunk.map(String)).all();
          for (const r of (rows.results || [])) brdbMap[String(r.uid)] = r.BRDb || 0;
        }

        // 3. Compute weighted trust score
        // Trust = Σ (merits_from_X * BRDb_X) / recv_total
        // Normalized to 0-10 scale (same as BRDb)
        let weightedSum = 0;
        let coveredMerits = 0;
        for (const s of allSenders) {
          const senderBRDb = brdbMap[String(s.uid)] || 0;
          weightedSum  += s.total * senderBRDb;
          coveredMerits += s.total;
        }
        // Unknown senders (not in DB) get BRDb=0, uncovered merits drag score down
        const rawTrust = recvTotal > 0 ? weightedSum / recvTotal : 0;

        // Also compute rank among all users with merit_total > 0
        const rankRow = await env.brdb_users.prepare(
          `SELECT COUNT(*) as rank FROM brdb_users
           WHERE COALESCE(banned,0)=0 AND status!='Banned' AND COALESCE(posts_wiped,0)=0
           AND merit_total > 0
           AND (SELECT SUM(s2.total * COALESCE(b2.BRDb,0))
                FROM json_each((SELECT json_extract(mc.data,'$.all_senders') FROM merit_cache mc WHERE mc.uid=brdb_users.uid)) s2
                LEFT JOIN brdb_users b2 ON b2.uid=CAST(json_extract(s2.value,'$.uid') AS INTEGER)
               ) / NULLIF(merit_total,0) > ?`
        ).bind(rawTrust).first().catch(() => null);

        return json({
          uid,
          trust_score: Math.round(rawTrust * 100) / 100,
          recv_total: recvTotal,
          senders_known: senderUids.filter(u => brdbMap[String(u)] > 0).length,
          senders_total: allSenders.length,
          covered_merits: coveredMerits,
          rank: rankRow ? (rankRow.rank + 1) : null,
        });
      } catch(e) {
        return json({ uid, error: e.message }, 500);
      }
    }

    // GET /debug-ranks — check rank values for a uid
    if (request.method === 'GET' && path === '/debug-ranks') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const uid = u.searchParams.get('uid');
      const rankRow = await env.brdb_users.prepare(`
        SELECT brdb_rn as BRDb, rep_rn as Reputation, impact_rn as impact, recv_rn, send_rn, total
        FROM (
          SELECT uid,
            ROW_NUMBER() OVER (ORDER BY BRDb DESC, CAST(uid AS INTEGER) ASC) as brdb_rn,
            ROW_NUMBER() OVER (ORDER BY Reputation DESC, CAST(uid AS INTEGER) ASC) as rep_rn,
            ROW_NUMBER() OVER (ORDER BY impact_all DESC, CAST(uid AS INTEGER) ASC) as impact_rn,
            ROW_NUMBER() OVER (ORDER BY merit_total DESC, CAST(uid AS INTEGER) ASC) as recv_rn,
            ROW_NUMBER() OVER (ORDER BY COALESCE(merits_sent_total,0) DESC, CAST(uid AS INTEGER) ASC) as send_rn,
            COUNT(*) OVER () as total
          FROM brdb_users WHERE COALESCE(banned,0) = 0 AND status != 'Banned' AND COALESCE(posts_wiped,0) = 0
        ) WHERE uid = ?
      `).bind(uid).first();
      return json({ uid, rankRow });
    }

    // GET /debug-merits-sent — trace merits_sent_count through cronScrapeUser
    if (request.method === 'GET' && path === '/debug-merits-sent') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const uid = u.searchParams.get('uid');
      const today = new Date().toISOString().split('T')[0]; console.log(`[DEBUG] Server date: ${today}`);
      const dateMin120 = new Date(Date.now() - 120 * 86400000).toISOString().split('T')[0];
      // REMOVED: old scraping
        const data = await cronScrapeUserFromBitcointalk(uid, env);
      return json({
        merits_sent_count_raw: data.merits_sent_count,
        merits_received_count_raw: data.merits_received_count,
        posts_count_raw: data.posts_count,
        all_keys: Object.keys(data),
      });
    }

    // GET /admin/init-merits-sent-total — adds merits_sent_total column
    if (request.method === 'GET' && path === '/admin/init-merits-sent-total') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      try {
        await env.brdb_users.prepare(`ALTER TABLE brdb_users ADD COLUMN merits_sent_total INTEGER DEFAULT 0`).run();
        return json({ ok: true, message: 'Column merits_sent_total added' });
      } catch(e) {
        return json({ ok: false, message: e.message });
      }
    }

    // GET /admin/reset-missing-top-boards — reset last_scraped for users without top_boards
    if (request.method === 'GET' && path === '/admin/reset-missing-top-boards') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const result = await env.brdb_users.prepare(`
        UPDATE users_index SET last_scraped = NULL
        WHERE uid IN (
          SELECT uid FROM brdb_users WHERE top_boards IS NULL
        )
      `).run();
      return json({ ok: true, message: 'Reset last_scraped for users missing top_boards', changes: result.meta?.changes });
    }

    // GET /admin/clean-local-boards — remove non-national local_board values
    if (request.method === 'GET' && path === '/admin/clean-local-boards') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const national = ['Italian','German','Spanish','French','Portuguese','Russian','Turkish',
        'Dutch','Polish','Romanian','Greek','Croatian','Mandarin','Japanese','Korean',
        'Arabic','Indonesian','Filipino','Nigerian','India','Scandinavian','Hebrew','Other languages/locations'];
      const placeholders = national.map(() => '?').join(',');
      const result = await env.brdb_users.prepare(
        `UPDATE brdb_users SET local_board = NULL WHERE local_board IS NOT NULL AND local_board NOT IN (${placeholders})`
      ).bind(...national).run();
      await env.brdb_users.prepare(
        `UPDATE users_index SET local_board = NULL WHERE local_board IS NOT NULL AND local_board NOT IN (${placeholders})`
      ).bind(...national).run();
      return json({ ok: true, message: 'Non-national local_boards cleared' });
    }

    // GET /admin/reset-scrape?uid=X&secret=Y — force rescrape
    if (request.method === 'GET' && path === '/admin/reset-scrape') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const uid = u.searchParams.get('uid');
      if (!uid) return json({ error: 'Missing uid' }, 400);
      await env.brdb_users.prepare(
        'UPDATE users_index SET last_scraped = NULL WHERE uid = ?'
      ).bind(uid).run();
      return json({ ok: true, uid, message: 'Reset done, will be scraped on next cron' });
    }    // POST /snapshot-today?uid=X&secret=Y — forza snapshot per oggi
    if (request.method === 'POST' && path === '/snapshot-today') {
      const secret = u.searchParams.get('secret');
      if (secret !== 'ace_brdb') return json({ error: 'Unauthorized' }, 401);
      const uid = u.searchParams.get('uid');
      if (!uid) return json({ error: 'Missing uid' }, 400);
      
      try {
        const _snapshotDate = new Date().toISOString().split('T')[0];
        const user = await env.brdb_users.prepare(
          'SELECT * FROM brdb_users WHERE uid = ?'
        ).bind(uid).first();
        
        if (!user) return json({ error: 'User not found' }, 404);
        
        const _existingSnapshot = await env.brdb_users.prepare(
          'SELECT id FROM brdb_history WHERE uid = ? AND snapshot_date = ?'
        ).bind(uid, _snapshotDate).first();
        
        if (_existingSnapshot) {
          return json({ ok: true, uid, snapshot_date: _snapshotDate, message: 'Snapshot already exists' });
        }
        
        await env.brdb_users.prepare(`
          INSERT INTO brdb_history (
            uid, username, snapshot_date, BRDb, Reputation,
            posts_total, merit_total, posts120, merit120, merits_sent120,
            status, local_board, scrape_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          uid, user.username, _snapshotDate, user.BRDb, user.Reputation,
          user.posts_total || 0, user.merit_total || 0,
          user.posts120 || 0, user.merit120 || 0, user.merits_sent120 || 0,
          user.status, user.local_board, 'manual_snapshot'
        ).run();
        
        return json({ ok: true, uid, snapshot_date: _snapshotDate, BRDb: user.BRDb });
      } catch(err) {
        return json({ error: err.message }, 500);
      }
    }




    // GET /version — check deployed version
    if (request.method === 'GET' && path === '/version') {
      return json({ version: '2.24', cronScrapeHasFallback: true, batchSupport: true, alltime120dFilter: true });
    }

// ═══════════════════════════════════════════════════════════════
// GET /post/:topic_id/:post_id — Visualizza un post specifico
// ═══════════════════════════════════════════════════════════════
if (request.method === 'GET' && path.startsWith('/post/')) {
  const parts = path.split('/').filter(Boolean);
  
  let post_id;
  
  if (parts.length === 2) {
    post_id = parseInt(parts[1]);
  } else if (parts.length === 3) {
    post_id = parseInt(parts[2]);
  } else {
    return new Response('Invalid post link format', { status: 400 });
  }
  
  if (!post_id) {
    return new Response('Invalid post_id', { status: 400 });
  }
  
  try {
    // Cerca il post nel database
    const post = await env.MERIT_DB.prepare(`
      SELECT 
        p.uid,
        p.topic_id,
        p.board_id,
        p.title,
        p.username,
        p.collected_at,
        COALESCE(u.username, p.username, 'User #' || p.uid) as author_name
      FROM post_events p
      LEFT JOIN user_profiles u ON u.uid = p.uid
      WHERE p.post_id = ?
    `).bind(post_id).first();
    
    if (!post) {
      return new Response(`Post #${post_id} not found`, { status: 404 });
    }
    
    const [quotes, merits] = await Promise.all([
      env.MERIT_DB.prepare(`SELECT quoted_uid, quoted_name, quoted_by_name FROM quote_events WHERE post_id = ?`).bind(post_id).all(),
      env.MERIT_DB.prepare(`SELECT amount, from_uid, to_uid FROM merit_events WHERE msg_id = ?`).bind(post_id).all()
    ]);
    
    const boardNames = {
      1: 'Bitcoin Discussion', 28: 'Italian', 56: 'Gambling', 67: 'Altcoin Discussion',
      153: 'Guide (Italiano)', 228: 'Gambling discussion', 89: 'India', 9: 'Off-topic'
    };
    const boardName = boardNames[post.board_id] || `Board #${post.board_id}`;
    const postDate = post.collected_at ? new Date(post.collected_at).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }) : 'Unknown date';
    
    const btcLink = `https://bitcointalk.org/index.php?topic=${post.topic_id}.msg${post_id}#msg${post_id}`;
    
    // 🔥 CHIAMA IL POST SCRAPER PER OTTENERE IL BODY
    let postBody = null;
    let fetchError = null;
    
    try {
      const scraperUrl = `https://post-scraper.ace-d89.workers.dev/get-post-body?post_id=${post_id}&topic_id=${post.topic_id}`;
      const response = await fetch(scraperUrl);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.body) {
          postBody = data.body;
        } else {
          fetchError = data.error || 'Post body not found';
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        fetchError = errorData.error || `Post Scraper HTTP ${response.status}`;
      }
    } catch (err) {
      fetchError = err.message;
    }
    
    // 🔥 LOG PER DEBUG
    console.log('[POST] postBody ricevuto:', !!postBody);
    console.log('[POST] fetchError:', fetchError);
    
    // Se non abbiamo il body, mostra il link
    if (!postBody) {
      postBody = `<div style="text-align:center;padding:40px;color:#64748b">
        <div style="font-size:48px;margin-bottom:16px">📝</div>
        <div style="margin-bottom:8px">Post content not available</div>
        <div style="font-size:13px;color:#475569">${fetchError || 'Unknown error'}</div>
        <a href="${btcLink}" target="_blank" style="color:#60a5fa;display:inline-block;font-size:16px;text-decoration:underline;margin-top:12px">🔗 View on Bitcointalk →</a>
      </div>`;
    }
    
    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
      });
    }
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(post.title || 'Post #' + post_id)} - BRDb</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',system-ui,sans-serif;background:#060a14;color:#e2e8f0;min-height:100vh}
    .bg-glow{position:fixed;top:0;left:0;right:0;bottom:0;overflow:hidden;z-index:0;pointer-events:none}
    .glow-1{position:absolute;top:-20%;left:-10%;width:60%;height:60%;background:radial-gradient(circle,#3b82f620 0%,transparent 70%);border-radius:50%;animation:float 20s ease-in-out infinite}
    .glow-2{position:absolute;bottom:-20%;right:-10%;width:50%;height:50%;background:radial-gradient(circle,#22c55e15 0%,transparent 70%);border-radius:50%;animation:float 25s ease-in-out infinite reverse}
    @keyframes float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(5%,5%) scale(1.05)}}
    .container{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:32px 24px}
    .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;flex-wrap:wrap;gap:16px}
    .back-btn{display:flex;align-items:center;gap:8px;color:#60a5fa;text-decoration:none;font-weight:500;font-size:14px;padding:10px 20px;background:rgba(15,23,42,0.6);backdrop-filter:blur(10px);border:1px solid rgba(96,165,250,0.3);border-radius:40px;transition:all .3s}
    .back-btn:hover{background:#1e293b;border-color:#60a5fa;transform:translateX(-4px)}
    h1{font-size:28px;font-weight:700;background:linear-gradient(135deg,#fff,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.5px}
    .post-card{background:rgba(12,18,30,0.8);backdrop-filter:blur(12px);border:1px solid rgba(56,189,248,0.15);border-radius:24px;padding:28px;margin-bottom:24px}
    .post-meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(56,189,248,0.1)}
    .author{display:flex;align-items:center;gap:8px}
    .author-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#a855f7);display:flex;align-items:center;justify-content:center;font-weight:bold}
    .author-name{font-weight:700;font-size:16px;color:#fff}
    .author-uid{font-size:11px;color:#475569;font-family:monospace}
    .post-date{font-size:12px;color:#64748b}
    .board-chip{background:rgba(30,41,59,0.8);padding:4px 12px;border-radius:20px;font-size:11px;color:#94a3b8}
    .post-title{font-size:22px;font-weight:700;margin-bottom:20px;color:#fbbf24}
    .post-content{font-size:15px;line-height:1.6;color:#cbd5e1;white-space:pre-wrap;word-break:break-word}
    .post-content .quoteheader{color:#a855f7;font-size:13px;margin:12px 0 6px}
    .post-content .quote{background:rgba(0,0,0,0.3);border-left:3px solid #a855f7;padding:10px 14px;margin:8px 0;border-radius:8px}
    .post-content .bbc_img{max-width:100%;height:auto;border-radius:8px;margin:8px 0}
    .post-content a{color:#60a5fa;text-decoration:none}
    .post-content a:hover{text-decoration:underline}
    .error-message{color:#ef4444;text-align:center;padding:30px}
    .error-message a{color:#3b82f6}
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px}
    .stat-card{background:rgba(15,23,42,0.6);border:1px solid rgba(96,165,250,0.15);border-radius:16px;padding:14px;text-align:center}
    .stat-value{font-size:24px;font-weight:800;font-family:monospace}
    .stat-label{font-size:10px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:1px}
    .quotes-list{background:rgba(0,0,0,0.2);border-radius:16px;padding:16px;margin-top:16px}
    .quotes-title{font-size:12px;font-weight:600;color:#a855f7;margin-bottom:10px;letter-spacing:1px}
    .quote-item{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
    .quote-badge{background:#a855f720;padding:2px 8px;border-radius:20px;font-size:11px;color:#c084fc}
    .merit-list{background:rgba(0,0,0,0.2);border-radius:16px;padding:16px;margin-top:16px}
    .merit-title{font-size:12px;font-weight:600;color:#22c55e;margin-bottom:10px;letter-spacing:1px}
    .merit-item{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
    .merit-badge{background:#22c55e20;padding:2px 8px;border-radius:20px;font-size:11px;color:#4ade80}
    .btc-link{display:inline-flex;align-items:center;gap:8px;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#fbbf24,#f59e0b);border-radius:40px;color:#0f172a;font-weight:700;text-decoration:none}
    .btc-link:hover{transform:scale(1.02)}
    .footer{text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid rgba(56,189,248,0.1);font-size:12px;color:#475569}
    @media(max-width:600px){.container{padding:20px 16px}.post-card{padding:20px}.post-title{font-size:18px}}
  </style>
</head>
<body>
<div class="bg-glow"><div class="glow-1"></div><div class="glow-2"></div></div>
<div class="container">
  <div class="header">
    <a href="javascript:history.back()" class="back-btn">← Back to Feed</a>
    <h1>📄 Post Details</h1>
    <div></div>
  </div>
  
  <div class="post-card">
    <div class="post-meta">
      <div class="author">
        <div class="author-avatar">${escapeHtml((post.author_name || 'U').charAt(0).toUpperCase())}</div>
        <div>
          <div class="author-name">${escapeHtml(post.author_name || 'Unknown')}</div>
          <div class="author-uid">UID: ${post.uid}</div>
        </div>
      </div>
      <div class="board-chip">📁 ${escapeHtml(boardName)}</div>
      <div class="post-date">📅 ${postDate}</div>
    </div>
    
    <div class="post-title">${escapeHtml(post.title || 'Untitled')}</div>
    
    <div id="post-content-area">
      <div class="post-content">${postBody}</div>
    </div>
  </div>
  
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-value" style="color:#3b82f6">${post.topic_id || '—'}</div><div class="stat-label">Topic ID</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#60a5fa">${post_id}</div><div class="stat-label">Post ID</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#22c55e">${merits.results?.length || 0}</div><div class="stat-label">Merits</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#a855f7">${quotes.results?.length || 0}</div><div class="stat-label">Quotes</div></div>
  </div>
  
  ${quotes.results && quotes.results.length > 0 ? `
  <div class="quotes-list">
    <div class="quotes-title">💬 QUOTES IN THIS POST</div>
    ${quotes.results.map(q => `<div class="quote-item"><span class="quote-badge">Quoted</span><span>${escapeHtml(q.quoted_name)}</span><span style="color:#475569;font-size:11px">by ${escapeHtml(q.quoted_by_name)}</span></div>`).join('')}
  </div>
  ` : ''}
  
  ${merits.results && merits.results.length > 0 ? `
  <div class="merit-list">
    <div class="merit-title">⭐ MERITS ON THIS POST</div>
    ${merits.results.map(m => `<div class="merit-item"><span class="merit-badge">+${m.amount}</span><span>from UID ${m.from_uid} → to UID ${m.to_uid}</span></div>`).join('')}
  </div>
  ` : ''}
  
  <div style="text-align:center; margin-top:24px">
    <a href="${btcLink}" target="_blank" class="btc-link">🔗 View on Bitcointalk →</a>
  </div>
  
  <div class="footer"><span>✦ BRDb — Post Viewer ✦</span></div>
</div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
    
  } catch (err) {
    console.error('GET /post error:', err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════
// GET /test-post-body — Debug per vedere cosa restituisce il Post Scraper
// ═══════════════════════════════════════════════════════════════
if (path === '/test-post-body' && url.searchParams.get('post_id')) {
  const post_id = url.searchParams.get('post_id');
  const topic_id = url.searchParams.get('topic_id') || '';
  
  try {
    const scraperUrl = `https://post-scraper.ace-d89.workers.dev/get-post-body?post_id=${post_id}&topic_id=${topic_id}`;
    const response = await fetch(scraperUrl);
    const data = await response.json();
    
    return new Response(JSON.stringify({
      scraper_status: response.status,
      scraper_data: data,
      has_body: !!data?.body,
      body_preview: data?.body?.substring(0, 200) || null
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
  
        // ═══════════════════════════════════════════════════════════════
    // GET /notifications/:uid — User Notification Center (Futuristic)
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path.startsWith('/notifications/')) {
      const uid = path.split('/')[2];
      if (!uid) return json({ error: 'Missing uid' }, 400);
      
      try {
        // 1. Merits received
        let meritsReceived = { results: [] };
        try {
          meritsReceived = await env.MERIT_DB.prepare(`
            SELECT 
              m.amount, 
              m.from_uid, 
              m.title as post_title,
              m.topic_id,
              m.msg_id,
              datetime(m.collected_at/1000, 'unixepoch', 'localtime') as date,
              'merit_received' as type
            FROM merit_events m
            WHERE m.to_uid = ?
            ORDER BY m.collected_at DESC
            LIMIT 25
          `).bind(uid).all();
        } catch(e) { console.log('Merits received error:', e.message); }
        
        // 2. Merits sent
        let meritsSent = { results: [] };
        try {
          meritsSent = await env.MERIT_DB.prepare(`
            SELECT 
              m.amount, 
              m.to_uid, 
              m.title as post_title,
              m.topic_id,
              m.msg_id,
              datetime(m.collected_at/1000, 'unixepoch', 'localtime') as date,
              'merit_sent' as type
            FROM merit_events m
            WHERE m.from_uid = ?
            ORDER BY m.collected_at DESC
            LIMIT 25
          `).bind(uid).all();
        } catch(e) { console.log('Merits sent error:', e.message); }
        
        // 3. Posts written by user
        let myPosts = { results: [] };
        try {
          myPosts = await env.MERIT_DB.prepare(`
            SELECT 
              p.post_id,
              p.topic_id,
              p.title,
              p.board_id,
              datetime(p.collected_at/1000, 'unixepoch', 'localtime') as date,
              'my_post' as type
            FROM post_events p
            WHERE p.uid = ?
            ORDER BY p.collected_at DESC
            LIMIT 25
          `).bind(uid).all();
        } catch(e) { console.log('My posts error:', e.message); }

           // Quotes received - lettura diretta dal database
let quotesReceived = { results: [] };
try {
  // Leggi direttamente dal database MERIT_DB
  const quotes = await env.MERIT_DB.prepare(`
    SELECT 
      q.*,
      p.title as post_title,
      p.board_id,
      p.topic_id
    FROM quote_events q
    LEFT JOIN post_events p ON p.post_id = q.post_id
    WHERE q.quoted_uid = ?
    ORDER BY q.collected_at DESC
    LIMIT 50
  `).bind(uid).all();
  
  quotesReceived.results = (quotes.results || []).map(q => ({
    quoted_by_name: q.quoted_by_name,
    quoted_by_uid: q.quoted_by_uid,
    quoted_uid: q.quoted_uid,
    quoted_name: q.quoted_name,
    post_id: q.post_id,
    topic_id: q.topic_id,
    board_id: q.board_id,
    post_title: q.post_title,
    date: new Date(q.collected_at).toISOString().split('T')[0],
    timestamp: q.collected_at
  }));
  
  console.log(`[QUOTES] Trovati ${quotesReceived.results.length} quote per ${uid} dal database MERIT_DB`);
} catch(e) { 
  console.log('Quotes error:', e.message);
}
        
        // Helper function to decode HTML entities
        function decodeHtmlEntities(str) {
          if (!str) return '';
          return str
            .replace(/&#(\d+);/g, function(match, dec) {
              return String.fromCodePoint(parseInt(dec, 10));
            })
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, '/')
            .replace(/&#39;/g, "'");
        }
        
        // Helper function to get username
        async function getUsername(uid) {
          if (!uid) return null;
          try {
            const result = await env.brdb_users.prepare(`
              SELECT username FROM brdb_users WHERE uid = ?
            `).bind(String(uid)).first();
            return result?.username || null;
          } catch(e) {
            return null;
          }
        }
        
        // Enrich meritsReceived with usernames
        const enrichedReceived = [];
        for (const merit of (meritsReceived.results || [])) {
          const fromUsername = await getUsername(merit.from_uid);
          enrichedReceived.push({
            ...merit,
            from_username: fromUsername || `UID ${merit.from_uid}`,
            timestamp: new Date(merit.date).getTime()
          });
        }
        
        // Enrich meritsSent with usernames
        const enrichedSent = [];
        for (const merit of (meritsSent.results || [])) {
          const toUsername = await getUsername(merit.to_uid);
          enrichedSent.push({
            ...merit,
            to_username: toUsername || `UID ${merit.to_uid}`,
            timestamp: new Date(merit.date).getTime()
          });
        }
        
        // Enrich myPosts with timestamp
        const enrichedPosts = (myPosts.results || []).map(post => ({
          ...post,
          timestamp: new Date(post.date).getTime()
        }));
        
        // Merge all events and sort by timestamp (newest first)
        const allEvents = [
          ...enrichedReceived.map(e => ({ ...e, eventType: 'merit_received' })),
          ...enrichedSent.map(e => ({ ...e, eventType: 'merit_sent' })),
          ...enrichedPosts.map(e => ({ ...e, eventType: 'my_post' })),
          ...quotesReceived.results.map(e => ({ ...e, eventType: 'quote_received' })),
        ].sort((a, b) => b.timestamp - a.timestamp);
        
        // COMPLETE BOARD MAP (same as global feed)
        const boardNames = {
          1: 'Bitcoin Discussion', 4: 'Bitcoin Technical Support', 5: 'Marketplace',
          6: 'Development & Technical Discussion', 7: 'Economics', 8: 'Trading Discussion',
          9: 'Off-topic', 10: 'Russian', 11: 'Other languages/locations', 12: 'Project Development',
          13: 'French', 14: 'Mining', 16: 'German', 17: 'Chinese students', 18: 'Разное',
          19: 'Юристы', 20: 'Трейдеры', 21: 'Майнеры', 22: 'Новички', 23: 'Бизнес', 24: 'Meta',
          25: 'Obsolete (buying)', 26: 'Obsolete (selling)', 27: 'Spanish', 28: 'Italian',
          29: 'Portuguese', 30: 'Mandarin', 31: 'Mercado y Economía', 32: 'Hardware y Minería',
          33: 'Esquina Libre', 34: 'Politics & Society', 35: 'Biete', 36: 'Suche',
          37: 'Wallet software', 39: 'Beginners & Help', 40: 'Mining support', 41: 'Pools',
          42: 'Mining software (miners)', 44: 'CPU/GPU Bitcoin mining hardware', 45: 'Scandinavian',
          46: 'Mercato valute', 47: 'Discussions générales et utilisation du Bitcoin',
          48: 'Mining et Hardware', 49: 'Place de marché', 50: 'Hors-sujet', 51: 'Goods',
          52: 'Services', 53: 'Currency exchange', 54: 'Wiki, documentation et traduction',
          55: 'Хайпы', 56: 'Gambling', 57: 'Speculation', 59: 'Archival', 60: 'Mining (Deutsch)',
          61: 'Trading und Spekulation', 62: 'Anfänger und Hilfe', 63: 'Projektentwicklung',
          64: 'Off-Topic (Deutsch)', 65: 'Lending', 66: 'Кодеры', 67: 'Altcoin Discussion',
          69: 'Economia & Mercado', 70: 'Mineração em Geral', 71: 'Games and rounds',
          72: 'Альтернативные криптовалюты', 73: 'Auctions', 74: 'Legal', 75: 'Computer hardware',
          76: 'Hardware', 77: 'Press', 78: 'Securities', 79: 'Dutch', 80: 'Markt',
          81: 'Mining speculation', 82: 'Korean', 83: 'Scam Accusations', 84: 'Service Announcements',
          85: 'Service Discussion', 86: 'Meetups', 87: 'Important Announcements',
          88: 'Long-term offers', 89: 'India', 90: 'Идеи', 91: 'Политика', 92: 'Корзина',
          93: 'Digital goods', 94: 'Gokken/lotterijen', 95: 'Hebrew', 97: 'Armory', 98: 'Electrum',
          99: 'MultiBit', 100: 'Bitcoin Wallet for Android', 101: 'Mercadillo', 102: 'Mexico',
          103: 'Argentina', 104: 'España', 105: 'Centroamerica y Caribe', 107: 'Beni',
          108: 'Romanian', 109: 'Anunturi importante', 110: 'Offtopic', 111: 'Market',
          112: 'Tutoriale', 113: 'Bine ai venit!', 114: 'Presa', 115: 'Mining (Italiano)',
          116: 'Mining (Nederlands)', 117: '跳蚤市场', 118: '山寨币', 119: '媒体', 120: 'Greek',
          121: 'Mining (India)', 122: 'Marketplace (India)', 123: 'Regional Languages (India)',
          124: 'Press & News from India', 125: 'Alt Coins (India)', 126: 'Buyer/ Seller Reputations (India)',
          127: 'Off-Topic (India)', 128: 'Новости', 129: 'Reputation', 130: 'Primeros pasos y ayuda',
          131: 'Primeiros Passos (Iniciantes)', 132: 'Alt-Currencies (Italiano)', 133: 'Turkish',
          134: 'Brasil', 135: 'Portugal', 136: 'Αγορά', 137: 'Group buys', 138: 'BitcoinJ',
          139: 'Treffen', 140: 'Presse ', 141: 'Auktionen', 142: 'Polish', 143: 'Beurzen',
          144: 'Raduni/Meeting (Italiano)', 145: 'Off-Topic (Italiano)', 146: '挖矿',
          147: 'Alt Coins (Nederlands)', 148: 'Off-topic (Nederlands)', 149: 'Altcoins (Français)',
          150: 'Meetings (Nederlands)', 151: 'Altcoins (criptomonedas alternativas)',
          152: 'Altcoins (Deutsch)', 153: 'Guide (Italiano)', 155: 'Pazar Alanı', 156: 'Madencilik',
          157: 'Alternatif Kripto-Paralar', 158: 'Konu Dışı', 159: 'Announcements (Altcoins)',
          160: 'Mining (Altcoins)', 161: 'Marketplace (Altcoins)', 162: 'Accuse scam/truffe',
          163: 'Tablica ogłoszeń', 164: 'Alternatywne kryptowaluty', 165: 'Crittografia e decentralizzazione',
          166: 'Minerit', 167: 'New forum software', 168: 'Bitcoin Wiki', 169: 'Progetti',
          170: 'Mercato', 171: 'Servizi', 172: 'Esercizi commerciali', 173: 'Hardware/Mining (Italiano)',
          174: 'Yeni Başlayanlar & Yardım', 175: 'Trading, analisi e speculazione', 176: 'Annunci',
          177: 'Minería de altcoins', 178: 'Anunturi Monede Alternative', 179: 'Altcoins (Ελληνικά)',
          180: 'Bitcoin Haberleri', 181: 'Criptomoedas Alternativas', 182: '대체코인 Alt Coins (한국어)',
          183: 'Actualité et News', 184: 'Vos sites et projets', 185: 'Работа',
          186: 'Développement et technique', 187: 'Économie et spéculation', 188: 'Le Bitcoin et la loi',
          189: 'Ekonomi', 190: 'Servisler', 191: 'Indonesian', 192: 'Altcoins (Bahasa Indonesia)',
          193: 'Jual Beli', 194: 'Mining (Bahasa Indonesia)', 195: 'Mining Discussion (Ελληνικά)',
          196: '离题万里', 197: 'Service Announcements (Altcoins)', 198: 'Service Discussion (Altcoins)',
          199: 'Pools (Altcoins)', 200: 'Gambling (Italiano)', 201: 'Croatian', 202: 'Servicios',
          203: 'Trading y especulación', 204: 'Servicios', 205: 'Discussioni avanzate e sviluppo',
          206: 'Desenvolvimento & Discussões Técnicas', 207: 'Investor-based games', 208: 'Débutants',
          209: 'Échanges', 210: 'Produits et services', 211: 'Petites annonces', 212: 'Micro Earnings',
          217: 'Collectibles', 219: 'Filipino', 220: 'Trgovina', 221: 'Altcoins (Hrvatski)',
          222: 'Web Wallets', 223: 'Exchanges', 224: 'Speculation (Altcoins)', 228: 'Gambling discussion',
          229: 'Proje Geliştirme', 230: 'Buluşmalar', 231: 'Mycelium', 232: 'Fonlar',
          234: 'Invites & Accounts', 235: 'Madencilik (Alternatif Kripto-Paralar)', 236: 'Барахолка',
          237: 'Обменники', 238: 'Bounties (Altcoins)', 239: 'Duyurular (Alternatif Kripto-Paralar)',
          240: 'Tokens (Altcoins)', 241: 'Arabic', 242: 'العملات البديلة (Altcoins)',
          243: 'Altcoins (Pilipinas)', 246: 'Altcoin Announcements (Ελληνικά)',
          247: 'Altcoin Mining (Ελληνικά)', 248: 'Токены', 250: 'Serious discussion', 251: 'Ivory Tower',
          252: 'Japanese', 253: 'إستفسارات و أسئلة المبتدئين', 254: 'Tokens (Español)', 255: 'アルトコイン',
          256: 'Бayнти и aиpдpoпы', 257: 'Discutii Servicii', 258: 'Annonces', 259: 'Altcoins (Monede Alternative)',
          260: 'Altcoin Announcements (Pilipinas)', 261: 'Hardware wallets', 262: 'Oбcyждeниe Bitcoin',
          263: 'Nowe kryptowaluty i tokeny', 264: 'Tablica ogłoszeń (altcoiny)', 265: 'النقاشات',
          266: 'التعدين', 267: 'النقاشات الأخرى', 268: 'Pamilihan', 269: 'Marktplatz',
          270: 'Announcements (Deutsch)', 271: 'منصات التبادل', 272: 'Off-topic (Hrvatski)',
          273: 'Announcements (Hrvatski)', 274: 'Others (Pilipinas)', 275: 'Nigerian',
          276: 'Trading dan Spekulasi', 277: 'Ekonomi, Politik, dan Budaya', 278: 'Topik Lainnya',
          279: 'Politics and society (Naija)', 280: 'Off-topic (Naija)'
        };
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BRDb — Activity Feed</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',system-ui,sans-serif;background:#03050a;color:#e8edf5;min-height:100vh}
    
    /* Animated background */
    .bg-glow{position:fixed;top:0;left:0;right:0;bottom:0;overflow:hidden;z-index:0;pointer-events:none}
    .glow-1{position:absolute;top:-20%;left:-10%;width:60%;height:60%;background:radial-gradient(circle,#3b82f620 0%,transparent 70%);border-radius:50%;animation:float 20s ease-in-out infinite}
    .glow-2{position:absolute;bottom:-20%;right:-10%;width:50%;height:50%;background:radial-gradient(circle,#22c55e15 0%,transparent 70%);border-radius:50%;animation:float 25s ease-in-out infinite reverse}
    .glow-3{position:absolute;top:30%;right:20%;width:40%;height:40%;background:radial-gradient(circle,#f59e0b10 0%,transparent 70%);border-radius:50%;animation:float 18s ease-in-out infinite}
    @keyframes float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(5%,5%) scale(1.05)}}
    
    .container{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:32px 24px}
    
    /* Header futuristic */
    .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:40px;flex-wrap:wrap;gap:20px}
    .header-left{display:flex;align-items:center;gap:20px}
    .back-btn{display:flex;align-items:center;gap:8px;color:#60a5fa;text-decoration:none;font-weight:500;font-size:14px;padding:10px 20px;background:rgba(15,23,42,0.6);backdrop-filter:blur(10px);border:1px solid rgba(96,165,250,0.3);border-radius:40px;transition:all .3s}
    .back-btn:hover{background:#1e293b;border-color:#60a5fa;transform:translateX(-4px)}
    h1{font-size:32px;font-weight:800;background:linear-gradient(135deg,#fff,#60a5fa,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-0.5px}
    .stats{display:flex;gap:12px}
    .stat-card{background:rgba(15,23,42,0.6);backdrop-filter:blur(10px);border:1px solid rgba(96,165,250,0.2);border-radius:32px;padding:8px 20px;display:flex;align-items:center;gap:10px;transition:all .3s}
    .stat-card:hover{transform:translateY(-2px);border-color:#60a5fa40}
    .stat-icon{font-size:18px}
    .stat-value{font-weight:800;font-size:20px;background:linear-gradient(135deg,#fff,#94a3b8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .stat-label{font-size:11px;color:#64748b;margin-left:4px}
    
    /* Feed */
    .feed{display:flex;flex-direction:column;gap:14px}
    
    /* Futuristic card */
    .card{background:rgba(12,18,30,0.7);backdrop-filter:blur(12px);border:1px solid rgba(56,189,248,0.15);border-radius:24px;padding:18px 24px;transition:all .3s;position:relative;overflow:hidden}
    .card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:0;transition:opacity .3s}
    .card::after{content:'';position:absolute;bottom:0;right:0;width:100px;height:100px;background:radial-gradient(circle,var(--accent) 0%,transparent 70%);opacity:0;transition:opacity .3s;pointer-events:none}
    .card:hover{transform:translateY(-3px);border-color:var(--accent);background:rgba(16,24,36,0.8)}
    .card:hover::before{opacity:1}
    .card:hover::after{opacity:0.08}
    .card-received{--accent:#22c55e}
    .card-sent{--accent:#f59e0b}
    .card-post{--accent:#3b82f6}

    /* Quote card styles */
    .card-quote{--accent:#a855f7}
    .badge-quote{background:linear-gradient(135deg,#a855f715,#a855f708);border:1px solid #a855f740;color:#c084fc}
    .badge-quote::before{--glow:#a855f780}
    .user-quote{background:linear-gradient(135deg,#a855f720,#a855f708);border:1px solid #a855f750;color:#c084fc}
    
    /* Row layout */
    .card-row{display:flex;align-items:center;flex-wrap:wrap;gap:10px 14px}
    
    /* Badge futuristic */
    .badge{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:40px;font-size:13px;font-weight:600;letter-spacing:0.3px;position:relative;overflow:hidden}
    .badge::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,var(--glow),transparent);transition:left .5s}
    .badge:hover::before{left:100%}
    .badge-received{background:linear-gradient(135deg,#22c55e15,#22c55e08);border:1px solid #22c55e40;color:#4ade80}
    .badge-received::before{--glow:#22c55e80}
    .badge-sent{background:linear-gradient(135deg,#f59e0b15,#f59e0b08);border:1px solid #f59e0b40;color:#fbbf24}
    .badge-sent::before{--glow:#f59e0b80}
    .badge-post{background:linear-gradient(135deg,#3b82f615,#3b82f608);border:1px solid #3b82f640;color:#60a5fa}
    .badge-post::before{--glow:#3b82f680}
    .badge-icon{font-size:14px}
    
    /* Amount */
    .amount{font-weight:800;font-size:16px;letter-spacing:-0.3px}
    .amount-received{color:#4ade80;text-shadow:0 0 8px #22c55e40}
    .amount-sent{color:#fbbf24;text-shadow:0 0 8px #f59e0b40}
    
    /* Label */
    .label{font-size:12px;color:#64748b;font-weight:400;text-transform:lowercase}
    
    /* Username futuristic */
    .user-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:40px;font-size:13px;font-weight:600}
    .user-received{background:linear-gradient(135deg,#22c55e20,#22c55e08);border:1px solid #22c55e50;color:#4ade80}
    .user-sent{background:linear-gradient(135deg,#f59e0b20,#f59e0b08);border:1px solid #f59e0b50;color:#fbbf24}
    .user-post{background:linear-gradient(135deg,#3b82f620,#3b82f608);border:1px solid #3b82f650;color:#60a5fa}
    
    /* Post title */
    .post-title{font-weight:700;font-size:14px;color:#e2e8f0;text-decoration:none;transition:all .2s;border-bottom:1px solid transparent}
    .post-title:hover{color:#60a5fa;border-bottom-color:#60a5fa}
    
    /* Board chip */
    .board-chip{background:rgba(30,41,59,0.8);backdrop-filter:blur(4px);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:500;color:#94a3b8;border:1px solid #334155}
    
    /* Date */
    .date-chip{display:inline-flex;align-items:center;gap:5px;background:rgba(0,0,0,0.3);padding:4px 12px;border-radius:20px;font-size:11px;color:#64748b;font-family:'Inter',monospace}
    
    /* Separator */
    .sep{color:#334155;font-size:10px}
    
    /* Empty state */
    .empty{text-align:center;padding:80px 20px;background:rgba(12,18,30,0.5);backdrop-filter:blur(12px);border-radius:32px;border:1px solid rgba(56,189,248,0.15)}
    .empty-icon{font-size:56px;margin-bottom:20px;opacity:0.5;filter:drop-shadow(0 0 20px #3b82f6)}
    .empty-text{color:#64748b;font-size:14px}
    
    /* Footer */
    .footer{text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid rgba(56,189,248,0.1);font-size:12px;color:#475569}
    
    /* Animations */
    @keyframes fadeSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
    .card{animation:fadeSlideUp 0.4s cubic-bezier(0.2,0.9,0.4,1.1) forwards}
    
    /* Scrollbar */
    ::-webkit-scrollbar{width:6px}
    ::-webkit-scrollbar-track{background:#0f172a}
    ::-webkit-scrollbar-thumb{background:#3b82f6;border-radius:3px}
    
    @media(max-width:700px){.card-row{gap:8px 10px}.badge{padding:4px 12px;font-size:11px}.user-badge{padding:3px 10px;font-size:11px}.post-title{font-size:12px}}
  </style>
</head>
<body>
<div class="bg-glow">
  <div class="glow-1"></div>
  <div class="glow-2"></div>
  <div class="glow-3"></div>
</div>
<div class="container">
  <div class="header">
    <div class="header-left">
      <a href="/profile/${uid}" class="back-btn">← Back to Profile</a>
      <h1>ACTIVITY FEED</h1>
    </div>
    <div class="stats">
      <div class="stat-card"><span class="stat-icon">📝</span><span class="stat-value">${enrichedPosts.length}</span><span class="stat-label">posts</span></div>
      <div class="stat-card"><span class="stat-icon">⭐</span><span class="stat-value">${enrichedReceived.length}</span><span class="stat-label">in</span></div>
      <div class="stat-card"><span class="stat-icon">📤</span><span class="stat-value">${enrichedSent.length}</span><span class="stat-label">out</span></div>
    </div>
  </div>
  
  <div class="feed">`;
        
  if (allEvents.length === 0) {
  html += `
    <div class="empty">
      <div class="empty-icon">🌀</div>
      <div class="empty-text">No signals detected</div>
    </div>`;
} else {
  for (const event of allEvents.slice(0, 100)) {
    if (event.eventType === 'merit_received') {
      html += `
    <div class="card card-received">
      <div class="card-row">
        <div class="badge badge-received"><span class="badge-icon">⭐</span> INFLOW</div>
        <span class="amount amount-received">+${event.amount}</span>
        <span class="label">from</span>
        <div class="user-badge user-received">${decodeHtmlEntities(event.from_username)}</div>
        <span class="label">for</span>
        <a href="https://bitcointalk.org/index.php?topic=${event.topic_id}.msg${event.msg_id}#msg${event.msg_id}" target="_blank" class="post-title">«${decodeHtmlEntities((event.post_title || '').substring(0, 55))}${(event.post_title?.length || 0) > 55 ? '...' : ''}»</a>
        <span class="sep">◇</span>
        <div class="date-chip"><span>📅</span> ${event.date.split(' ')[0]}</div>
      </div>
    </div>`;
    } else if (event.eventType === 'merit_sent') {
      html += `
    <div class="card card-sent">
      <div class="card-row">
        <div class="badge badge-sent"><span class="badge-icon">📤</span> OUTFLOW</div>
        <span class="amount amount-sent">+${event.amount}</span>
        <span class="label">to</span>
        <div class="user-badge user-sent">${decodeHtmlEntities(event.to_username)}</div>
        <span class="label">for</span>
        <a href="https://bitcointalk.org/index.php?topic=${event.topic_id}.msg${event.msg_id}#msg${event.msg_id}" target="_blank" class="post-title">«${decodeHtmlEntities((event.post_title || '').substring(0, 55))}${(event.post_title?.length || 0) > 55 ? '...' : ''}»</a>
        <span class="sep">◇</span>
        <div class="date-chip"><span>📅</span> ${event.date.split(' ')[0]}</div>
      </div>
    </div>`;
    } else if (event.eventType === 'my_post') {
      const boardName = boardNames[event.board_id] || ('Board ' + event.board_id);
      html += `
    <div class="card card-post">
      <div class="card-row">
        <div class="badge badge-post"><span class="badge-icon">📝</span> NEW POST</div>
        <span class="label">in</span>
        <div class="board-chip">${decodeHtmlEntities(boardName)}</div>
        <a href="https://bitcointalk.org/index.php?topic=${event.topic_id}.msg${event.post_id}#msg${event.post_id}" target="_blank" class="post-title">«${decodeHtmlEntities((event.title || '').substring(0, 55))}${(event.title?.length || 0) > 55 ? '...' : ''}»</a>
        <span class="sep">◇</span>
        <div class="date-chip"><span>📅</span> ${event.date.split(' ')[0]}</div>
      </div>
    </div>`;
    } else if (event.eventType === 'quote_received') {
  const boardName = boardNames[event.board_id] || ('Board ' + event.board_id);
  // 🔥 FIX: Link con topic_id e post_id
  const postLink = `/post/${event.topic_id}/${event.post_id}`;
  html += `
    <div class="card card-quote">
      <div class="card-row">
        <div class="badge badge-quote"><span class="badge-icon">💬</span> QUOTE</div>
        <div class="user-badge user-quote">${decodeHtmlEntities(event.quoted_by_name || `UID ${event.quoted_by_uid}`)}</div>
        <span class="label">quoted you</span>
        <span class="label">in</span>
        <div class="board-chip">${decodeHtmlEntities(boardName)}</div>
        <a href="${postLink}" class="post-title">«${decodeHtmlEntities((event.post_title || '').substring(0, 55))}${(event.post_title?.length || 0) > 55 ? '...' : ''}»</a>
        <span class="sep">◇</span>
        <div class="date-chip"><span>📅</span> ${event.date}</div>
      </div>
    </div>`;
}
  }
}
        html += `
  </div>
  <div class="footer">
    <span>✦ ${allEvents.length} events catalogued ✦</span>
  </div>
</div>
</body>
</html>`;
        
        // Helper function to escape HTML
        function escapeHtml(str) {
          if (!str) return '';
          return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
          });
        }
        
        return new Response(html, {
          status: 200,
          headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' }
        });
        
      } catch (err) {
        console.error('GET /notifications error:', err);
        return json({ error: err.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // DISABLED: GET /global-feed-data — API endpoint removed to save DB resources
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/global-feed-data') {
      return json({ error: 'Global feed disabled' }, 410);
      
      /* REMOVED CODE:
      const since = parseInt(u.searchParams.get('since') || '0');
      
      try {
        // Get events newer than 'since' timestamp
        let meritsReceived = { results: [] };
        try {
          meritsReceived = await env.MERIT_DB.prepare(`
            SELECT 
              m.amount, 
              m.from_uid, 
              m.to_uid,
              m.title as post_title,
              m.topic_id,
              m.msg_id,
              m.collected_at,
              datetime(m.collected_at/1000, 'unixepoch', 'localtime') as date,
              'merit_received' as type
            FROM merit_events m
            WHERE m.collected_at > ?
            ORDER BY m.collected_at DESC
            LIMIT 20
          `).bind(since).all();
        } catch(e) { console.log('Global merits error:', e.message); }
        
        let posts = { results: [] };
        try {
          posts = await env.MERIT_DB.prepare(`
            SELECT 
              p.uid as author_uid,
              p.username as author_name,
              p.post_id,
              p.topic_id,
              p.title,
              p.board_id,
              p.collected_at,
              datetime(p.collected_at/1000, 'unixepoch', 'localtime') as date,
              'post' as type
            FROM post_events p
            WHERE p.collected_at > ?
            ORDER BY p.collected_at DESC
            LIMIT 20
          `).bind(since).all();
        } catch(e) { console.log('Global posts error:', e.message); }
        
        async function getUsername(uid) {
          if (!uid) return null;
          try {
            const result = await env.brdb_users.prepare(`
              SELECT username FROM brdb_users WHERE uid = ?
            `).bind(String(uid)).first();
            return result?.username || `UID ${uid}`;
          } catch(e) {
            return `UID ${uid}`;
          }
        }
        
        function decodeHtmlEntities(str) {
          if (!str) return '';
          return str.replace(/&#(\d+);/g, function(match, dec) {
            return String.fromCodePoint(parseInt(dec, 10));
          }).replace(/&amp;/g, '&');
        }
        
        const enrichedMerits = [];
        for (const merit of (meritsReceived.results || [])) {
          const fromUsername = await getUsername(merit.from_uid);
          const toUsername = await getUsername(merit.to_uid);
          enrichedMerits.push({
            type: 'merit_received',
            amount: merit.amount,
            from_uid: merit.from_uid,
            to_uid: merit.to_uid,
            from_username: decodeHtmlEntities(fromUsername),
            to_username: decodeHtmlEntities(toUsername),
            post_title: decodeHtmlEntities(merit.post_title),
            topic_id: merit.topic_id,
            msg_id: merit.msg_id,
            date: merit.date,
            timestamp: merit.collected_at
          });
        }
        
        const enrichedPosts = (posts.results || []).map(post => ({
          type: 'post',
          author_uid: post.author_uid,
          author_name: decodeHtmlEntities(post.author_name),
          post_id: post.post_id,
          topic_id: post.topic_id,
          title: decodeHtmlEntities(post.title),
          board_id: post.board_id,
          date: post.date,
          timestamp: post.collected_at
        }));
        
        const allEvents = [...enrichedMerits, ...enrichedPosts]
          .sort((a, b) => a.timestamp - b.timestamp);
        
        return json({ events: allEvents, lastTimestamp: since });
        
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // DISABLED: GET /global-feed — Global activity feed removed to save DB resources
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/global-feed') {
      return json({ error: 'Global feed disabled' }, 410);
      
      /* REMOVED CODE:
      try {
        // 1. Last 30 merits (global)
        let meritsReceived = { results: [] };
        try {
          meritsReceived = await env.MERIT_DB.prepare(`
            SELECT 
              m.amount, 
              m.from_uid, 
              m.to_uid,
              m.title as post_title,
              m.topic_id,
              m.msg_id,
              m.collected_at,
              datetime(m.collected_at/1000, 'unixepoch', 'localtime') as date,
              'merit_received' as type
            FROM merit_events m
            ORDER BY m.collected_at DESC
            LIMIT 30
          `).all();
        } catch(e) { console.log('Global merits error:', e.message); }
        
        // 2. Last 30 posts (global)
        let posts = { results: [] };
        try {
          posts = await env.MERIT_DB.prepare(`
            SELECT 
              p.uid as author_uid,
              p.username as author_name,
              p.post_id,
              p.topic_id,
              p.title,
              p.board_id,
              p.collected_at,
*/
              datetime(p.collected_at/1000, 'unixepoch', 'localtime') as date,
              'post' as type
            FROM post_events p
            ORDER BY p.collected_at DESC
            LIMIT 30
          `).all();
        } catch(e) { console.log('Global posts error:', e.message); }
        
        // Helper to get username
        async function getUsername(uid) {
          if (!uid) return null;
          try {
            const result = await env.brdb_users.prepare(`
              SELECT username FROM brdb_users WHERE uid = ?
            `).bind(String(uid)).first();
            return result?.username || `UID ${uid}`;
          } catch(e) {
            return `UID ${uid}`;
          }
        }
        
        // Helper to decode HTML entities
        function decodeHtmlEntities(str) {
          if (!str) return '';
          return str
            .replace(/&#(\d+);/g, function(match, dec) {
              return String.fromCodePoint(parseInt(dec, 10));
            })
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, '/')
            .replace(/&#39;/g, "'");
        }
        
        // Enrich merits with usernames
        const enrichedMerits = [];
        for (const merit of (meritsReceived.results || [])) {
          const fromUsername = await getUsername(merit.from_uid);
          const toUsername = await getUsername(merit.to_uid);
          enrichedMerits.push({
            ...merit,
            from_username: fromUsername,
            to_username: toUsername,
            timestamp: merit.collected_at
          });
        }
        
        // Enrich posts
        const enrichedPosts = (posts.results || []).map(post => ({
          ...post,
          timestamp: post.collected_at
        }));
        
        // Merge and sort
        const allEvents = [
          ...enrichedMerits.map(e => ({ ...e, eventType: 'merit_received' })),
          ...enrichedPosts.map(e => ({ ...e, eventType: 'post' }))
        ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
        
        // COMPLETE BOARD MAP (all 280+ boards)
        const boardNames = {
          1: 'Bitcoin Discussion', 4: 'Bitcoin Technical Support', 5: 'Marketplace',
          6: 'Development & Technical Discussion', 7: 'Economics', 8: 'Trading Discussion',
          9: 'Off-topic', 10: 'Russian', 11: 'Other languages/locations', 12: 'Project Development',
          13: 'French', 14: 'Mining', 16: 'German', 17: 'Chinese students', 18: 'Разное',
          19: 'Юристы', 20: 'Трейдеры', 21: 'Майнеры', 22: 'Новички', 23: 'Бизнес', 24: 'Meta',
          25: 'Obsolete (buying)', 26: 'Obsolete (selling)', 27: 'Spanish', 28: 'Italian',
          29: 'Portuguese', 30: 'Mandarin', 31: 'Mercado y Economía', 32: 'Hardware y Minería',
          33: 'Esquina Libre', 34: 'Politics & Society', 35: 'Biete', 36: 'Suche',
          37: 'Wallet software', 39: 'Beginners & Help', 40: 'Mining support', 41: 'Pools',
          42: 'Mining software (miners)', 44: 'CPU/GPU Bitcoin mining hardware', 45: 'Scandinavian',
          46: 'Mercato valute', 47: 'Discussions générales et utilisation du Bitcoin',
          48: 'Mining et Hardware', 49: 'Place de marché', 50: 'Hors-sujet', 51: 'Goods',
          52: 'Services', 53: 'Currency exchange', 54: 'Wiki, documentation et traduction',
          55: 'Хайпы', 56: 'Gambling', 57: 'Speculation', 59: 'Archival', 60: 'Mining (Deutsch)',
          61: 'Trading und Spekulation', 62: 'Anfänger und Hilfe', 63: 'Projektentwicklung',
          64: 'Off-Topic (Deutsch)', 65: 'Lending', 66: 'Кодеры', 67: 'Altcoin Discussion',
          69: 'Economia & Mercado', 70: 'Mineração em Geral', 71: 'Games and rounds',
          72: 'Альтернативные криптовалюты', 73: 'Auctions', 74: 'Legal', 75: 'Computer hardware',
          76: 'Hardware', 77: 'Press', 78: 'Securities', 79: 'Dutch', 80: 'Markt',
          81: 'Mining speculation', 82: 'Korean', 83: 'Scam Accusations', 84: 'Service Announcements',
          85: 'Service Discussion', 86: 'Meetups', 87: 'Important Announcements',
          88: 'Long-term offers', 89: 'India', 90: 'Идеи', 91: 'Политика', 92: 'Корзина',
          93: 'Digital goods', 94: 'Gokken/lotterijen', 95: 'Hebrew', 97: 'Armory', 98: 'Electrum',
          99: 'MultiBit', 100: 'Bitcoin Wallet for Android', 101: 'Mercadillo', 102: 'Mexico',
          103: 'Argentina', 104: 'España', 105: 'Centroamerica y Caribe', 107: 'Beni',
          108: 'Romanian', 109: 'Anunturi importante', 110: 'Offtopic', 111: 'Market',
          112: 'Tutoriale', 113: 'Bine ai venit!', 114: 'Presa', 115: 'Mining (Italiano)',
          116: 'Mining (Nederlands)', 117: '跳蚤市场', 118: '山寨币', 119: '媒体', 120: 'Greek',
          121: 'Mining (India)', 122: 'Marketplace (India)', 123: 'Regional Languages (India)',
          124: 'Press & News from India', 125: 'Alt Coins (India)', 126: 'Buyer/ Seller Reputations (India)',
          127: 'Off-Topic (India)', 128: 'Новости', 129: 'Reputation', 130: 'Primeros pasos y ayuda',
          131: 'Primeiros Passos (Iniciantes)', 132: 'Alt-Currencies (Italiano)', 133: 'Turkish',
          134: 'Brasil', 135: 'Portugal', 136: 'Αγορά', 137: 'Group buys', 138: 'BitcoinJ',
          139: 'Treffen', 140: 'Presse ', 141: 'Auktionen', 142: 'Polish', 143: 'Beurzen',
          144: 'Raduni/Meeting (Italiano)', 145: 'Off-Topic (Italiano)', 146: '挖矿',
          147: 'Alt Coins (Nederlands)', 148: 'Off-topic (Nederlands)', 149: 'Altcoins (Français)',
          150: 'Meetings (Nederlands)', 151: 'Altcoins (criptomonedas alternativas)',
          152: 'Altcoins (Deutsch)', 153: 'Guide (Italiano)', 155: 'Pazar Alanı', 156: 'Madencilik',
          157: 'Alternatif Kripto-Paralar', 158: 'Konu Dışı', 159: 'Announcements (Altcoins)',
          160: 'Mining (Altcoins)', 161: 'Marketplace (Altcoins)', 162: 'Accuse scam/truffe',
          163: 'Tablica ogłoszeń', 164: 'Alternatywne kryptowaluty', 165: 'Crittografia e decentralizzazione',
          166: 'Minerit', 167: 'New forum software', 168: 'Bitcoin Wiki', 169: 'Progetti',
          170: 'Mercato', 171: 'Servizi', 172: 'Esercizi commerciali', 173: 'Hardware/Mining (Italiano)',
          174: 'Yeni Başlayanlar & Yardım', 175: 'Trading, analisi e speculazione', 176: 'Annunci',
          177: 'Minería de altcoins', 178: 'Anunturi Monede Alternative', 179: 'Altcoins (Ελληνικά)',
          180: 'Bitcoin Haberleri', 181: 'Criptomoedas Alternativas', 182: '대체코인 Alt Coins (한국어)',
          183: 'Actualité et News', 184: 'Vos sites et projets', 185: 'Работа',
          186: 'Développement et technique', 187: 'Économie et spéculation', 188: 'Le Bitcoin et la loi',
          189: 'Ekonomi', 190: 'Servisler', 191: 'Indonesian', 192: 'Altcoins (Bahasa Indonesia)',
          193: 'Jual Beli', 194: 'Mining (Bahasa Indonesia)', 195: 'Mining Discussion (Ελληνικά)',
          196: '离题万里', 197: 'Service Announcements (Altcoins)', 198: 'Service Discussion (Altcoins)',
          199: 'Pools (Altcoins)', 200: 'Gambling (Italiano)', 201: 'Croatian', 202: 'Servicios',
          203: 'Trading y especulación', 204: 'Servicios', 205: 'Discussioni avanzate e sviluppo',
          206: 'Desenvolvimento & Discussões Técnicas', 207: 'Investor-based games', 208: 'Débutants',
          209: 'Échanges', 210: 'Produits et services', 211: 'Petites annonces', 212: 'Micro Earnings',
          217: 'Collectibles', 219: 'Filipino', 220: 'Trgovina', 221: 'Altcoins (Hrvatski)',
          222: 'Web Wallets', 223: 'Exchanges', 224: 'Speculation (Altcoins)', 228: 'Gambling discussion',
          229: 'Proje Geliştirme', 230: 'Buluşmalar', 231: 'Mycelium', 232: 'Fonlar',
          234: 'Invites & Accounts', 235: 'Madencilik (Alternatif Kripto-Paralar)', 236: 'Барахолка',
          237: 'Обменники', 238: 'Bounties (Altcoins)', 239: 'Duyurular (Alternatif Kripto-Paralar)',
          240: 'Tokens (Altcoins)', 241: 'Arabic', 242: 'العملات البديلة (Altcoins)',
          243: 'Altcoins (Pilipinas)', 246: 'Altcoin Announcements (Ελληνικά)',
          247: 'Altcoin Mining (Ελληνικά)', 248: 'Токены', 250: 'Serious discussion', 251: 'Ivory Tower',
          252: 'Japanese', 253: 'إستفسارات و أسئلة المبتدئين', 254: 'Tokens (Español)', 255: 'アルトコイン',
          256: 'Бayнти и aиpдpoпы', 257: 'Discutii Servicii', 258: 'Annonces', 259: 'Altcoins (Monede Alternative)',
          260: 'Altcoin Announcements (Pilipinas)', 261: 'Hardware wallets', 262: 'Oбcyждeниe Bitcoin',
          263: 'Nowe kryptowaluty i tokeny', 264: 'Tablica ogłoszeń (altcoiny)', 265: 'النقاشات',
          266: 'التعدين', 267: 'النقاشات الأخرى', 268: 'Pamilihan', 269: 'Marktplatz',
          270: 'Announcements (Deutsch)', 271: 'منصات التبادل', 272: 'Off-topic (Hrvatski)',
          273: 'Announcements (Hrvatski)', 274: 'Others (Pilipinas)', 275: 'Nigerian',
          276: 'Trading dan Spekulasi', 277: 'Ekonomi, Politik, dan Budaya', 278: 'Topik Lainnya',
          279: 'Politics and society (Naija)', 280: 'Off-topic (Naija)'
        };
        
        // Convert events to JSON for JavaScript
        const eventsJson = JSON.stringify(allEvents.map(e => ({
          type: e.eventType,
          amount: e.amount,
          from_uid: e.from_uid,
          to_uid: e.to_uid,
          from_username: decodeHtmlEntities(e.from_username || `UID ${e.from_uid}`),
          to_username: decodeHtmlEntities(e.to_username || `UID ${e.to_uid}`),
          post_title: decodeHtmlEntities(e.post_title),
          topic_id: e.topic_id,
          msg_id: e.msg_id,
          post_id: e.post_id,
          author_uid: e.author_uid,
          author_name: decodeHtmlEntities(e.author_name),
          title: decodeHtmlEntities(e.title),
          board_id: e.board_id,
          date: e.date,
          timestamp: e.timestamp
        })));
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BRDb — Global Activity Feed</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',system-ui,sans-serif;background:#03050a;color:#e8edf5;min-height:100vh}
    
    .bg-glow{position:fixed;top:0;left:0;right:0;bottom:0;overflow:hidden;z-index:0;pointer-events:none}
    .glow-1{position:absolute;top:-20%;left:-10%;width:60%;height:60%;background:radial-gradient(circle,#3b82f620 0%,transparent 70%);border-radius:50%;animation:float 20s ease-in-out infinite}
    .glow-2{position:absolute;bottom:-20%;right:-10%;width:50%;height:50%;background:radial-gradient(circle,#22c55e15 0%,transparent 70%);border-radius:50%;animation:float 25s ease-in-out infinite reverse}
    .glow-3{position:absolute;top:30%;right:20%;width:40%;height:40%;background:radial-gradient(circle,#f59e0b10 0%,transparent 70%);border-radius:50%;animation:float 18s ease-in-out infinite}
    @keyframes float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(5%,5%) scale(1.05)}}
    
    .container{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:32px 24px}
    
    .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:40px;flex-wrap:wrap;gap:20px}
    .header-left{display:flex;align-items:center;gap:20px}
    .back-btn{display:flex;align-items:center;gap:8px;color:#60a5fa;text-decoration:none;font-weight:500;font-size:14px;padding:10px 20px;background:rgba(15,23,42,0.6);backdrop-filter:blur(10px);border:1px solid rgba(96,165,250,0.3);border-radius:40px;transition:all .3s}
    .back-btn:hover{background:#1e293b;border-color:#60a5fa;transform:translateX(-4px)}
    h1{font-size:32px;font-weight:800;background:linear-gradient(135deg,#fff,#60a5fa,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-0.5px}
    .stats{display:flex;gap:12px}
    .stat-card{background:rgba(15,23,42,0.6);backdrop-filter:blur(10px);border:1px solid rgba(96,165,250,0.2);border-radius:32px;padding:8px 20px;display:flex;align-items:center;gap:10px}
    .stat-card:hover{transform:translateY(-2px);border-color:#60a5fa40}
    .stat-icon{font-size:18px}
    .stat-value{font-weight:800;font-size:20px;background:linear-gradient(135deg,#fff,#94a3b8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .stat-label{font-size:11px;color:#64748b;margin-left:4px}
    
    .feed{display:flex;flex-direction:column;gap:14px}
    
    .card{background:rgba(12,18,30,0.7);backdrop-filter:blur(12px);border:1px solid rgba(56,189,248,0.15);border-radius:24px;padding:18px 24px;transition:all .3s;position:relative;overflow:hidden;animation:fadeSlideUp 0.4s cubic-bezier(0.2,0.9,0.4,1.1) forwards}
    .card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:0;transition:opacity .3s}
    .card::after{content:'';position:absolute;bottom:0;right:0;width:100px;height:100px;background:radial-gradient(circle,var(--accent) 0%,transparent 70%);opacity:0;transition:opacity .3s;pointer-events:none}
    .card:hover{transform:translateY(-3px);border-color:var(--accent);background:rgba(16,24,36,0.8)}
    .card:hover::before{opacity:1}
    .card:hover::after{opacity:0.08}
    .card-merit-received{--accent:#22c55e}
    .card-post{--accent:#3b82f6}
    
    .card-new{animation:flash 0.5s ease-out}
    @keyframes flash{0%{background:rgba(34,197,94,0.3);border-color:#22c55e}100%{background:rgba(12,18,30,0.7);border-color:rgba(56,189,248,0.15)}}
    @keyframes fadeSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
    
    .card-row{display:flex;align-items:center;flex-wrap:wrap;gap:10px 14px}
    
    .badge{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:40px;font-size:13px;font-weight:600;letter-spacing:0.3px;position:relative;overflow:hidden}
    .badge::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,var(--glow),transparent);transition:left .5s}
    .badge:hover::before{left:100%}
    .badge-merit-received{background:linear-gradient(135deg,#22c55e15,#22c55e08);border:1px solid #22c55e40;color:#4ade80}
    .badge-merit-received::before{--glow:#22c55e80}
    .badge-post{background:linear-gradient(135deg,#3b82f615,#3b82f608);border:1px solid #3b82f640;color:#60a5fa}
    .badge-post::before{--glow:#3b82f680}
    .badge-icon{font-size:14px}
    
    .amount{font-weight:800;font-size:16px;letter-spacing:-0.3px;color:#4ade80;text-shadow:0 0 8px #22c55e40}
    .label{font-size:12px;color:#64748b;font-weight:400;text-transform:lowercase}
    
    .user-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:40px;font-size:13px;font-weight:600}
    .user-badge a{color:inherit;text-decoration:none}
    .user-badge a:hover{text-decoration:underline}
    .user-received{background:linear-gradient(135deg,#22c55e20,#22c55e08);border:1px solid #22c55e50;color:#4ade80}
    
    .post-title{font-weight:700;font-size:14px;color:#e2e8f0;text-decoration:none;transition:all .2s;border-bottom:1px solid transparent}
    .post-title:hover{color:#60a5fa;border-bottom-color:#60a5fa}
    
    .board-chip{background:rgba(30,41,59,0.8);backdrop-filter:blur(4px);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:500;color:#94a3b8;border:1px solid #334155}
    .date-chip{display:inline-flex;align-items:center;gap:5px;background:rgba(0,0,0,0.3);padding:4px 12px;border-radius:20px;font-size:11px;color:#64748b}
    .sep{color:#334155;font-size:10px}
    
    .empty{text-align:center;padding:80px 20px;background:rgba(12,18,30,0.5);backdrop-filter:blur(12px);border-radius:32px;border:1px solid rgba(56,189,248,0.15)}
    .empty-icon{font-size:56px;margin-bottom:20px;opacity:0.5;filter:drop-shadow(0 0 20px #3b82f6)}
    .empty-text{color:#64748b;font-size:14px}
    
    .footer{text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid rgba(56,189,248,0.1);font-size:12px;color:#475569}
    
    .refresh-indicator{position:fixed;bottom:20px;right:20px;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);padding:8px 16px;border-radius:40px;font-size:11px;color:#64748b;border:1px solid #334155;z-index:100;display:flex;align-items:center;gap:8px}
    .refresh-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
    
    ::-webkit-scrollbar{width:6px}
    ::-webkit-scrollbar-track{background:#0f172a}
    ::-webkit-scrollbar-thumb{background:#3b82f6;border-radius:3px}
    
    @media(max-width:700px){.card-row{gap:8px 10px}.badge{padding:4px 12px;font-size:11px}.user-badge{padding:3px 10px;font-size:11px}.post-title{font-size:12px}}
  </style>
</head>
<body>
<div class="bg-glow">
  <div class="glow-1"></div>
  <div class="glow-2"></div>
  <div class="glow-3"></div>
</div>
<div class="container">
  <div class="header">
    <div class="header-left">
      <a href="/leaderboard-page" class="back-btn">← Leaderboard</a>
      <h1>GLOBAL FEED</h1>
    </div>
    <div class="stats">
      <div class="stat-card"><span class="stat-icon">⭐</span><span class="stat-value" id="meritCount">${allEvents.filter(e => e.eventType === 'merit_received').length}</span><span class="stat-label">merits</span></div>
      <div class="stat-card"><span class="stat-icon">📝</span><span class="stat-value" id="postCount">${allEvents.filter(e => e.eventType === 'post').length}</span><span class="stat-label">posts</span></div>
    </div>
  </div>
  
  <div class="feed" id="feedContainer">`;
        
        if (allEvents.length === 0) {
          html += `
    <div class="empty" id="emptyState">
      <div class="empty-icon">🌀</div>
      <div class="empty-text">No signals detected</div>
    </div>`;
        } else {
          for (const event of allEvents) {
            if (event.eventType === 'merit_received') {
              html += `
    <div class="card card-merit-received" data-timestamp="${event.timestamp}">
      <div class="card-row">
        <div class="badge badge-merit-received"><span class="badge-icon">⭐</span> INFLOW</div>
        <span class="amount">+${event.amount}</span>
        <span class="label">from</span>
        <div class="user-badge user-received"><a href="/profile/${event.from_uid}">${decodeHtmlEntities(event.from_username)}</a></div>
        <span class="label">to</span>
        <div class="user-badge user-received"><a href="/profile/${event.to_uid}">${decodeHtmlEntities(event.to_username)}</a></div>
        <span class="label">for</span>
        <a href="https://bitcointalk.org/index.php?topic=${event.topic_id}.msg${event.msg_id}#msg${event.msg_id}" target="_blank" class="post-title">«${decodeHtmlEntities((event.post_title || '').substring(0, 55))}${(event.post_title?.length || 0) > 55 ? '...' : ''}»</a>
        <span class="sep">◇</span>
        <div class="date-chip"><span>📅</span> ${event.date.split(' ')[0]}</div>
      </div>
    </div>`;
            } else if (event.eventType === 'post') {
              const boardName = boardNames[event.board_id] || ('Board ' + event.board_id);
              html += `
    <div class="card card-post" data-timestamp="${event.timestamp}">
      <div class="card-row">
        <div class="badge badge-post"><span class="badge-icon">📝</span> NEW POST</div>
        <div class="user-badge user-received"><a href="/profile/${event.author_uid}">${decodeHtmlEntities(event.author_name || `UID ${event.author_uid}`)}</a></div>
        <span class="label">in</span>
        <div class="board-chip">${decodeHtmlEntities(boardName)}</div>
        <a href="https://bitcointalk.org/index.php?topic=${event.topic_id}.msg${event.post_id}#msg${event.post_id}" target="_blank" class="post-title">«${decodeHtmlEntities((event.title || '').substring(0, 55))}${(event.title?.length || 0) > 55 ? '...' : ''}»</a>
        <span class="sep">◇</span>
        <div class="date-chip"><span>📅</span> ${event.date.split(' ')[0]}</div>
      </div>
    </div>`;
            }
          }
        }
        
        html += `
  </div>
  <div class="footer">
    <span>✦ Live feed — auto-refreshes every 10 seconds ✦</span>
  </div>
</div>
<div class="refresh-indicator">
  <div class="refresh-dot"></div>
  <span>Live • updating...</span>
</div>

<script>
  const boardNames = ${JSON.stringify(boardNames)};
  let lastTimestamp = ${allEvents.length > 0 ? Math.max(...allEvents.map(e => e.timestamp)) : 0};
  let refreshInterval;
  
  function decodeHtmlEntities(str) {
    if (!str) return '';
    return str
      .replace(/&#(\\d+);/g, function(match, dec) {
        return String.fromCodePoint(parseInt(dec, 10));
      })
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#39;/g, "'");
  }
  
  function formatDate(dateStr) {
    return dateStr.split(' ')[0];
  }
  
  function createCard(event) {
    if (event.type === 'merit_received') {
      return \`
    <div class="card card-merit-received card-new" data-timestamp="\${event.timestamp}">
      <div class="card-row">
        <div class="badge badge-merit-received"><span class="badge-icon">⭐</span> INFLOW</div>
        <span class="amount">+\${event.amount}</span>
        <span class="label">from</span>
        <div class="user-badge user-received"><a href="/profile/\${event.from_uid}">\${decodeHtmlEntities(event.from_username)}</a></div>
        <span class="label">to</span>
        <div class="user-badge user-received"><a href="/profile/\${event.to_uid}">\${decodeHtmlEntities(event.to_username)}</a></div>
        <span class="label">for</span>
        <a href="https://bitcointalk.org/index.php?topic=\${event.topic_id}.msg\${event.msg_id}#msg\${event.msg_id}" target="_blank" class="post-title">«\${decodeHtmlEntities((event.post_title || '').substring(0, 55))}\${(event.post_title?.length || 0) > 55 ? '...' : ''}»</a>
        <span class="sep">◇</span>
        <div class="date-chip"><span>📅</span> \${formatDate(event.date)}</div>
      </div>
    </div>\`;
    } else {
      const boardName = boardNames[event.board_id] || ('Board ' + event.board_id);
      return \`
    <div class="card card-post card-new" data-timestamp="\${event.timestamp}">
      <div class="card-row">
        <div class="badge badge-post"><span class="badge-icon">📝</span> NEW POST</div>
        <div class="user-badge user-received"><a href="/profile/\${event.author_uid}">\${decodeHtmlEntities(event.author_name || ('UID ' + event.author_uid))}</a></div>
        <span class="label">in</span>
        <div class="board-chip">\${decodeHtmlEntities(boardName)}</div>
        <a href="https://bitcointalk.org/index.php?topic=\${event.topic_id}.msg\${event.post_id}#msg\${event.post_id}" target="_blank" class="post-title">«\${decodeHtmlEntities((event.title || '').substring(0, 55))}\${(event.title?.length || 0) > 55 ? '...' : ''}»</a>
        <span class="sep">◇</span>
        <div class="date-chip"><span>📅</span> \${formatDate(event.date)}</div>
      </div>
    </div>\`;
    }
  }
  
  // Global feed disabled - removed to save DB resources
  /*
  async function fetchNewEvents() {
    try {
      const response = await fetch('/global-feed-data?since=' + lastTimestamp);
      const newEvents = await response.json();
      
      if (newEvents.events && newEvents.events.length > 0) {
        const feedContainer = document.getElementById('feedContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (emptyState) emptyState.remove();
        
        for (const event of newEvents.events.reverse()) {
          const cardHtml = createCard(event);
          feedContainer.insertAdjacentHTML('afterbegin', cardHtml);
          lastTimestamp = Math.max(lastTimestamp, event.timestamp);
        }
        
        // Update counts
        const meritCountEl = document.getElementById('meritCount');
        const postCountEl = document.getElementById('postCount');
        const currentMerits = document.querySelectorAll('.card-merit-received').length;
        const currentPosts = document.querySelectorAll('.card-post').length;
        if (meritCountEl) meritCountEl.textContent = currentMerits;
        if (postCountEl) postCountEl.textContent = currentPosts;
        
        // Remove animation class
        setTimeout(() => {
          document.querySelectorAll('.card-new').forEach(card => {
            card.classList.remove('card-new');
          });
        }, 500);
      }
    } catch (e) {
      console.log('Fetch error:', e);
    }
  }
  
  refreshInterval = setInterval(fetchNewEvents, 10000);
  
  window.addEventListener('beforeunload', () => {
    if (refreshInterval) clearInterval(refreshInterval);
  });
  */
</script>
</body>
</html>`;
        
        function escapeHtml(str) {
          if (!str) return '';
          return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
          });
        }
        
        return new Response(html, {
          status: 200,
          headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' }
        });
        
      } catch (err) {
        console.error('GET /global-feed error:', err);
        return json({ error: err.message }, 500);
      }
    }
    
// ═══════════════════════════════════════════════════════════════
// GET /post/:post_id — Visualizza un post specifico
// Estrae il topic_id automaticamente da Bitcointalk
// ═══════════════════════════════════════════════════════════════
if (request.method === 'GET' && path.startsWith('/post/')) {
  const post_id = parseInt(path.split('/')[2]);
  if (!post_id) {
    return new Response('Missing post_id', { status: 400 });
  }
  
  try {
    // 1. CERCA IL POST NEL DATABASE
    let post = await env.MERIT_DB.prepare(`
      SELECT 
        p.uid,
        p.topic_id,
        p.board_id,
        p.title,
        p.username,
        p.collected_at,
        COALESCE(u.username, p.username, 'User #' || p.uid) as author_name
      FROM post_events p
      LEFT JOIN user_profiles u ON u.uid = p.uid
      WHERE p.post_id = ?
    `).bind(post_id).first();
    
    let topic_id = post?.topic_id;
    
    // 2. SE NON TROVATO topic_id, PROVA A ESTRARLO DA BITCOINTALK
    if (!topic_id) {
      try {
        // Prima prova a cercare su Bitcointalk con il post_id
        // Usa il feed recent per trovare il post
        const searchUrl = `https://bitcointalk.org/index.php?action=recent;start=0`;
        const searchRes = await fetch(searchUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          }
        });
        
        if (searchRes.ok) {
          const searchHtml = await searchRes.text();
          // Cerca il post nella pagina recent
          const postPattern = new RegExp(`topic=(\\d+)\\.msg${post_id}#msg${post_id}`, 'i');
          const match = searchHtml.match(postPattern);
          if (match) {
            topic_id = parseInt(match[1]);
          }
        }
      } catch (e) {
        console.log('Error searching topic_id:', e.message);
      }
    }
    
    // 3. SE NON TROVATO topic_id, PROVA DIRETTAMENTE CON L'URL DEL POST
    if (!topic_id) {
      // Prova a fare fetch del post direttamente
      const directUrl = `https://bitcointalk.org/index.php?topic=0.msg${post_id}#msg${post_id}`;
      try {
        const directRes = await fetch(directUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          }
        });
        
        if (directRes.ok) {
          const html = await directRes.text();
          // Cerca il topic_id nella pagina
          const topicMatch = html.match(/topic=(\d+)\.msg${post_id}/i);
          if (topicMatch) {
            topic_id = parseInt(topicMatch[1]);
          }
        }
      } catch (e) {
        console.log('Error fetching direct:', e.message);
      }
    }
    
    // 4. SE ANCORA NON TROVATO, RESTITUISCI ERRORE
    if (!topic_id) {
      return new Response(
        `Post #${post_id} not found. Could not determine topic_id.`, 
        { status: 404 }
      );
    }
    
    // 5. SE IL POST NON ESISTEVA NEL DB, CREA UN RECORD TEMPORANEO
    if (!post) {
      post = {
        uid: null,
        topic_id: topic_id,
        board_id: 0,
        title: 'Post #' + post_id,
        username: null,
        collected_at: Date.now(),
        author_name: 'Unknown'
      };
    }
    
    // 6. RECUPERA QUOTE E MERITI
    const [quotes, merits] = await Promise.all([
      env.MERIT_DB.prepare(`SELECT quoted_uid, quoted_name, quoted_by_name FROM quote_events WHERE post_id = ?`).bind(post_id).all(),
      env.MERIT_DB.prepare(`SELECT amount, from_uid, to_uid FROM merit_events WHERE msg_id = ?`).bind(post_id).all()
    ]);
    
    // 7. MAPPA BOARD
    const boardNames = {
      1: 'Bitcoin Discussion', 28: 'Italian', 56: 'Gambling', 67: 'Altcoin Discussion',
      153: 'Guide (Italiano)', 228: 'Gambling discussion', 89: 'India', 9: 'Off-topic'
    };
    const boardName = boardNames[post.board_id] || `Board #${post.board_id}`;
    const postDate = post.collected_at ? new Date(post.collected_at).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }) : 'Unknown date';
    
    const btcLink = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;
    
    // 8. FETCH DEL BODY DEL POST
    let postBody = null;
    let fetchError = null;
    
    try {
      const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;
      const res = await fetch(postUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      if (res.ok) {
        const html = await res.text();
        
        // Cerca il post con l'ID specifico
        const msgId = `id="msg_${post_id}"`;
        const msgStart = html.indexOf(msgId);
        
        if (msgStart !== -1) {
          let start = html.lastIndexOf('<div', msgStart);
          if (start !== -1) {
            let depth = 1;
            let i = start + 4;
            while (i < html.length && depth > 0) {
              if (html.substr(i, 4) === '<div') depth++;
              if (html.substr(i, 6) === '</div>') depth--;
              i++;
            }
            postBody = html.substring(start, i);
          }
        } else {
          let divStart = html.indexOf('<div class="post">');
          if (divStart !== -1) {
            let depth = 1;
            let i = divStart + 18;
            while (i < html.length && depth > 0) {
              if (html.substr(i, 4) === '<div') depth++;
              if (html.substr(i, 6) === '</div>') depth--;
              i++;
            }
            postBody = html.substring(divStart + 18, i - 6);
          }
        }
        
        if (postBody) {
          postBody = postBody.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          postBody = postBody.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
        }
      } else {
        fetchError = `HTTP ${res.status}`;
      }
    } catch (err) {
      fetchError = err.message;
    }
    
    // 9. FUNZIONE ESCAPE HTML
    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
      });
    }
    
    // 10. GENERA HTML (lo stesso che avevi prima)
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(post.title || 'Post #' + post_id)} - BRDb</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',system-ui,sans-serif;background:#060a14;color:#e2e8f0;min-height:100vh}
    .bg-glow{position:fixed;top:0;left:0;right:0;bottom:0;overflow:hidden;z-index:0;pointer-events:none}
    .glow-1{position:absolute;top:-20%;left:-10%;width:60%;height:60%;background:radial-gradient(circle,#3b82f620 0%,transparent 70%);border-radius:50%;animation:float 20s ease-in-out infinite}
    .glow-2{position:absolute;bottom:-20%;right:-10%;width:50%;height:50%;background:radial-gradient(circle,#22c55e15 0%,transparent 70%);border-radius:50%;animation:float 25s ease-in-out infinite reverse}
    @keyframes float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(5%,5%) scale(1.05)}}
    .container{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:32px 24px}
    .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;flex-wrap:wrap;gap:16px}
    .back-btn{display:flex;align-items:center;gap:8px;color:#60a5fa;text-decoration:none;font-weight:500;font-size:14px;padding:10px 20px;background:rgba(15,23,42,0.6);backdrop-filter:blur(10px);border:1px solid rgba(96,165,250,0.3);border-radius:40px;transition:all .3s}
    .back-btn:hover{background:#1e293b;border-color:#60a5fa;transform:translateX(-4px)}
    h1{font-size:28px;font-weight:700;background:linear-gradient(135deg,#fff,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.5px}
    .post-card{background:rgba(12,18,30,0.8);backdrop-filter:blur(12px);border:1px solid rgba(56,189,248,0.15);border-radius:24px;padding:28px;margin-bottom:24px}
    .post-meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(56,189,248,0.1)}
    .author{display:flex;align-items:center;gap:8px}
    .author-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#a855f7);display:flex;align-items:center;justify-content:center;font-weight:bold}
    .author-name{font-weight:700;font-size:16px;color:#fff}
    .author-uid{font-size:11px;color:#475569;font-family:monospace}
    .post-date{font-size:12px;color:#64748b}
    .board-chip{background:rgba(30,41,59,0.8);padding:4px 12px;border-radius:20px;font-size:11px;color:#94a3b8}
    .post-title{font-size:22px;font-weight:700;margin-bottom:20px;color:#fbbf24}
    .post-content{font-size:15px;line-height:1.6;color:#cbd5e1;white-space:pre-wrap;word-break:break-word}
    .post-content .quoteheader{color:#a855f7;font-size:13px;margin:12px 0 6px}
    .post-content .quote{background:rgba(0,0,0,0.3);border-left:3px solid #a855f7;padding:10px 14px;margin:8px 0;border-radius:8px}
    .post-content .bbc_img{max-width:100%;height:auto;border-radius:8px;margin:8px 0}
    .post-content a{color:#60a5fa;text-decoration:none}
    .post-content a:hover{text-decoration:underline}
    .error-message{color:#ef4444;text-align:center;padding:30px}
    .error-message a{color:#3b82f6}
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px}
    .stat-card{background:rgba(15,23,42,0.6);border:1px solid rgba(96,165,250,0.15);border-radius:16px;padding:14px;text-align:center}
    .stat-value{font-size:24px;font-weight:800;font-family:monospace}
    .stat-label{font-size:10px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:1px}
    .quotes-list{background:rgba(0,0,0,0.2);border-radius:16px;padding:16px;margin-top:16px}
    .quotes-title{font-size:12px;font-weight:600;color:#a855f7;margin-bottom:10px;letter-spacing:1px}
    .quote-item{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
    .quote-badge{background:#a855f720;padding:2px 8px;border-radius:20px;font-size:11px;color:#c084fc}
    .merit-list{background:rgba(0,0,0,0.2);border-radius:16px;padding:16px;margin-top:16px}
    .merit-title{font-size:12px;font-weight:600;color:#22c55e;margin-bottom:10px;letter-spacing:1px}
    .merit-item{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
    .merit-badge{background:#22c55e20;padding:2px 8px;border-radius:20px;font-size:11px;color:#4ade80}
    .btc-link{display:inline-flex;align-items:center;gap:8px;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#fbbf24,#f59e0b);border-radius:40px;color:#0f172a;font-weight:700;text-decoration:none}
    .btc-link:hover{transform:scale(1.02)}
    .footer{text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid rgba(56,189,248,0.1);font-size:12px;color:#475569}
    @media(max-width:600px){.container{padding:20px 16px}.post-card{padding:20px}.post-title{font-size:18px}}
  </style>
</head>
<body>
<div class="bg-glow"><div class="glow-1"></div><div class="glow-2"></div></div>
<div class="container">
  <div class="header">
    <a href="javascript:history.back()" class="back-btn">← Back</a>
    <h1>📄 Post Details</h1>
    <div></div>
  </div>
  
  <div class="post-card">
    <div class="post-meta">
      <div class="author">
        <div class="author-avatar">${escapeHtml((post.author_name || 'U').charAt(0).toUpperCase())}</div>
        <div>
          <div class="author-name">${escapeHtml(post.author_name || 'Unknown')}</div>
          <div class="author-uid">UID: ${post.uid}</div>
        </div>
      </div>
      <div class="board-chip">📁 ${escapeHtml(boardName)}</div>
      <div class="post-date">📅 ${postDate}</div>
    </div>
    
    <div class="post-title">${escapeHtml(post.title || 'Untitled')}</div>
    
    <div id="post-content-area">
      ${postBody ? `<div class="post-content">${postBody}</div>` : 
        `<div class="error-message">❌ Failed to load post content: ${fetchError || 'Unknown error'}<br><br>
        <a href="${btcLink}" target="_blank" style="color:#3b82f6;display:inline-block">Open on Bitcointalk →</a></div>`}
    </div>
  </div>
  
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-value" style="color:#3b82f6">${topic_id || '—'}</div><div class="stat-label">Topic ID</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#60a5fa">${post_id}</div><div class="stat-label">Post ID</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#22c55e">${merits.results?.length || 0}</div><div class="stat-label">Merits</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#a855f7">${quotes.results?.length || 0}</div><div class="stat-label">Quotes</div></div>
  </div>
  
  ${quotes.results && quotes.results.length > 0 ? `
  <div class="quotes-list">
    <div class="quotes-title">💬 QUOTES IN THIS POST</div>
    ${quotes.results.map(q => `<div class="quote-item"><span class="quote-badge">Quoted</span><span>${escapeHtml(q.quoted_name)}</span><span style="color:#475569;font-size:11px">by ${escapeHtml(q.quoted_by_name)}</span></div>`).join('')}
  </div>
  ` : ''}
  
  ${merits.results && merits.results.length > 0 ? `
  <div class="merit-list">
    <div class="merit-title">⭐ MERITS ON THIS POST</div>
    ${merits.results.map(m => `<div class="merit-item"><span class="merit-badge">+${m.amount}</span><span>from UID ${m.from_uid} → to UID ${m.to_uid}</span></div>`).join('')}
  </div>
  ` : ''}
  
  <div style="text-align:center; margin-top:24px">
    <a href="${btcLink}" target="_blank" class="btc-link">🔗 View on Bitcointalk →</a>
  </div>
  
  <div class="footer"><span>✦ BRDb — Post Viewer ✦</span></div>
</div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
    
  } catch (err) {
    console.error('GET /post error:', err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}

    // ═══════════════════════════════════════════════════════════════
    // GET /debug?uid=X&secret=XXX — test scraping response for a uid
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/debug') {
      const secret = u.searchParams.get('secret');
      if (!secret || secret !== env.CRON_SECRET) return json({ error: 'Unauthorized' }, 401);
      const testUid = u.searchParams.get('uid');
      if (!testUid) return json({ error: 'Missing uid' }, 400);
      const today = new Date().toISOString().split('T')[0]; console.log(`[DEBUG] Server date: ${today}`);
      const dateMin120 = new Date(Date.now() - 120 * 86400000).toISOString().split('T')[0];
      const dateMinAll = '2010-01-01';
      const [res120, resAll] = await Promise.all([
        fetch(`// REMOVED: old API endpoint`, { headers: { 'X-API-KEY': APIkey } }),
        fetch(`// REMOVED: old API endpoint`, { headers: { 'X-API-KEY': APIkey } }),
      ]);
      return json({
        uid: testUid,
        status_120d: res120.status,
        status_alltime: resAll.status,
        body_120d: res120.ok ? await res120.json() : await res120.text(),
        body_alltime: resAll.ok ? await resAll.json() : await resAll.text(),
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // GET /debug-profile?uid=X — mostra scraping profilo Bitcointalk vs DB
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/debug-profile') {
      const testUid = u.searchParams.get('uid');
      if (!testUid) return json({ error: 'Missing uid' }, 400);
      
      try {
        // Scraping diretto del profilo Bitcointalk
        const profileRes = await fetch(`https://bitcointalk.org/index.php?action=profile;u=${testUid}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://bitcointalk.org/'
          }
        });
        
        let bitcointalkData = null;
        let scrapeError = null;
        
        if (profileRes.ok) {
          const profileHtml = await profileRes.text();
          bitcointalkData = parseBitcointalkProfile(profileHtml);
        } else {
          scrapeError = `HTTP ${profileRes.status}`;
        }
        
        // Dati dal DB user_profiles
        const dbProfile = await env.MERIT_DB.prepare(
          'SELECT * FROM user_profiles WHERE uid = ?'
        ).bind(testUid).first();
        
        // Dati dal DB brdb_users
        const dbBrdb = await env.brdb_users.prepare(
          'SELECT * FROM brdb_users WHERE uid = ?'
        ).bind(testUid).first();
        
        // Merit events recenti
        const recentMerits = await env.MERIT_DB.prepare(
          'SELECT * FROM merit_events WHERE to_uid = ? OR from_uid = ? ORDER BY timestamp DESC LIMIT 10'
        ).bind(testUid, testUid).all();
        
        return json({
          uid: testUid,
          bitcointalk_scraped: bitcointalkData,
          bitcointalk_error: scrapeError,
          db_user_profiles: dbProfile || null,
          db_brdb_users: dbBrdb || null,
          recent_merit_events: recentMerits.results || [],
          comparison: {
            bt_posts: bitcointalkData?.posts,
            db_posts_total: dbProfile?.posts_total,
            bt_merit: bitcointalkData?.meritTotal,
            db_merit_total: dbProfile?.merit_total,
            db_merit_received_120d: dbProfile?.merit_received_120d,
            db_merit_sent_120d: dbProfile?.merit_sent_120d,
            brdb_merit_total: dbBrdb?.merit_total,
            brdb_posts_total: dbBrdb?.posts_total
          }
        });
      } catch(err) {
        return json({ error: err.message, stack: err.stack });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════════════
    // GET /stats — quick stats for homepage
    if (request.method === 'GET' && path === '/stats') {
      try {
        const [total, avgRow, boards] = await Promise.all([
          env.brdb_users.prepare('SELECT COUNT(*) as c FROM brdb_users WHERE COALESCE(banned,0)=0').first(),
          env.brdb_users.prepare('SELECT AVG(BRDb) as avg FROM brdb_users WHERE COALESCE(banned,0)=0').first(),
          env.brdb_users.prepare('SELECT COUNT(DISTINCT local_board) as c FROM brdb_users WHERE local_board IS NOT NULL AND COALESCE(banned,0)=0').first(),
        ]);
        return json({ total_users: total.c, avg_brdb: avgRow.avg, local_boards_count: boards.c });
      } catch(err) { return json({ error: err.message }, 500); }
    }

    // GET / — Homepage with search
    if (request.method === 'GET' && path === '/' && !u.searchParams.get('user_id')) {
      return new Response(generateHomepageHTML(), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

    // GET /leaderboard-page — HTML leaderboard page
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/leaderboard-page') {
      return new Response(generateLeaderboardHTML(), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

    // GET /leaderboard — global leaderboard (existing, extended)
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/leaderboard') {
      try {
        const scoreKey = u.searchParams.get('sort') || 'BRDb';
        const limit = parseInt(u.searchParams.get('limit') || '9999') || 9999;
        const allowed = ['BRDb', 'Reputation', 'impact_all', 'posts_total', 'merit_total'];
        const col = allowed.includes(scoreKey) ? scoreKey : 'BRDb';

        const rows = await env.brdb_users.prepare(`
          SELECT uid, username, BRDb, Reputation, status, color,
                 posts_total, merit_total, posts120, merit120,
                 impact_all, local_board, updated_at
          FROM brdb_users
          WHERE COALESCE(banned, 0) = 0 AND COALESCE(posts_wiped, 0) = 0
          ORDER BY ${col} DESC, CAST(uid AS INTEGER) ASC
          LIMIT ?
        `).bind(limit).all();

        return json({ leaderboard: rows.results, sort: col, total: rows.results.length });
      } catch (err) {
        console.error('GET /leaderboard error:', err);
        return json({ error: err.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // GET /leaderboard/local?board=Italian&sort=BRDb&limit=50
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/leaderboard/local') {
      try {
        const board = u.searchParams.get('board');
        const scoreKey = u.searchParams.get('sort') || 'BRDb';
        const limit = parseInt(u.searchParams.get('limit') || '100') || 100;
        const allowed = ['BRDb', 'Reputation', 'impact_all', 'posts_total', 'merit_total'];
        const col = allowed.includes(scoreKey) ? scoreKey : 'BRDb';

        // No board → return all boards with top 10 each
        if (!board) {
          const boards = ['Italian','German','Spanish','French','Portuguese','Russian',
            'Turkish','Dutch','Polish','Romanian','Greek','Croatian','Mandarin','Japanese',
            'Korean','Arabic','Indonesian','Filipino','Nigerian','India','Scandinavian','Hebrew','Other languages/locations'];
          const result = {};
          for (const b of boards) {
            const rows = await env.brdb_users.prepare(`
              SELECT uid, username, BRDb, Reputation, status, color,
                     posts_total, merit_total, posts120, merit120,
                     impact_all, local_board
              FROM brdb_users
              WHERE local_board = ? AND COALESCE(banned, 0) = 0
              ORDER BY BRDb DESC
              LIMIT 10
            `).bind(b).all();
            if (rows.results.length > 0) result[b] = rows.results;
          }
          return json({ boards: result });
        }

        // Specific board
        const rows = await env.brdb_users.prepare(`
          SELECT uid, username, BRDb, Reputation, status, color,
                 posts_total, merit_total, posts120, merit120,
                 impact_all, impact_120, local_board, updated_at
          FROM brdb_users
          WHERE local_board = ? AND COALESCE(banned, 0) = 0 AND COALESCE(posts_wiped, 0) = 0
          ORDER BY ${col} DESC, CAST(uid AS INTEGER) ASC
          LIMIT ?
        `).bind(board, limit).all();

        return json({
          board,
          sort: col,
          total: rows.results.length,
          leaderboard: rows.results
        });
      } catch (err) {
        console.error('GET /leaderboard/local error:', err);
        return json({ error: err.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // GET /history?uid=X&limit=90  — BRDb history for a user
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/history') {
      try {
        const uid = u.searchParams.get('uid');
        const limit = parseInt(u.searchParams.get('limit') || '365') || 365;

        if (!uid) return json({ error: 'Missing uid' }, 400);

        const rows = await env.brdb_users.prepare(`
          SELECT snapshot_date, BRDb, Reputation,
                 posts_total, merit_total, scrape_type,
                 posts120, merit120, merits_sent120,
                 status, local_board
          FROM brdb_history
          WHERE uid = ?
          ORDER BY snapshot_date DESC
          LIMIT ?
        `).bind(uid, limit).all();

        return json({ uid, history: rows.results });
      } catch (err) {
        console.error('GET /history error:', err);
        return json({ error: err.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // GET /stats/detail — global database statistics
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/stats/detail') {
      try {
        const [total, byStatus, byBoard, indexStats, historyStats, avgBrdb] = await Promise.all([
          env.brdb_users.prepare('SELECT COUNT(*) as count FROM brdb_users').first(),
          env.brdb_users.prepare(`
            SELECT status, COUNT(*) as count FROM brdb_users
            GROUP BY status ORDER BY count DESC
          `).all(),
          env.brdb_users.prepare(`
            SELECT local_board as board, COUNT(*) as count FROM brdb_users
            WHERE local_board IS NOT NULL
            GROUP BY local_board ORDER BY count DESC
            LIMIT 15
          `).all(),
          env.brdb_users.prepare(`
            SELECT
              COUNT(*) as total,
              SUM(CASE WHEN last_scraped IS NULL THEN 1 ELSE 0 END) as never_scraped,
              SUM(CASE WHEN last_scraped IS NULL OR last_scraped < ? THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN last_scraped >= ? THEN 1 ELSE 0 END) as scraped_24h,
              MIN(last_scraped) as oldest_scrape,
              MAX(last_scraped) as newest_scrape
            FROM users_index
            WHERE uid != '__cron_counter__'
          `).bind(Date.now() - 24*60*60*1000, Date.now() - 24*60*60*1000).first(),
          env.brdb_users.prepare(`
            SELECT COUNT(*) as snapshots,
                   COUNT(DISTINCT uid) as users,
                   MIN(snapshot_date) as oldest,
                   MAX(snapshot_date) as newest
            FROM brdb_history
          `).first(),
          env.brdb_users.prepare('SELECT AVG(BRDb) as avg FROM brdb_users WHERE COALESCE(banned,0)=0').first(),
        ]);

        return json({
          brdb_users: {
            total: total.count,
            avg_brdb: avgBrdb?.avg || 0,
            by_status: byStatus.results,
            by_local_board: byBoard.results
          },
          users_index: {
            ...indexStats,
            cycle_hours: indexStats.oldest_scrape
              ? ((Date.now() - indexStats.oldest_scrape) / 3600000).toFixed(1)
              : null
          },
          history: historyStats
        });
      } catch (err) {
        console.error('GET /stats error:', err);
        return json({ error: err.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // GET /users-index/pending?limit=50 — users not yet scraped today
    // Used by external scrapers or manual triggers
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/users-index/pending') {
      try {
        const limit = parseInt(u.searchParams.get('limit') || '50') || 50;
        const today = new Date().toISOString().split('T')[0]; console.log(`[DEBUG] Server date: ${today}`);

        const rows = await env.brdb_users.prepare(`
          SELECT uid, username FROM users_index
          WHERE last_scraped IS NULL
             OR last_scraped < ?
          ORDER BY last_scraped ASC NULLS FIRST
          LIMIT ?
        `).bind(Date.now() - 7 * 24 * 60 * 60 * 1000, limit).all();

        return json({ pending: rows.results, count: rows.results.length });
      } catch (err) {
        console.error('GET /users-index/pending error:', err);
        return json({ error: err.message }, 500);
      }
    }


        // ═══════════════════════════════════════════════════════════════
    // GET /test-quotes?uid=X — Debug per testare i quote
    // ═══════════════════════════════════════════════════════════════
    if (request.method === 'GET' && path === '/test-quotes' && u.searchParams.get('uid')) {
  const uid = u.searchParams.get('uid');
  
  // URL hardcoded per test
  const POST_SCRAPER_URL = 'https://post-scraper.ace-d89.workers.dev';
  
  try {
    const quotesRes = await fetch(`${POST_SCRAPER_URL}/quotes-for-user?uid=${uid}`);
    const quotesData = await quotesRes.json();
    
    return json({
      success: true,
      post_scraper_url: POST_SCRAPER_URL,
      quotes_from_scraper: quotesData,
      quotes_count: quotesData.quotes?.length || 0
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

        // ═══════════════════════════════════════════════════════════════
    // GET /user?uid=X — single user from D1
    // ═══════════════════════════════════════════════════════════════
    
if (request.method === 'GET' && path === '/user') {
  const uid = u.searchParams.get('uid');
  if (!uid) return json({ error: 'Missing uid' }, 400);
  
  const row = await env.MERIT_DB.prepare(
    'SELECT * FROM user_profiles WHERE uid = ?'
  ).bind(uid).first();
  
  if (!row) return json({ found: false }, 404);
  
  // Prendi anche BRDb e score da brdb_users
  const brdbRow = await env.brdb_users.prepare(
    'SELECT BRDb, Reputation, status, color, impact_all, impact_120, posts120, merit120, merits_sent120, avg_all, avg_120, active_days120, consistency_score, recent_merit_ratio, recent_post_ratio, merit_rate_multiplier, post_rate_multiplier, recent_merit_rate, historical_merit_rate, recent_post_rate, historical_post_rate, merit_sent_received_ratio, Reliability FROM brdb_users WHERE uid = ?'
  ).bind(uid).first();
  
  const merged = {
    ...row,
    BRDb: brdbRow?.BRDb || 0,
    Reputation: brdbRow?.Reputation || 0,
    status: brdbRow?.status || 'Active',
    color: brdbRow?.color || '#22c55e',
    impact_all: brdbRow?.impact_all || 0,
    impact_120: brdbRow?.impact_120 || 0,
    posts120: row?.posts_120d || brdbRow?.posts120 || 0,
    merit120: row?.merit_received_120d || brdbRow?.merit120 || 0,
    merits_sent120: row?.merit_sent_120d || brdbRow?.merits_sent120 || 0,
    avg_all: brdbRow?.avg_all || 0,
    avg_120: brdbRow?.avg_120 || 0,
    active_days120: brdbRow?.active_days120 || 0,
    consistency_score: brdbRow?.consistency_score || 0,
    recent_merit_ratio: brdbRow?.recent_merit_ratio || 0,
    recent_post_ratio: brdbRow?.recent_post_ratio || 0,
    merit_rate_multiplier: brdbRow?.merit_rate_multiplier || 0,
    post_rate_multiplier: brdbRow?.post_rate_multiplier || 0,
    recent_merit_rate: brdbRow?.recent_merit_rate || 0,
    historical_merit_rate: brdbRow?.historical_merit_rate || 0,
    recent_post_rate: brdbRow?.recent_post_rate || 0,
    historical_post_rate: brdbRow?.historical_post_rate || 0,
    merit_sent_received_ratio: brdbRow?.merit_sent_received_ratio || 0,
    Reliability: brdbRow?.Reliability || 0,
  };
  
  return json({ found: true, data: merged });
}

    // ═══════════════════════════════════════════════════════════════
    // GET / — original endpoint REMOVED
    // Extended to also detect local_board from post history
    // ═══════════════════════════════════════════════════════════════
    if (!APIkey) {
      return new Response('API key not found', { status: 500 });
    }

    const userId  = u.searchParams.get('user_id');
    const dateMin = u.searchParams.get('date_min');
    const dateMax = u.searchParams.get('date_max');
    const interval = u.searchParams.get('interval') || 'day';
    const format   = u.searchParams.get('format');

    if (!userId || !dateMin || !dateMax) {
      return new Response('Missing params: user_id, date_min, date_max', { status: 400 });
    }

    try {
      // Chiama la funzione condivisa (stessa usata dal cron)
      const responseData = await scrapeUser(userId, dateMin, dateMax, APIkey, interval);
      const profileData = responseData.bitcointalk;
      const avatarBase64 = responseData.avatar.base64;
      const avatarMime = responseData.avatar.mime;

      if (format === 'json') {
        return new Response(JSON.stringify(responseData, null, 2), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }

      // HTML response
      const username = responseData.user?.author || profileData.name || userId;
      const localBoard = responseData.local_board;
      const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Statistiche utente ${username}</title>
  <style>
    body { font-family: Arial; padding: 20px; background: #f5f5f5; }
    .user-card { background: #fff; padding: 20px; border-radius: 10px; display: inline-block; }
    img { border-radius: 50%; width: 150px; height: 150px; }
    h1 { margin-top: 0; }
    .local-board { display: inline-block; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="user-card">
    ${avatarBase64 ? `<img src="data:${avatarMime};base64,${avatarBase64}" alt="Avatar">` : ''}
    <h1>${username}</h1>
    <p>UID: ${userId}</p>
    ${localBoard ? `<span class="local-board">🌍 ${localBoard}</span>` : ''}
    <div style="margin-top:15px">
      <p>Post totali: ${profileData.posts || 'N/D'}</p>
      <p>Merit totali: ${profileData.meritTotal || 'N/D'}</p>
      <p>Data registrazione: ${profileData.regDate || 'N/D'}</p>
      <p>Ultima attività: ${profileData.lastActive || 'N/D'}</p>
    </div>
  </div>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: { ...cors, 'Content-Type': 'text/html' }
      });

    } catch (err) {
      console.error('Worker error:', err);
      return new Response('Errore: ' + err.message, { status: 500, headers: cors });
    }
    } catch (outerErr) {
      console.error('UNHANDLED fetch error:', outerErr.stack || outerErr.message);
      return new Response(JSON.stringify({ error: outerErr.message, stack: outerErr.stack }), {
        status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// FULL scrape REMOVED
// Used by GET / handler (userscript requests)
// ═══════════════════════════════════════════════════════════════
async function scrapeUser(userId, dateMin, dateMax, APIkey, interval = 'day') {
  // 1 REMOVED
  const headers120 = { 'X-API-KEY': APIkey, 'Accept': 'application/json' };
  const [res120, resAll] = await Promise.all([
    fetch(`// REMOVED: old API endpoint`, { headers: headers120 }),
    fetch(`// REMOVED: old API endpoint`, { headers: headers120 }),
  ]);

  // resAll deve essere ok per avere totali affidabili
  if (!resAll.ok) {
    const skip = resAll.status === 404 || resAll.status === 403;
    throw new Error(`${skip ? 'SKIP:' : ''}Bitcointalk alltime HTTP ${resAll.status} for uid ${userId}`);
  }
  const overviewAll = await resAll.json();

  // 120gg: usa i dati se disponibili, altrimenti filtra alltime per gli ultimi 120gg
  // (REMOVED)
  let posts_hist_120, merits_recv_hist_120, merits_sent_hist_120;
  if (res120.ok) {
    const overview120 = await res120.json();
    posts_hist_120       = overview120.posts_histogram || [];
    merits_recv_hist_120 = overview120.merits_received_histogram || [];
    merits_sent_hist_120 = overview120.merits_sent_histogram || [];
  } else {
    // Filtra l'histogram alltime per gli ultimi 120gg
    const cutoff = new Date(Date.now() - 120 * 86400000);
    posts_hist_120       = (overviewAll.posts_histogram || []).filter(d => new Date(d.date) >= cutoff);
    merits_recv_hist_120 = (overviewAll.merits_received_histogram || []).filter(d => new Date(d.date) >= cutoff);
    merits_sent_hist_120 = (overviewAll.merits_sent_histogram || []).filter(d => new Date(d.date) >= cutoff);
  }

  // Merge: totali dall'alltime, istogrammi 120gg corretti
  const overviewData = {
    ...overviewAll,
    posts_histogram: posts_hist_120,
    merits_received_histogram: merits_recv_hist_120,
    merits_sent_histogram: merits_sent_hist_120,
    merits_sent_count: overviewAll.merits_sent_count,
    merits_received_count: overviewAll.merits_received_count,
  };

  // 2 REMOVED
  const avatarRes = await fetch(`// REMOVED: old API endpoint`, {
    headers: { 'x-api-key': APIkey, 'Accept': '*/*' }
  });
  let avatarBase64 = '', avatarMime = 'image/png';
  if (avatarRes.ok) {
    const bytes = new Uint8Array(await avatarRes.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    avatarBase64 = btoa(binary);
    avatarMime = avatarRes.headers.get('content-type') || 'image/png';
  }

  // 3 Bitcointalk profile
  const profileRes = await fetch(`https://bitcointalk.org/index.php?action=profile;u=${userId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://bitcointalk.org/'
    }
  });
  if (!profileRes.ok) throw new Error(`Bitcointalk HTTP ${profileRes.status} for uid ${userId}`);
  const profileHtml = await profileRes.text();
  const profileData = parseBitcointalkProfile(profileHtml);

  // 4 Detect local board (best effort)
  let localBoard = null;
  try {
    const username = overviewData?.user?.author;
    if (username) {
      const postsRes = await fetch(
        `// REMOVED: old API endpoint`,
        { headers: { 'X-API-KEY': APIkey, 'Accept': 'application/json' } }
      );
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        localBoard = detectLocalBoard(postsData.posts || []);
      }
    }
  } catch (_) { /* best-effort */ }

  return {
    user: overviewData.user,
    posts_count: overviewData.posts_count,
    merits_received_count: overviewData.merits_received_count,
    merits_sent_count: overviewAll.merits_sent_count || 0,
    posts_histogram: overviewData.posts_histogram,
    merits_received_histogram: overviewData.merits_received_histogram,
    merits_sent_histogram: overviewData.merits_sent_histogram,
    avatar: { base64: avatarBase64, mime: avatarMime },
    bitcointalk: profileData,
    local_board: localBoard,
    top_boards: detectedTopBoards,
  };
}

// ═══════════════════════════════════════════════════════════════
// LIGHT scrape REMOVED
// Usata dal cron — niente avatar, local board solo se mancante
// 2 chiamate per utente invece di 4 → rispetta limite 50 subreq
// ═══════════════════════════════════════════════════════════════
async function cronScrapeUser(userId, dateMin, dateMax, APIkey, existingLocalBoard, lastSync = null, syncRow = null) {
  // 1 REMOVED
  const overviewUrl = `// REMOVED: old API endpoint`;
  let overviewRes = await fetch(overviewUrl, {
    headers: { 'X-API-KEY': APIkey, 'Accept': 'application/json' }
  });
  // Se 404 sul range 120gg, fetcha alltime in parallelo e filtra per 120gg
  let overviewAll, posts_hist_120, merits_recv_hist_120, merits_sent_hist_120;
  if (overviewRes.status === 404) {
    console.log(`[Cron] uid ${userId} no posts in 120d, fetching alltime and filtering...`);
    const resAll = await fetch(
      `// REMOVED: old API endpoint`,
      { headers: { 'X-API-KEY': APIkey, 'Accept': 'application/json' } }
    );
    if (!resAll.ok) {
      const skip = resAll.status === 404 || resAll.status === 403;
      throw new Error(`${skip ? 'SKIP:' : ''}Bitcointalk alltime HTTP ${resAll.status}`);
    }
    overviewAll = await resAll.json();
    const cutoff = new Date(Date.now() - 120 * 86400000);
    posts_hist_120       = (overviewAll.posts_histogram || []).filter(d => new Date(d.date) >= cutoff);
    merits_recv_hist_120 = (overviewAll.merits_received_histogram || []).filter(d => new Date(d.date) >= cutoff);
    merits_sent_hist_120 = (overviewAll.merits_sent_histogram || []).filter(d => new Date(d.date) >= cutoff);
  } else if (overviewRes.ok) {
    const overview120 = await overviewRes.json();
    posts_hist_120       = overview120.posts_histogram || [];
    merits_recv_hist_120 = overview120.merits_received_histogram || [];
    merits_sent_hist_120 = overview120.merits_sent_histogram || [];

    if (lastSync && syncRow?.merit_total > 0) {
      // Approccio incrementale: fetch solo dal lastSync ad oggi
      const resDelta = await fetch(
        `// REMOVED: old API endpoint`,
        { headers: { 'X-API-KEY': APIkey, 'Accept': 'application/json' } }
      );
      if (resDelta.ok) {
        const delta = await resDelta.json();
        // Somma il delta ai totali esistenti nel DB
        const deltaRecv = delta.merits_received_count || 0;
        const deltaSent = delta.merits_sent_count || 0;
        const deltaPosts = delta.posts_count || 0;
        overviewAll = {
          merits_received_count: (syncRow.merit_total || 0) + deltaRecv,
          merits_sent_count:     (syncRow.merits_sent_total || 0) + deltaSent,
          posts_count:           (syncRow.posts_total || 0) + deltaPosts,
        };
        console.log(`[Cron] uid ${userId} incremental: +${deltaRecv} recv +${deltaSent} sent +${deltaPosts} posts since ${lastSync}`);
      } else {
        // Fallback alltime se delta fallisce
        const resAlltime = await fetch(
          `// REMOVED: old API endpoint`,
          { headers: { 'X-API-KEY': APIkey, 'Accept': 'application/json' } }
        );
        overviewAll = resAlltime.ok ? await resAlltime.json() : overview120;
      }
    } else {
      // Prima scrape: fetch alltime completo
      const resAlltime = await fetch(
        `// REMOVED: old API endpoint`,
        { headers: { 'X-API-KEY': APIkey, 'Accept': 'application/json' } }
      );
      overviewAll = resAlltime.ok ? await resAlltime.json() : overview120;
    }
  } else {
    const skip = overviewRes.status === 404 || overviewRes.status === 403;
    throw new Error(`${skip ? 'SKIP:' : ''}Bitcointalk HTTP ${overviewRes.status}`);
  }
  const overviewData = {
    ...overviewAll,
    posts_histogram: posts_hist_120,
    merits_received_histogram: merits_recv_hist_120,
    merits_sent_histogram: merits_sent_hist_120,
    merits_sent_count: overviewAll.merits_sent_count,
    merits_received_count: overviewAll.merits_received_count,
  };

  // 2 Bitcointalk profile — non-fatale se down
  let profileData = {};
  try {
    const profileRes = await fetch(`https://bitcointalk.org/index.php?action=profile;u=${userId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://bitcointalk.org/'
      }
    });
    if (profileRes.ok) {
      const profileHtml = await profileRes.text();
      profileData = parseBitcointalkProfile(profileHtml);
    } else {
      console.warn(`[Cron] Bitcointalk HTTP ${profileRes.status} for uid ${userId} — using existing DB data`);
      profileData = { bitcointalkDown: true };
    }
  } catch (e) {
    console.warn(`[Cron] Bitcointalk fetch error for uid ${userId}: ${e.message} — using existing DB data`);
    profileData = { bitcointalkDown: true };
  }

  // 3 Local board solo se non già noto (risparmia 1 chiamata per utente già classificato)
  let localBoard = existingLocalBoard || null;
  let detectedTopBoards = [];

  // Sempre detecta boards per top_boards — assegna national solo se non già noto
  try {
    const username = overviewData?.user?.author;
    if (username) {
      const postsRes = await fetch(
        `// REMOVED: old API endpoint`,
        { headers: { 'X-API-KEY': APIkey, 'Accept': 'application/json' } }
      );
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        const detected = detectBoards(postsData.posts || []);
        // Aggiorna se: non c'è local_board, oppure quella esistente non è una national board valida
        const validNationals = new Set(['Italian','German','Spanish','French','Portuguese','Russian','Turkish','Dutch','Polish','Romanian','Greek','Croatian','Mandarin','Japanese','Korean','Arabic','Indonesian','Filipino','Nigerian','India','Scandinavian','Hebrew','Other languages/locations']);
        if (!localBoard || !validNationals.has(localBoard)) localBoard = detected.national;
        detectedTopBoards = detected.topBoards;
      }
    }
  } catch (_) { /* best-effort */ }

  return {
    user: overviewData.user,
    posts_count: overviewAll ? (overviewAll.posts_count || 0) : 0,
    merits_received_count: overviewAll ? (overviewAll.merits_received_count || 0) : 0,
    merits_sent_count: overviewAll ? (overviewAll.merits_sent_count || 0) : 0,
    posts_histogram: overviewData.posts_histogram || [],
    merits_received_histogram: overviewData.merits_received_histogram || [],
    merits_sent_histogram: overviewData.merits_sent_histogram || [],
    bitcointalk: profileData,
    local_board: localBoard,
    top_boards: detectedTopBoards,
    incremental: (lastSync && syncRow?.merit_total > 0) ? true : false,
  };
}

// ═══════════════════════════════════════════════════════════════
// scrapeAndSave: scrape 1 user and persist to D1
// Shared by single-user cron and batch cron
// ═══════════════════════════════════════════════════════════════
async function scrapeAndSave(user, dateMin120, today, APIkey, env) {
  // Leggi last_scraped per approccio incrementale
  const syncRow = await env.brdb_users.prepare(
    'SELECT last_scraped, merit_total, posts_total, merits_sent_total FROM brdb_users WHERE uid = ?'
  ).bind(user.uid).first();
  const lastSync = syncRow?.last_scraped
    ? new Date(syncRow.last_scraped).toISOString().split('T')[0]
    : null;

  const data = await cronScrapeUser(user.uid, dateMin120, today, APIkey, user.local_board, lastSync, syncRow);
  const profileData = data.bitcointalk || {};
  // Se Bitcointalk era down, recupera posts/merit dal DB esistente
  let postsTotal, existingRow = null;
  if (profileData.bitcointalkDown) {
    const existing = await env.brdb_users.prepare(
      'SELECT posts_total, merit_total, merits_sent_total, reg_date, last_active FROM brdb_users WHERE uid = ?'
    ).bind(user.uid).first();
    existingRow = existing;
    postsTotal = existing?.posts_total || 0;
    console.log(`[Cron] uid ${user.uid} using cached posts=${postsTotal} (Bitcointalk down)`);
  } else {
    postsTotal = profileData.posts || 0;
    console.log(`[Cron] uid ${user.uid} scraped posts=${postsTotal} from Bitcointalk`);
  }
  
  // CALCOLO MERIT TOTALI DA merit_events (SEMPRE, per entrambi gli utenti)
  const meritReceivedResult = await env.MERIT_DB.prepare(
    'SELECT SUM(amount) as total FROM merit_events WHERE to_uid = ?'
  ).bind(user.uid).first();
  const meritTotal = meritReceivedResult?.total || 0;
  
  const meritSentResult = await env.MERIT_DB.prepare(
    'SELECT SUM(amount) as total FROM merit_events WHERE from_uid = ?'
  ).bind(user.uid).first();
  const meritsSentTotal = meritSentResult?.total || 0;
  
  console.log(`[Cron] uid ${user.uid} calculated merit_total=${meritTotal}, merits_sent_total=${meritsSentTotal} from merit_events`);
  // Usa merit_earned (da Loyce) se disponibile, altrimenti merit_total
  // merit_earned esclude gli airdrop del 2017 che falsavano i calcoli
  const existingMeritEarned = user.merit_earned != null ? user.merit_earned : null;
  const meritForCalc = existingMeritEarned != null ? existingMeritEarned : meritTotal;
  const regDate     = profileData.regDate ? new Date(profileData.regDate)
                    : (existingRow?.reg_date ? new Date(existingRow.reg_date) : null);
  const lastActive  = profileData.lastActive ? new Date(profileData.lastActive)
                    : (existingRow?.last_active ? new Date(existingRow.last_active) : null);

  const postsHist      = data.posts_histogram || [];
  const meritsHist     = data.merits_received_histogram || [];
  const sentHist       = data.merits_sent_histogram || [];
  const posts120       = postsHist.reduce((s, d) => s + (d.count || 0), 0);
  const merit120       = meritsHist.reduce((s, d) => s + (d.count || 0), 0);
  const merits_sent120 = sentHist.reduce((s, d) => s + (d.count || 0), 0);

  const postsArr = postsHist.map(d => d.count || 0);
  const scores = calculateScores(postsTotal, meritForCalc, posts120, merit120, postsArr, regDate, lastActive, merits_sent120);
  const BRDb = calcBRDb(scores.Reputation, merit120, posts120, scores.badgeFormer, scores.isHistoricalUser, lastActive, meritForCalc);
  const status = statusLabel(scores.promising, scores.badgeDormant, scores.badgeFormer, scores.badgeReactivated, scores.isHistoricalUser);

  const now = Date.now();
  const localBoard = data.local_board || null;
  const topBoards = data.top_boards && data.top_boards.length ? JSON.stringify(data.top_boards) : null;
  const uid = user.uid;
  const username = data.user?.author || user.username || null;
// ═══════════════════════════════════════════════════════════════
// SINCRONIZZA MERIT_DB (per la pagina HTML)
// ═══════════════════════════════════════════════════════════════
try {
  await env.MERIT_DB.prepare(`
    INSERT OR REPLACE INTO user_profiles (
      uid, username, posts_total, merit_total, reg_date, last_active, updated_at,
      posts_120d, merit_received_120d, merit_sent_120d
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    uid, username, postsTotal, meritTotal,
    profileData.regDate || null, profileData.lastActive || null, now,
    posts120, merit120, merits_sent120
  ).run();
  console.log(`[Sync] MERIT_DB aggiornato per uid ${uid}`);
} catch(e) {
  console.log(`[Sync] MERIT_DB fallito per ${uid}:`, e.message);
}
  await env.brdb_users.prepare(`
    INSERT INTO brdb_users (
      uid, username, BRDb, status, color,
      Reputation, Reliability,
      posts120, merit120, merits_sent120,
      avg_all, avg_120, impact_all, impact_120,
      active_days120, consistency_score,
      recent_merit_ratio, recent_post_ratio,
      merit_rate_multiplier, post_rate_multiplier,
      recent_merit_rate, historical_merit_rate,
      recent_post_rate, historical_post_rate,
      merit_sent_received_ratio,
      posts_total, merit_total, merits_sent_total, reg_date, last_active, local_board, top_boards,
      updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(uid) DO UPDATE SET
      username=excluded.username, BRDb=excluded.BRDb,
      status=CASE WHEN brdb_users.banned=1 THEN 'Banned' ELSE excluded.status END,
      color=CASE WHEN brdb_users.banned=1 THEN '#7f1d1d' ELSE excluded.color END,
      Reputation=excluded.Reputation, Reliability=excluded.Reliability,
      posts120=excluded.posts120, merit120=excluded.merit120, merits_sent120=excluded.merits_sent120,
      avg_all=excluded.avg_all, avg_120=excluded.avg_120,
      impact_all=excluded.impact_all, impact_120=excluded.impact_120,
      active_days120=excluded.active_days120, consistency_score=excluded.consistency_score,
      recent_merit_ratio=excluded.recent_merit_ratio, recent_post_ratio=excluded.recent_post_ratio,
      merit_rate_multiplier=excluded.merit_rate_multiplier, post_rate_multiplier=excluded.post_rate_multiplier,
      recent_merit_rate=excluded.recent_merit_rate, historical_merit_rate=excluded.historical_merit_rate,
      recent_post_rate=excluded.recent_post_rate, historical_post_rate=excluded.historical_post_rate,
      merit_sent_received_ratio=excluded.merit_sent_received_ratio,
      posts_total=excluded.posts_total, merit_total=excluded.merit_total,
      merits_sent_total=excluded.merits_sent_total,
      reg_date=COALESCE(excluded.reg_date, brdb_users.reg_date),
      last_active=COALESCE(excluded.last_active, brdb_users.last_active),
      local_board=COALESCE(excluded.local_board, brdb_users.local_board),
      top_boards=COALESCE(excluded.top_boards, brdb_users.top_boards),
      updated_at=excluded.updated_at
  `).bind(
    user.uid, username, BRDb, status, statusColor(status),
    scores.Reputation, scores.Reliability,
    posts120, merit120, merits_sent120,
    postsTotal > 0 ? meritTotal / postsTotal : 0,
    posts120 > 0 ? merit120 / posts120 : 0,
    meritTotal * 1.5 + postsTotal * 0.5,
    merit120 * 1.5 + posts120 * 0.5,
    scores.activeDays120, scores.consistencyScore,
    scores.recentMeritRatio, scores.recentPostRatio,
    scores.meritRateMultiplier, scores.postRateMultiplier,
    scores.recentMeritRate, scores.historicalMeritRate,
    scores.recentPostRate, scores.historicalPostRate,
    scores.meritSentReceivedRatio,
    postsTotal, meritTotal, meritsSentTotal,
    profileData.regDate || null,
    profileData.lastActive || null,
    localBoard, topBoards, now
  ).run();

  await env.brdb_users.prepare(`
    INSERT OR IGNORE INTO brdb_history (
      uid, username, snapshot_date,
      BRDb, Reputation, posts_total, merit_total,
      posts120, merit120, merits_sent120, status, local_board, scrape_type
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(user.uid, username, today, BRDb, scores.Reputation, postsTotal, meritTotal,
    posts120, merit120, merits_sent120, status, localBoard, data.incremental ? 'incremental' : 'full').run();

  // ═══════════════════════════════════════════════════════════════
  // SALVATAGGIO SNAPSHOT GIORNALIERO AUTOMATICO
  // ═══════════════════════════════════════════════════════════════
  const _snapshotTodayStr = new Date().toISOString().split('T')[0];
  const _existingSnapshotToday = await env.brdb_users.prepare(
    'SELECT id FROM brdb_history WHERE uid = ? AND snapshot_date = ?'
  ).bind(uid, _snapshotTodayStr).first();
  
  if (!_existingSnapshotToday) {
    await env.brdb_users.prepare(`
      INSERT OR IGNORE INTO brdb_history (
        uid, username, snapshot_date,
        BRDb, Reputation,
        posts_total, merit_total,
        posts120, merit120, merits_sent120,
        status, local_board, scrape_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      uid, username, _snapshotTodayStr,
      BRDb, scores.Reputation,
      postsTotal, meritTotal,
      posts120, merit120, merits_sent120,
      status, localBoard, 'auto_snapshot'
    ).run();
    console.log(`[Snapshot] Auto-snapshot per ${uid} al ${_snapshotTodayStr}, BRDb=${BRDb}`);
  }



  // Salva last_scraped
  await env.brdb_users.prepare("UPDATE brdb_users SET last_scraped = ? WHERE uid = ?")
    .bind(now, user.uid).run();
  await env.brdb_users.prepare(
    'UPDATE users_index SET last_scraped = ?, username = ?, local_board = COALESCE(?, local_board) WHERE uid = ?'
  ).bind(now, username, localBoard, user.uid).run();
}

// ═══════════════════════════════════════════════════════════════
// CRON SINGLE: Process exactly 1 user per invocation
// Cron trigger ogni minuto = ~1440 utenti/giorno
// ═══════════════════════════════════════════════════════════════
async function runSingleUserScrape(env) {
  // REMOVED: Bitcointalk scraping code
  console.log('[Cron] APIkey present:', !!APIkey, '| length:', APIkey?.length || 0);
  if (!APIkey) { console.error('[Cron] Missing API key'); return; }

  const today = new Date().toISOString().split('T')[0]; console.log(`[DEBUG] Server date: ${today}`);
  const dateMin120 = new Date(Date.now() - 120 * 86400000).toISOString().split('T')[0];
  const threshold24h = 0; // Accetta tutti, esaurisci la coda

  // Pick the single oldest-scraped user
  const row = await env.brdb_users.prepare(`
    SELECT u.uid, u.username, u.local_board FROM users_index u
    WHERE u.last_scraped IS NULL
       OR u.last_scraped < ?
    ORDER BY u.last_scraped ASC NULLS FIRST
    LIMIT 1
  `).bind(threshold24h).first();

  if (!row) {
    // Coda esaurita! Resetta tutti per il nuovo ciclo
    await env.brdb_users.prepare("UPDATE users_index SET last_scraped = NULL WHERE uid != '__cron_counter__' AND last_scraped IS NOT NULL").run();
    console.log('[Cron] Queue exhausted, reset for new cycle');
    console.log('[Cron] All users up to date, nothing to scrape');
    return;
  }

  console.log(`[Cron] Scraping uid ${row.uid} (${row.username})`);
  try {
    await scrapeAndSave(row, dateMin120, today, APIkey, env);
    console.log(`[Cron] Done uid ${row.uid}`);
  } catch (err) {
    if (err.message.startsWith('SKIP:')) {
      // Utente non trovato — scraping BT profile
      console.warn(`[Cron] Skipping uid ${row.uid}: ${err.message} — scraping BT profile anyway`);
      try {
        const btUrl = `https://bitcointalk.org/index.php?action=profile;u=${row.uid}`;
        const btRes = await fetch(btUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (btRes.ok) {
          const html = await btRes.text();
          const profileData = parseProfileHtml(html);
          if (profileData.regDate || profileData.postsTotal) {
            await env.brdb_users.prepare(
              `INSERT INTO brdb_users (uid, username, reg_date, posts_total, position, last_scraped)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(uid) DO UPDATE SET
                 reg_date = COALESCE(excluded.reg_date, reg_date),
                 posts_total = COALESCE(excluded.posts_total, posts_total),
                 position = COALESCE(excluded.position, position),
                 last_scraped = excluded.last_scraped`
            ).bind(row.uid, row.username, profileData.regDate || null, profileData.postsTotal || 0, profileData.position || null, Date.now()).run();
          }
        }
      } catch(btErr) {
        console.warn(`[Cron] BT profile scrape also failed for uid ${row.uid}: ${btErr.message}`);
      }
      await env.brdb_users.prepare(
        'UPDATE users_index SET last_scraped = ?, scrape_failed = scrape_failed + 1 WHERE uid = ?'
      ).bind(Date.now(), row.uid).run();
    } else {
      console.error(`[Cron] Failed uid ${row.uid}:`, err.message);
      await env.brdb_users.prepare(
        'UPDATE users_index SET scrape_failed = scrape_failed + 1 WHERE uid = ?'
      ).bind(row.uid).run();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CRON BATCH (legacy / paid plan): scrape N users in one go
// ═══════════════════════════════════════════════════════════════
async function runDailyScrape(env) {
  // REMOVED: Bitcointalk scraping code
  console.log('[Cron] APIkey present:', !!APIkey, '| length:', APIkey?.length || 0);
  if (!APIkey) { console.error('[Cron] Missing API key'); return; }

  const today = new Date().toISOString().split('T')[0]; console.log(`[DEBUG] Server date: ${today}`);
  const dateMin120 = new Date(Date.now() - 120 * 86400000).toISOString().split('T')[0];

  console.log(`[Cron] Scraping for ${today}`);

  // Get all users not yet scraped today
  const pending = await env.brdb_users.prepare(`
    SELECT u.uid, u.username, u.local_board, b.merit_earned
    FROM users_index u
    LEFT JOIN brdb_users b ON b.uid = u.uid
    WHERE u.last_scraped IS NULL
       OR u.last_scraped < ?
    ORDER BY u.last_scraped ASC NULLS FIRST
    LIMIT 20
  `).bind(Date.now() - 7 * 24 * 60 * 60 * 1000).all();

  const users = pending.results;
  console.log(`[Cron] ${users.length} users to scrape`);

  let success = 0, failed = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    try {
      await scrapeAndSave(user, dateMin120, today, APIkey, env);

      success++;
    } catch (err) {
      console.error(`[Cron] Failed uid ${user.uid}:`, err.message);
      await env.brdb_users.prepare(
        'UPDATE users_index SET scrape_failed = scrape_failed + 1 WHERE uid = ?'
      ).bind(user.uid).run();
      failed++;
    }

    // Rate limit: 1.5s between requests (Cloudflare Worker max execution is 30s for free,
    // so with 500 users * 1.5s = 750s we need paid plan or smaller batches)
    // For free plan: limit to ~15 users per cron (15 * 1.5s = 22.5s)
    if (i < users.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`[Cron] Done. Success: ${success}, Failed: ${failed}`);
}

// ─── Score calculation (mirrored from userscript) ─────────────
function calculateScores(posts, meritTotal, posts120, merit120, postsLast120Array, regDate, lastActiveDate, meritsSent120 = 0) {
  const ageDays = regDate ? Math.max((Date.now() - regDate) / 86400000, 1) : 0; // 0 = unknown, prevents false Historical
  // Se lastActive non disponibile e utente ha post totali, assumiamo inattivo da molto (safe default → Former)
  const inactiveDays = lastActiveDate ? Math.max((Date.now() - lastActiveDate) / 86400000, 0) : (posts > 0 ? 9999 : 0);
  // Historical: >10 anni iscritto senza post recenti (merit passivi ricevuti non influenzano)
  const isHistoricalUser = regDate && ageDays > 365 * 10 && posts120 === 0;

  const recentMeritRatio    = meritTotal > 0 ? (merit120 / meritTotal) * 100 : 0;
  const recentPostRatio     = posts > 0 ? (posts120 / posts) * 100 : 0;
  const historicalMeritRate = meritTotal / ageDays;
  const recentMeritRate     = merit120 / 120;
  const meritRateMultiplier = historicalMeritRate > 0 ? recentMeritRate / historicalMeritRate : 0;
  const historicalPostRate  = posts / ageDays;
  const recentPostRate      = posts120 / 120;
  const postRateMultiplier  = historicalPostRate > 0 ? recentPostRate / historicalPostRate : 0;
  const meritSentReceivedRatio = merit120 > 0 ? meritsSent120 / merit120 : 0;
  const activeDays120 = Array.isArray(postsLast120Array) ? postsLast120Array.filter(p => p > 0).length : 0;
  const consistencyScore = (activeDays120 / 120) * 100;

  const Q_hist = (meritTotal / Math.max(posts, 1)) * Math.sqrt(posts);
  const Q_120  = posts120 > 0 ? (merit120 / posts120) * Math.sqrt(posts120) : 0;
  const Reputation = 0.7 * Q_hist + 0.3 * Q_120;
  const relPosts = Math.min(posts / 100, 1);
  const relAge   = Math.min(ageDays / 180, 1);
  const Reliability = relPosts * relAge;

  let badgeDormant = false, badgeFormer = false, badgeReactivated = false;
  // Former: inattivo >2 anni senza post (merit ricevuti passivamente non contano)
  // Dormant: inattivo >120gg senza post ma con attività recente (<2 anni)
  if (inactiveDays > 730 && posts120 === 0) badgeFormer = true;
  else if (inactiveDays > 120 && posts120 === 0) badgeDormant = true;
  if (badgeDormant && merit120 > 0 && activeDays120 >= 8 && !isHistoricalUser) {
    badgeReactivated = true; badgeDormant = false;
  }

  let FinalScore = Reputation * (0.4 + 0.6 * Reliability);
  if (badgeFormer || isHistoricalUser) FinalScore = 0;
  const promising = ageDays > 0 && ageDays < 180 && posts >= 3 && meritTotal >= 30;

  return {
    Reputation, Reliability, FinalScore, promising,
    badgeDormant, badgeFormer, badgeReactivated, isHistoricalUser,
    recentMeritRatio, recentPostRatio,
    historicalMeritRate, recentMeritRate, meritRateMultiplier,
    historicalPostRate, recentPostRate, postRateMultiplier,
    meritSentReceivedRatio, activeDays120, consistencyScore
  };
}

function calcBRDb(Reputation, merit120, posts120, badgeFormer, isHistoricalUser, lastActive, meritTotal) {
  if (isHistoricalUser) {
    // Decay -10%/anno dal last_active, floor = max(1, merit_total / 1000)
    const lastActiveDate = lastActive ? new Date(lastActive) : null;
    const yearsInactive = lastActiveDate
      ? (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
      : 10;
    const baseScore = Math.log10(Reputation + 1) * 3;
    const decayedScore = baseScore * Math.pow(0.9, yearsInactive);
    const floor = Math.max(1, (meritTotal || 0) / 1000);
    return Math.max(floor, Math.min(10, decayedScore));
  }
  let base = Math.log10(Reputation + 1) * 3;
  const activityBoost = Math.min((merit120 + posts120 / 2) / 300, 1) * 2;
  let score = base + activityBoost;
  if (badgeFormer) score = Math.max(1, Math.min(score, 5));
  return Math.max(1, Math.min(10, score));
}

function statusLabel(p, d, f, r, h) {
  if (h) return 'Historical';
  if (p) return 'Promising';
  if (r) return 'Reactivated';
  if (f) return 'Former';
  if (d) return 'Dormant';
  return 'Active';
}

function statusColor(s) {
  if (s === 'Active')      return '#22c55e';
  if (s === 'Dormant')     return '#facc15';
  if (s === 'Reactivated') return '#38bdf8';
  if (s === 'Former')      return '#ef4444';
  if (s === 'Promising')   return '#a855f7';
  if (s === 'Historical')  return '#cbd5e1';
  return '#94a3b8';
}

// ─── Bitcointalk profile parsing (unchanged) ──────────────────
function getProfileNumberFromHtml(html, label) {
  const regex = new RegExp(`<tr[^>]*>[\\s\\S]*?<td[^>]*><b[^>]*>${label}[^<]*<\\/b><\\/td>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)<\\/td>[\\s\\S]*?<\\/tr>`, 'i');
  const match = html.match(regex);
  if (!match) return 0;
  const m = match[1].trim().match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function getProfileNameFromHtml(html) {
  const regex = /<td[^>]*><b[^>]*>Name:[^<]*<\/b><\/td>[^>]*?<td[^>]*>([^<]*)<\/td>/i;
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function getProfileMeritFromHtml(html) {
  const regex = /<td[^>]*><b[^>]*><a[^>]*>Merit<\/a>:[^<]*<\/b><\/td>[^>]*?<td[^>]*>([^<]*)<\/td>/i;
  const match = html.match(regex);
  if (!match) return 0;
  const m = match[1].trim().match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function getProfileDateFromHtml(html, label) {
  const regex = new RegExp(`<tr[^>]*>[\\s\\S]*?<td[^>]*><b[^>]*>${label}[^<]*<\\/b><\\/td>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)<\\/td>[\\s\\S]*?<\\/tr>`, 'i');
  const match = html.match(regex);
  if (!match) return null;
  let value = match[1].trim().replace(/<[^>]*>/g, '');
  if (value === 'Today') return new Date().toISOString().split('T')[0];
  if (value.includes('Today at')) {
    const today = new Date();
    const timePart = value.replace('Today at ', '').trim();
    const [time, period] = timePart.split(' ');
    let [hours, minutes, seconds] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    today.setHours(hours, minutes, seconds || 0);
    return today.toISOString().split('T')[0];
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
}

function parseBitcointalkProfile(html) {
  return {
    name:       getProfileNameFromHtml(html),
    posts:      getProfileNumberFromHtml(html, 'Posts:'),
    meritTotal: getProfileMeritFromHtml(html),
    regDate:    getProfileDateFromHtml(html, 'Date Registered:'),
    lastActive: getProfileDateFromHtml(html, 'Last Active:')
  };
}


// ═══════════════════════════════════════════════════════════════
// BADGE DATA URLs — embedded SVGs
// ═══════════════════════════════════════════════════════════════
const BADGE_SENDER_GOLD     = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4MCAxMDAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIxMDAiPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib2R5R3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZTI5M2IiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGYxNzJhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib3JkZXJHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6I0ZGRTQ0RCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNCODg2MEIiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9Imdsb3dHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNGRkQ3MDA7c3RvcC1vcGFjaXR5OjAuMTgiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojRkZENzAwO3N0b3Atb3BhY2l0eTowIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0iZ2xvdyI+CiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjIuNSIgcmVzdWx0PSJibHVyIi8+CiAgICAgIDxmZU1lcmdlPjxmZU1lcmdlTm9kZSBpbj0iYmx1ciIvPjxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIvPjwvZmVNZXJnZT4KICAgIDwvZmlsdGVyPgogIDwvZGVmcz4KCiAgPCEtLSBIZXhhZ29uIHBvaW50ZWQgdG9wL2JvdHRvbSAtLT4KICA8cG9seWdvbiBwb2ludHM9IjQwLDMgNzYsMjIgNzYsNzggNDAsOTcgNCw3OCA0LDIyIgogICAgICAgICAgIGZpbGw9InVybCgjYm9yZGVyR3JhZCkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQwLDkgNzAsMjYgNzAsNzQgNDAsOTEgMTAsNzQgMTAsMjYiCiAgICAgICAgICAgZmlsbD0idXJsKCNib2R5R3JhZCkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQwLDkgNzAsMjYgNzAsNzQgNDAsOTEgMTAsNzQgMTAsMjYiCiAgICAgICAgICAgZmlsbD0idXJsKCNnbG93R3JhZCkiLz4KCiAgPCEtLSBBcnJvdyBpY29uIHRvcCBhcmVhIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iNDAsMTQgNDgsMjQgNDQsMjQgNDQsMzIgMzYsMzIgMzYsMjQgMzIsMjQiIGZpbGw9IiNGRkQ3MDAiIG9wYWNpdHk9IjAuNiIvPgoKICA8IS0tIERpdmlkZXIgLS0+CiAgPGxpbmUgeDE9IjEyIiB5MT0iNTIiIHgyPSI2OCIgeTI9IjUyIiBzdHJva2U9IiNGRkQ3MDAiIHN0cm9rZS13aWR0aD0iMC44IiBzdHJva2Utb3BhY2l0eT0iMC4zNSIvPgoKICA8IS0tIE1haW4gbGFiZWwgLS0+CiAgPHRleHQgeD0iNDAiIHk9IjQ3IgogICAgICAgIGZvbnQtZmFtaWx5PSInU3BhY2UgTW9ubycsIG1vbm9zcGFjZSIKICAgICAgICBmb250LXNpemU9IjE3IiBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiNGRkQ3MDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiCiAgICAgICAgZmlsdGVyPSJ1cmwoI2dsb3cpIiBsZXR0ZXItc3BhY2luZz0iMSI+IzE8L3RleHQ+CgogIDwhLS0gU3VibGFiZWwgLS0+CiAgPHRleHQgeD0iNDAiIHk9IjY0IgogICAgICAgIGZvbnQtZmFtaWx5PSInU3luZScsIHNhbnMtc2VyaWYiCiAgICAgICAgZm9udC1zaXplPSI3IiBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiM5NGEzYjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIxLjUiPk1FUklUPC90ZXh0PgogIDx0ZXh0IHg9IjQwIiB5PSI3NCIKICAgICAgICBmb250LWZhbWlseT0iJ1N5bmUnLCBzYW5zLXNlcmlmIgogICAgICAgIGZvbnQtc2l6ZT0iNyIgZm9udC13ZWlnaHQ9IjcwMCIKICAgICAgICBmaWxsPSIjOTRhM2I4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMS41Ij5TRU5ERVI8L3RleHQ+CgogIDwhLS0gQ29ybmVyIGRvdHMgLS0+CiAgPGNpcmNsZSBjeD0iMjQiIGN5PSI1OCIgcj0iMS41IiBmaWxsPSIjRkZENzAwIiBvcGFjaXR5PSIwLjUiLz4KICA8Y2lyY2xlIGN4PSI1NiIgY3k9IjU4IiByPSIxLjUiIGZpbGw9IiNGRkQ3MDAiIG9wYWNpdHk9IjAuNSIvPgo8L3N2Zz4=';
const BADGE_SENDER_SILVER   = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4MCAxMDAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIxMDAiPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib2R5R3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZTI5M2IiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGYxNzJhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib3JkZXJHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6I0U4RThFOCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM4MDgwODAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9Imdsb3dHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNDMEMwQzA7c3RvcC1vcGFjaXR5OjAuMTgiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojQzBDMEMwO3N0b3Atb3BhY2l0eTowIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0iZ2xvdyI+CiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjIuNSIgcmVzdWx0PSJibHVyIi8+CiAgICAgIDxmZU1lcmdlPjxmZU1lcmdlTm9kZSBpbj0iYmx1ciIvPjxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIvPjwvZmVNZXJnZT4KICAgIDwvZmlsdGVyPgogIDwvZGVmcz4KCiAgPCEtLSBIZXhhZ29uIHBvaW50ZWQgdG9wL2JvdHRvbSAtLT4KICA8cG9seWdvbiBwb2ludHM9IjQwLDMgNzYsMjIgNzYsNzggNDAsOTcgNCw3OCA0LDIyIgogICAgICAgICAgIGZpbGw9InVybCgjYm9yZGVyR3JhZCkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQwLDkgNzAsMjYgNzAsNzQgNDAsOTEgMTAsNzQgMTAsMjYiCiAgICAgICAgICAgZmlsbD0idXJsKCNib2R5R3JhZCkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQwLDkgNzAsMjYgNzAsNzQgNDAsOTEgMTAsNzQgMTAsMjYiCiAgICAgICAgICAgZmlsbD0idXJsKCNnbG93R3JhZCkiLz4KCiAgPCEtLSBBcnJvdyBpY29uIHRvcCBhcmVhIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iNDAsMTQgNDgsMjQgNDQsMjQgNDQsMzIgMzYsMzIgMzYsMjQgMzIsMjQiIGZpbGw9IiNDMEMwQzAiIG9wYWNpdHk9IjAuNiIvPgoKICA8IS0tIERpdmlkZXIgLS0+CiAgPGxpbmUgeDE9IjEyIiB5MT0iNTIiIHgyPSI2OCIgeTI9IjUyIiBzdHJva2U9IiNDMEMwQzAiIHN0cm9rZS13aWR0aD0iMC44IiBzdHJva2Utb3BhY2l0eT0iMC4zNSIvPgoKICA8IS0tIE1haW4gbGFiZWwgLS0+CiAgPHRleHQgeD0iNDAiIHk9IjQ3IgogICAgICAgIGZvbnQtZmFtaWx5PSInU3BhY2UgTW9ubycsIG1vbm9zcGFjZSIKICAgICAgICBmb250LXNpemU9IjE3IiBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiNDMEMwQzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiCiAgICAgICAgZmlsdGVyPSJ1cmwoI2dsb3cpIiBsZXR0ZXItc3BhY2luZz0iMSI+IzI8L3RleHQ+CgogIDwhLS0gU3VibGFiZWwgLS0+CiAgPHRleHQgeD0iNDAiIHk9IjY0IgogICAgICAgIGZvbnQtZmFtaWx5PSInU3luZScsIHNhbnMtc2VyaWYiCiAgICAgICAgZm9udC1zaXplPSI3IiBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiM5NGEzYjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIxLjUiPk1FUklUPC90ZXh0PgogIDx0ZXh0IHg9IjQwIiB5PSI3NCIKICAgICAgICBmb250LWZhbWlseT0iJ1N5bmUnLCBzYW5zLXNlcmlmIgogICAgICAgIGZvbnQtc2l6ZT0iNyIgZm9udC13ZWlnaHQ9IjcwMCIKICAgICAgICBmaWxsPSIjOTRhM2I4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMS41Ij5TRU5ERVI8L3RleHQ+CgogIDwhLS0gQ29ybmVyIGRvdHMgLS0+CiAgPGNpcmNsZSBjeD0iMjQiIGN5PSI1OCIgcj0iMS41IiBmaWxsPSIjQzBDMEMwIiBvcGFjaXR5PSIwLjUiLz4KICA8Y2lyY2xlIGN4PSI1NiIgY3k9IjU4IiByPSIxLjUiIGZpbGw9IiNDMEMwQzAiIG9wYWNpdHk9IjAuNSIvPgo8L3N2Zz4=';
const BADGE_SENDER_BRONZE   = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4MCAxMDAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIxMDAiPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib2R5R3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZTI5M2IiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGYxNzJhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib3JkZXJHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6I0U4QTg1QSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM4QjQ1MTMiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9Imdsb3dHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNDRDdGMzI7c3RvcC1vcGFjaXR5OjAuMTgiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojQ0Q3RjMyO3N0b3Atb3BhY2l0eTowIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0iZ2xvdyI+CiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjIuNSIgcmVzdWx0PSJibHVyIi8+CiAgICAgIDxmZU1lcmdlPjxmZU1lcmdlTm9kZSBpbj0iYmx1ciIvPjxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIvPjwvZmVNZXJnZT4KICAgIDwvZmlsdGVyPgogIDwvZGVmcz4KCiAgPCEtLSBIZXhhZ29uIHBvaW50ZWQgdG9wL2JvdHRvbSAtLT4KICA8cG9seWdvbiBwb2ludHM9IjQwLDMgNzYsMjIgNzYsNzggNDAsOTcgNCw3OCA0LDIyIgogICAgICAgICAgIGZpbGw9InVybCgjYm9yZGVyR3JhZCkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQwLDkgNzAsMjYgNzAsNzQgNDAsOTEgMTAsNzQgMTAsMjYiCiAgICAgICAgICAgZmlsbD0idXJsKCNib2R5R3JhZCkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQwLDkgNzAsMjYgNzAsNzQgNDAsOTEgMTAsNzQgMTAsMjYiCiAgICAgICAgICAgZmlsbD0idXJsKCNnbG93R3JhZCkiLz4KCiAgPCEtLSBBcnJvdyBpY29uIHRvcCBhcmVhIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iNDAsMTQgNDgsMjQgNDQsMjQgNDQsMzIgMzYsMzIgMzYsMjQgMzIsMjQiIGZpbGw9IiNDRDdGMzIiIG9wYWNpdHk9IjAuNiIvPgoKICA8IS0tIERpdmlkZXIgLS0+CiAgPGxpbmUgeDE9IjEyIiB5MT0iNTIiIHgyPSI2OCIgeTI9IjUyIiBzdHJva2U9IiNDRDdGMzIiIHN0cm9rZS13aWR0aD0iMC44IiBzdHJva2Utb3BhY2l0eT0iMC4zNSIvPgoKICA8IS0tIE1haW4gbGFiZWwgLS0+CiAgPHRleHQgeD0iNDAiIHk9IjQ3IgogICAgICAgIGZvbnQtZmFtaWx5PSInU3BhY2UgTW9ubycsIG1vbm9zcGFjZSIKICAgICAgICBmb250LXNpemU9IjE3IiBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiNDRDdGMzIiIHRleHQtYW5jaG9yPSJtaWRkbGUiCiAgICAgICAgZmlsdGVyPSJ1cmwoI2dsb3cpIiBsZXR0ZXItc3BhY2luZz0iMSI+IzM8L3RleHQ+CgogIDwhLS0gU3VibGFiZWwgLS0+CiAgPHRleHQgeD0iNDAiIHk9IjY0IgogICAgICAgIGZvbnQtZmFtaWx5PSInU3luZScsIHNhbnMtc2VyaWYiCiAgICAgICAgZm9udC1zaXplPSI3IiBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiM5NGEzYjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIxLjUiPk1FUklUPC90ZXh0PgogIDx0ZXh0IHg9IjQwIiB5PSI3NCIKICAgICAgICBmb250LWZhbWlseT0iJ1N5bmUnLCBzYW5zLXNlcmlmIgogICAgICAgIGZvbnQtc2l6ZT0iNyIgZm9udC13ZWlnaHQ9IjcwMCIKICAgICAgICBmaWxsPSIjOTRhM2I4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMS41Ij5TRU5ERVI8L3RleHQ+CgogIDwhLS0gQ29ybmVyIGRvdHMgLS0+CiAgPGNpcmNsZSBjeD0iMjQiIGN5PSI1OCIgcj0iMS41IiBmaWxsPSIjQ0Q3RjMyIiBvcGFjaXR5PSIwLjUiLz4KICA8Y2lyY2xlIGN4PSI1NiIgY3k9IjU4IiByPSIxLjUiIGZpbGw9IiNDRDdGMzIiIG9wYWNpdHk9IjAuNSIvPgo8L3N2Zz4=';
const BADGE_RECEIVER_GOLD   = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4MCAxMDAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIxMDAiPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib2R5R3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZTI5M2IiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGYxNzJhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib3JkZXJHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6I0ZGRTQ0RCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNCODg2MEIiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9Imdsb3dHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNGRkQ3MDA7c3RvcC1vcGFjaXR5OjAuMTgiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojRkZENzAwO3N0b3Atb3BhY2l0eTowIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0iZ2xvdyI+CiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjIuNSIgcmVzdWx0PSJibHVyIi8+CiAgICAgIDxmZU1lcmdlPjxmZU1lcmdlTm9kZSBpbj0iYmx1ciIvPjxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIvPjwvZmVNZXJnZT4KICAgIDwvZmlsdGVyPgogIDwvZGVmcz4KCiAgPCEtLSBIZXhhZ29uIHBvaW50ZWQgdG9wL2JvdHRvbSAtLT4KICA8cG9seWdvbiBwb2ludHM9IjQwLDMgNzYsMjIgNzYsNzggNDAsOTcgNCw3OCA0LDIyIgogICAgICAgICAgIGZpbGw9InVybCgjYm9yZGVyR3JhZCkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQwLDkgNzAsMjYgNzAsNzQgNDAsOTEgMTAsNzQgMTAsMjYiCiAgICAgICAgICAgZmlsbD0idXJsKCNib2R5R3JhZCkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQwLDkgNzAsMjYgNzAsNzQgNDAsOTEgMTAsNzQgMTAsMjYiCiAgICAgICAgICAgZmlsbD0idXJsKCNnbG93R3JhZCkiLz4KCiAgPCEtLSBBcnJvdyBpY29uIHRvcCBhcmVhIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iNDAsMzIgNDgsMjIgNDQsMjIgNDQsMTQgMzYsMTQgMzYsMjIgMzIsMjIiIGZpbGw9IiNGRkQ3MDAiIG9wYWNpdHk9IjAuNiIvPgoKICA8IS0tIERpdmlkZXIgLS0+CiAgPGxpbmUgeDE9IjEyIiB5MT0iNTIiIHgyPSI2OCIgeTI9IjUyIiBzdHJva2U9IiNGRkQ3MDAiIHN0cm9rZS13aWR0aD0iMC44IiBzdHJva2Utb3BhY2l0eT0iMC4zNSIvPgoKICA8IS0tIE1haW4gbGFiZWwgLS0+CiAgPHRleHQgeD0iNDAiIHk9IjQ3IgogICAgICAgIGZvbnQtZmFtaWx5PSInU3BhY2UgTW9ubycsIG1vbm9zcGFjZSIKICAgICAgICBmb250LXNpemU9IjE3IiBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiNGRkQ3MDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiCiAgICAgICAgZmlsdGVyPSJ1cmwoI2dsb3cpIiBsZXR0ZXItc3BhY2luZz0iMSI+IzE8L3RleHQ+CgogIDwhLS0gU3VibGFiZWwgLS0+CiAgPHRleHQgeD0iNDAiIHk9IjY0IgogICAgICAgIGZvbnQtZmFtaWx5PSInU3luZScsIHNhbnMtc2VyaWYiCiAgICAgICAgZm9udC1zaXplPSI3IiBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiM5NGEzYjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIxLjUiPk1FUklUPC90ZXh0PgogIDx0ZXh0IHg9IjQwIiB5PSI3NCIKICAgICAgICBmb250LWZhbWlseT0iJ1N5bmUnLCBzYW5zLXNlcmlmIgogICAgICAgIGZvbnQtc2l6ZT0iNyIgZm9udC13ZWlnaHQ9IjcwMCIKICAgICAgICBmaWxsPSIjOTRhM2I4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMS41Ij5SRUNFSVZFUjwvdGV4dD4KCiAgPCEtLSBDb3JuZXIgZG90cyAtLT4KICA8Y2lyY2xlIGN4PSIyNCIgY3k9IjU4IiByPSIxLjUiIGZpbGw9IiNGRkQ3MDAiIG9wYWNpdHk9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjU2IiBjeT0iNTgiIHI9IjEuNSIgZmlsbD0iI0ZGRDcwMCIgb3BhY2l0eT0iMC41Ii8+Cjwvc3ZnPg==';
const BADGE_RECEIVER_SILVER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4MCAxMDAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIxMDAiPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib2R5R3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZTI5M2IiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGYxNzJhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib3JkZXJHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6I0U4RThFOCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM4MDgwODAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9Imdsb3dHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNDMEMwQzA7c3RvcC1vcGFjaXR5OjAuMTgiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojQzBDMEMwO3N0b3Atb3BhY2l0eTowIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0iZ2xvdyI+CiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjIuNSIgcmVzdWx0PSJibHVyIi8+CiAgICAgIDxmZU1lcmdlPjxmZU1lcmdlTm9kZSBpbj0iYmx1ciIvPjxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIvPjwvZmVNZXJnZT4KICAgIDwvZmlsdGVyPgogIDwvZGVmcz4KCiAgPCEtLSBIZXhhZ29uIHBvaW50ZWQgdG9wL2JvdHRvbSAtLT4KICA8cG9seWdvbiBwb2ludHM9IjQwLDMgNzYsMjIgNzYsNzggNDAsOTcgNCw3OCA0LDIyIgogICAgICAgICAgIGZpbGw9InVybCgjYm9yZGVyR3JhZCkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQwLDkgNzAsMjYgNzAsNzQgNDAsOTEgMTAsNzQgMTAsMjYiCiAgICAgICAgICAgZmlsbD0idXJsKCNib2R5R3JhZCkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQwLDkgNzAsMjYgNzAsNzQgNDAsOTEgMTAsNzQgMTAsMjYiCiAgICAgICAgICAgZmlsbD0idXJsKCNnbG93R3JhZCkiLz4KCiAgPCEtLSBBcnJvdyBpY29uIHRvcCBhcmVhIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iNDAsMzIgNDgsMjIgNDQsMjIgNDQsMTQgMzYsMTQgMzYsMjIgMzIsMjIiIGZpbGw9IiNDMEMwQzAiIG9wYWNpdHk9IjAuNiIvPgoKICA8IS0tIERpdmlkZXIgLS0+CiAgPGxpbmUgeDE9IjEyIiB5MT0iNTIiIHgyPSI2OCIgeTI9IjUyIiBzdHJva2U9IiNDMEMwQzAiIHN0cm9rZS13aWR0aD0iMC44IiBzdHJva2Utb3BhY2l0eT0iMC4zNSIvPgoKICA8IS0tIE1haW4gbGFiZWwgLS0+CiAgPHRleHQgeD0iNDAiIHk9IjQ3IgogICAgICAgIGZvbnQtZmFtaWx5PSInU3BhY2UgTW9ubycsIG1vbm9zcGFjZSIKICAgICAgICBmb250LXNpemU9IjE3IiBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiNDMEMwQzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiCiAgICAgICAgZmlsdGVyPSJ1cmwoI2dsb3cpIiBsZXR0ZXItc3BhY2luZz0iMSI+IzI8L3RleHQ+CgogIDwhLS0gU3VibGFiZWwgLS0+CiAgPHRleHQgeD0iNDAiIHk9IjY0IgogICAgICAgIGZvbnQtZmFtaWx5PSInU3luZScsIHNhbnMtc2VyaWYiCiAgICAgICAgZm9udC1zaXplPSI3IiBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiM5NGEzYjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIxLjUiPk1FUklUPC90ZXh0PgogIDx0ZXh0IHg9IjQwIiB5PSI3NCIKICAgICAgICBmb250LWZhbWlseT0iJ1N5bmUnLCBzYW5zLXNlcmlmIgogICAgICAgIGZvbnQtc2l6ZT0iNyIgZm9udC13ZWlnaHQ9IjcwMCIKICAgICAgICBmaWxsPSIjOTRhM2I4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMS41Ij5SRUNFSVZFUjwvdGV4dD4KCiAgPCEtLSBDb3JuZXIgZG90cyAtLT4KICA8Y2lyY2xlIGN4PSIyNCIgY3k9IjU4IiByPSIxLjUiIGZpbGw9IiNDMEMwQzAiIG9wYWNpdHk9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjU2IiBjeT0iNTgiIHI9IjEuNSIgZmlsbD0iI0MwQzBDMCIgb3BhY2l0eT0iMC41Ii8+Cjwvc3ZnPg==';
const BADGE_RECEIVER_BRONZE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4MCAxMDAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIxMDAiPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib2R5R3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZTI5M2IiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGYxNzJhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib3JkZXJHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6I0U4QTg1QSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM4QjQ1MTMiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9Imdsb3dHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNDRDdGMzI7c3RvcC1vcGFjaXR5OjAuMTgiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojQ0Q3RjMyO3N0b3Atb3BhY2l0eTowIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0iZ2xvdyI+CiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjIuNSIgcmVzdWx0PSJibHVyIi8+CiAgICAgIDxmZU1lcmdlPjxmZU1lcmdlTm9kZSBpbj0iYmx1ciIvPjxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIvPjwvZmVNZXJnZT4KICAgIDwvZmlsdGVyPgogIDwvZGVmcz4KCiAgPCEtLSBIZXhhZ29uIHBvaW50ZWQgdG9wL2JvdHRvbSAtLT4KICA8cG9seWdvbiBwb2ludHM9IjQwLDMgNzYsMjIgNzYsNzggNDAsOTcgNCw3OCA0LDIyIgogICAgICAgICAgIGZpbGw9InVybCgjYm9yZGVyR3JhZCkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQwLDkgNzAsMjYgNzAsNzQgNDAsOTEgMTAsNzQgMTAsMjYiCiAgICAgICAgICAgZmlsbD0idXJsKCNib2R5R3JhZCkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQwLDkgNzAsMjYgNzAsNzQgNDAsOTEgMTAsNzQgMTAsMjYiCiAgICAgICAgICAgZmlsbD0idXJsKCNnbG93R3JhZCkiLz4KCiAgPCEtLSBBcnJvdyBpY29uIHRvcCBhcmVhIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iNDAsMzIgNDgsMjIgNDQsMjIgNDQsMTQgMzYsMTQgMzYsMjIgMzIsMjIiIGZpbGw9IiNDRDdGMzIiIG9wYWNpdHk9IjAuNiIvPgoKICA8IS0tIERpdmlkZXIgLS0+CiAgPGxpbmUgeDE9IjEyIiB5MT0iNTIiIHgyPSI2OCIgeTI9IjUyIiBzdHJva2U9IiNDRDdGMzIiIHN0cm9rZS13aWR0aD0iMC44IiBzdHJva2Utb3BhY2l0eT0iMC4zNSIvPgoKICA8IS0tIE1haW4gbGFiZWwgLS0+CiAgPHRleHQgeD0iNDAiIHk9IjQ3IgogICAgICAgIGZvbnQtZmFtaWx5PSInU3BhY2UgTW9ubycsIG1vbm9zcGFjZSIKICAgICAgICBmb250LXNpemU9IjE3IiBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiNDRDdGMzIiIHRleHQtYW5jaG9yPSJtaWRkbGUiCiAgICAgICAgZmlsdGVyPSJ1cmwoI2dsb3cpIiBsZXR0ZXItc3BhY2luZz0iMSI+IzM8L3RleHQ+CgogIDwhLS0gU3VibGFiZWwgLS0+CiAgPHRleHQgeD0iNDAiIHk9IjY0IgogICAgICAgIGZvbnQtZmFtaWx5PSInU3luZScsIHNhbnMtc2VyaWYiCiAgICAgICAgZm9udC1zaXplPSI3IiBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiM5NGEzYjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIxLjUiPk1FUklUPC90ZXh0PgogIDx0ZXh0IHg9IjQwIiB5PSI3NCIKICAgICAgICBmb250LWZhbWlseT0iJ1N5bmUnLCBzYW5zLXNlcmlmIgogICAgICAgIGZvbnQtc2l6ZT0iNyIgZm9udC13ZWlnaHQ9IjcwMCIKICAgICAgICBmaWxsPSIjOTRhM2I4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMS41Ij5SRUNFSVZFUjwvdGV4dD4KCiAgPCEtLSBDb3JuZXIgZG90cyAtLT4KICA8Y2lyY2xlIGN4PSIyNCIgY3k9IjU4IiByPSIxLjUiIGZpbGw9IiNDRDdGMzIiIG9wYWNpdHk9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjU2IiBjeT0iNTgiIHI9IjEuNSIgZmlsbD0iI0NEN0YzMiIgb3BhY2l0eT0iMC41Ii8+Cjwvc3ZnPg==';
const BADGE_MS              = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4MCA5MCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjkwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ic2hpZWxkR3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZTI5M2IiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGYxNzJhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJib3JkZXJHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6I2ZiYmYyNCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNkOTc3MDYiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9Imdsb3dHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmYmJmMjQ7c3RvcC1vcGFjaXR5OjAuMTUiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZmJiZjI0O3N0b3Atb3BhY2l0eTowIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0iZ2xvdyI+CiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjIiIHJlc3VsdD0iYmx1ciIvPgogICAgICA8ZmVNZXJnZT48ZmVNZXJnZU5vZGUgaW49ImJsdXIiLz48ZmVNZXJnZU5vZGUgaW49IlNvdXJjZUdyYXBoaWMiLz48L2ZlTWVyZ2U+CiAgICA8L2ZpbHRlcj4KICA8L2RlZnM+CgogIDwhLS0gU2hpZWxkIGJvcmRlciAoc2xpZ2h0bHkgbGFyZ2VyLCBnb2xkKSAtLT4KICA8cGF0aCBkPSJNNDAgMyBMNzQgMTQgTDc0IDQ4IFE3NCA3MiA0MCA4NyBRNiA3MiA2IDQ4IEw2IDE0IFoiCiAgICAgICAgZmlsbD0idXJsKCNib3JkZXJHcmFkKSIgLz4KCiAgPCEtLSBTaGllbGQgYm9keSAtLT4KICA8cGF0aCBkPSJNNDAgNyBMNzAgMTcgTDcwIDQ4IFE3MCA2OSA0MCA4MyBRMTAgNjkgMTAgNDggTDEwIDE3IFoiCiAgICAgICAgZmlsbD0idXJsKCNzaGllbGRHcmFkKSIgLz4KCiAgPCEtLSBJbm5lciBnbG93IC0tPgogIDxwYXRoIGQ9Ik00MCA3IEw3MCAxNyBMNzAgNDggUTcwIDY5IDQwIDgzIFExMCA2OSAxMCA0OCBMMTAgMTcgWiIKICAgICAgICBmaWxsPSJ1cmwoI2dsb3dHcmFkKSIgLz4KCiAgPCEtLSBIb3Jpem9udGFsIGRpdmlkZXIgbGluZSAtLT4KICA8bGluZSB4MT0iMTMiIHkxPSIzNiIgeDI9IjY3IiB5Mj0iMzYiIHN0cm9rZT0iI2ZiYmYyNCIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1vcGFjaXR5PSIwLjQiLz4KCiAgPCEtLSBNUyB0ZXh0IC0tPgogIDx0ZXh0IHg9IjQwIiB5PSIzMiIKICAgICAgICBmb250LWZhbWlseT0iJ1NwYWNlIE1vbm8nLCBtb25vc3BhY2UiCiAgICAgICAgZm9udC1zaXplPSIxNiIKICAgICAgICBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiNmYmJmMjQiCiAgICAgICAgdGV4dC1hbmNob3I9Im1pZGRsZSIKICAgICAgICBmaWx0ZXI9InVybCgjZ2xvdykiCiAgICAgICAgbGV0dGVyLXNwYWNpbmc9IjIiPk1TPC90ZXh0PgoKICA8IS0tIFN1YnRpdGxlIC0tPgogIDx0ZXh0IHg9IjQwIiB5PSI1NiIKICAgICAgICBmb250LWZhbWlseT0iJ1N5bmUnLCBzYW5zLXNlcmlmIgogICAgICAgIGZvbnQtc2l6ZT0iNi41IgogICAgICAgIGZvbnQtd2VpZ2h0PSI3MDAiCiAgICAgICAgZmlsbD0iIzk0YTNiOCIKICAgICAgICB0ZXh0LWFuY2hvcj0ibWlkZGxlIgogICAgICAgIGxldHRlci1zcGFjaW5nPSIxLjUiPk1FUklUPC90ZXh0PgoKICA8dGV4dCB4PSI0MCIgeT0iNjUiCiAgICAgICAgZm9udC1mYW1pbHk9IidTeW5lJywgc2Fucy1zZXJpZiIKICAgICAgICBmb250LXNpemU9IjYuNSIKICAgICAgICBmb250LXdlaWdodD0iNzAwIgogICAgICAgIGZpbGw9IiM5NGEzYjgiCiAgICAgICAgdGV4dC1hbmNob3I9Im1pZGRsZSIKICAgICAgICBsZXR0ZXItc3BhY2luZz0iMS41Ij5TT1VSQ0U8L3RleHQ+CgogIDwhLS0gQ29ybmVyIGRvdHMgZGVjb3JhdGlvbiAtLT4KICA8Y2lyY2xlIGN4PSIyNCIgY3k9IjQ0IiByPSIxLjUiIGZpbGw9IiNmYmJmMjQiIG9wYWNpdHk9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjU2IiBjeT0iNDQiIHI9IjEuNSIgZmlsbD0iI2ZiYmYyNCIgb3BhY2l0eT0iMC41Ii8+Cjwvc3ZnPgo=';
const BADGE_SENDER_DYN   = (rank) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" width="120" height="150">
  <defs>
    <linearGradient id="bG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b"/><stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <linearGradient id="bBG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#fb923c"/><stop offset="100%" style="stop-color:#c2410c"/>
    </linearGradient>
    <linearGradient id="bGG" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f97316;stop-opacity:0.18"/><stop offset="100%" style="stop-color:#f97316;stop-opacity:0"/>
    </linearGradient>
    <filter id="gw"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <polygon points="40,3 76,22 76,78 40,97 4,78 4,22" fill="url(#bBG)"/>
  <polygon points="40,9 70,26 70,74 40,91 10,74 10,26" fill="url(#bG)"/>
  <polygon points="40,9 70,26 70,74 40,91 10,74 10,26" fill="url(#bGG)"/>
  <polygon points='40,14 48,24 44,24 44,32 36,32 36,24 32,24' fill='#f97316' opacity='0.6'/>
  <line x1="12" y1="52" x2="68" y2="52" stroke="#f97316" stroke-width="0.8" stroke-opacity="0.35"/>
  <text x="40" y="47" font-family="Space Mono,monospace" font-size="14" font-weight="700" fill="#f97316" text-anchor="middle" filter="url(#gw)" letter-spacing="1">#${rank}</text>
  <text x="40" y="64" font-family="Syne,sans-serif" font-size="7" font-weight="700" fill="#94a3b8" text-anchor="middle" letter-spacing="1.5">MERIT</text>
  <text x="40" y="74" font-family="Syne,sans-serif" font-size="7" font-weight="700" fill="#94a3b8" text-anchor="middle" letter-spacing="1.5">SENDER</text>
  <circle cx="24" cy="58" r="1.5" fill="#f97316" opacity="0.5"/>
  <circle cx="56" cy="58" r="1.5" fill="#f97316" opacity="0.5"/>
</svg>`;
const BADGE_RECEIVER_DYN = (rank) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" width="120" height="150">
  <defs>
    <linearGradient id="bG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b"/><stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <linearGradient id="bBG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#86efac"/><stop offset="100%" style="stop-color:#16a34a"/>
    </linearGradient>
    <linearGradient id="bGG" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4ade80;stop-opacity:0.18"/><stop offset="100%" style="stop-color:#4ade80;stop-opacity:0"/>
    </linearGradient>
    <filter id="gw"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <polygon points="40,3 76,22 76,78 40,97 4,78 4,22" fill="url(#bBG)"/>
  <polygon points="40,9 70,26 70,74 40,91 10,74 10,26" fill="url(#bG)"/>
  <polygon points="40,9 70,26 70,74 40,91 10,74 10,26" fill="url(#bGG)"/>
  <polygon points='40,32 48,22 44,22 44,14 36,14 36,22 32,22' fill='#4ade80' opacity='0.6'/>
  <line x1="12" y1="52" x2="68" y2="52" stroke="#4ade80" stroke-width="0.8" stroke-opacity="0.35"/>
  <text x="40" y="47" font-family="Space Mono,monospace" font-size="14" font-weight="700" fill="#4ade80" text-anchor="middle" filter="url(#gw)" letter-spacing="1">#${rank}</text>
  <text x="40" y="64" font-family="Syne,sans-serif" font-size="7" font-weight="700" fill="#94a3b8" text-anchor="middle" letter-spacing="1.5">MERIT</text>
  <text x="40" y="74" font-family="Syne,sans-serif" font-size="7" font-weight="700" fill="#94a3b8" text-anchor="middle" letter-spacing="1.5">RECEIVER</text>
  <circle cx="24" cy="58" r="1.5" fill="#4ade80" opacity="0.5"/>
  <circle cx="56" cy="58" r="1.5" fill="#4ade80" opacity="0.5"/>
</svg>`;

function getMeritSenderBadge(rank) {
  if (!rank || rank > 100) return null;
  if (rank === 1) return `<img src="${BADGE_SENDER_GOLD}" style="width:120px;height:150px;vertical-align:middle" title="Merit Sender #1" class="badge-img badge-gold">`;
  if (rank === 2) return `<img src="${BADGE_SENDER_SILVER}" style="width:120px;height:150px;vertical-align:middle" title="Merit Sender #2" class="badge-img badge-silver">`;
  if (rank === 3) return `<img src="${BADGE_SENDER_BRONZE}" style="width:120px;height:150px;vertical-align:middle" title="Merit Sender #3" class="badge-img badge-bronze">`;
  const svgStr = BADGE_SENDER_DYN(rank);
  const b64 = btoa(unescape(encodeURIComponent(svgStr)));
  return `<img src="data:image/svg+xml;base64,${b64}" style="width:120px;height:150px;vertical-align:middle" title="Merit Sender #${rank}" class="badge-img badge-orange">`;
}

function getMeritReceiverBadge(rank) {
  if (!rank || rank > 100) return null;
  if (rank === 1) return `<img src="${BADGE_RECEIVER_GOLD}" style="width:120px;height:150px;vertical-align:middle" title="Merit Receiver #1" class="badge-img badge-gold">`;
  if (rank === 2) return `<img src="${BADGE_RECEIVER_SILVER}" style="width:120px;height:150px;vertical-align:middle" title="Merit Receiver #2" class="badge-img badge-silver">`;
  if (rank === 3) return `<img src="${BADGE_RECEIVER_BRONZE}" style="width:120px;height:150px;vertical-align:middle" title="Merit Receiver #3" class="badge-img badge-bronze">`;
  const svgStr = BADGE_RECEIVER_DYN(rank);
  const b64 = btoa(unescape(encodeURIComponent(svgStr)));
  return `<img src="data:image/svg+xml;base64,${b64}" style="width:120px;height:150px;vertical-align:middle" title="Merit Receiver #${rank}" class="badge-img badge-green">`;
}

function getMsBadge() {
  return `<img src="${BADGE_MS}" style="width:120px;height:150px;vertical-align:middle" title="Merit Source" class="badge-img badge-amber">`;
}

function renderBadgesSection(d, ranks, awardData = null) {
  const senderBadge   = getMeritSenderBadge(ranks.send);
  const receiverBadge = getMeritReceiverBadge(ranks.recv);
  // Merit Source badge removed - logic was incorrect
  const msBadge = null;
  // Community Award badge
  let awardBadge = null;
  if (awardData && awardData.title) {
    // Badge identico ai merit badge — esagono, viewBox 80x100, width 120 height 150
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" width="120" height="150">
  <defs>
    <linearGradient id="aG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b"/><stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <linearGradient id="aBG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#fde047"/><stop offset="100%" style="stop-color:#b45309"/>
    </linearGradient>
    <linearGradient id="aGG" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:0.18"/><stop offset="100%" style="stop-color:#fbbf24;stop-opacity:0"/>
    </linearGradient>
    <filter id="gw"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <polygon points="40,3 76,22 76,78 40,97 4,78 4,22" fill="url(#aBG)"/>
  <polygon points="40,9 70,26 70,74 40,91 10,74 10,26" fill="url(#aG)"/>
  <polygon points="40,9 70,26 70,74 40,91 10,74 10,26" fill="url(#aGG)"/>
  <text x="40" y="42" font-size="20" text-anchor="middle" filter="url(#gw)">&#x1F3C6;</text>
  <line x1="12" y1="52" x2="68" y2="52" stroke="#fbbf24" stroke-width="0.8" stroke-opacity="0.35"/>
  <text x="40" y="64" font-family="Space Mono,monospace" font-size="11" font-weight="700" fill="#fbbf24" text-anchor="middle" filter="url(#gw)" letter-spacing="1">•BCA•</text>
  <text x="40" y="76" font-family="Syne,sans-serif" font-size="7" font-weight="700" fill="#94a3b8" text-anchor="middle" letter-spacing="1.5">${awardData.year}</text>
  <circle cx="24" cy="58" r="1.5" fill="#fbbf24" opacity="0.5"/>
  <circle cx="56" cy="58" r="1.5" fill="#fbbf24" opacity="0.5"/>
</svg>`;
    const b64 = btoa(unescape(encodeURIComponent(svg)));
    awardBadge = `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:6px">
      <img src="data:image/svg+xml;base64,${b64}" style="width:120px;height:150px;vertical-align:middle" title="Community Award ${awardData.year}: ${awardData.title}" class="badge-img badge-amber">
      <span style="font-size:12px;font-weight:700;color:#fbbf24;letter-spacing:0.5px;text-align:center;max-width:140px;line-height:1.3">${awardData.title}</span>
    </div>`;
  }
  const hasBadges = senderBadge || receiverBadge || awardBadge;
  if (!hasBadges) return '';
  const wrap = (b) => b ? `<div style="display:inline-flex;align-items:center">${b}</div>` : '';
  return '<div class="badges-wrap" style="background:var(--s);border:1px solid var(--b);border-radius:18px;padding:14px 20px;margin-bottom:20px">'
    + '<div style="font-size:10px;font-weight:700;color:#475569;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Badges</div>'
    + '<div style="height:1px;background:var(--b);margin-bottom:14px"></div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:center">'
    + wrap(awardBadge)
    + wrap(senderBadge)
    + wrap(receiverBadge)
    + '</div></div>';
}
   

// ═══════════════════════════════════════════════════════════════
// generateProfileHTML — renders a full BRDb profile page
// ═══════════════════════════════════════════════════════════════
function generateProfileHTML(uid, d, ranks = {}, queue = {}, trust = null, awardData = null) {
  const trustScore = trust || null;
  const BRDb = (d.BRDb || 0).toFixed(2);
  const status = d.status || 'Active';
  const color = d.status === 'Historical' ? '#e2e8f0' : (d.color || '#22c55e');
  const username = d.username || ('User #' + uid);
  const Reputation = (d.Reputation || 0).toFixed(2);
  const Reliability = ((d.Reliability || 0) * 100).toFixed(0);
  const posts120 = d.posts120 || 0;
  const merit120 = d.merit120 || 0;
  const sent120 = d.merits_sent120 || 0;
  const postsTotal = (d.posts_total || 0).toLocaleString();
  const meritTotal = (d.merit_total || 0).toLocaleString();
  const activeDays = d.active_days120 || 0;
  const consistency = (d.consistency_score || 0).toFixed(0);
  const recentMerit = (d.recent_merit_ratio || 0).toFixed(1);
  const recentPost = (d.recent_post_ratio || 0).toFixed(1);
  const meritTrend = (d.merit_rate_multiplier || 0).toFixed(2);
  const postTrend = (d.post_rate_multiplier || 0).toFixed(2);
  const rMR = (d.recent_merit_rate || 0).toFixed(3);
  const hMR = (d.historical_merit_rate || 0).toFixed(3);
  const rPR = (d.recent_post_rate || 0).toFixed(2);
  const hPR = (d.historical_post_rate || 0).toFixed(2);
  const sentRatio = (d.merit_sent_received_ratio || 0).toFixed(2);
  const impactAll = (d.impact_all || 0).toFixed(0);
  const impact120 = (d.impact_120 || 0).toFixed(0);
  const avg_all = (d.avg_all || 0).toFixed(2);
  const avg_120 = (d.avg_120 || 0).toFixed(2);
  const localBoard = d.local_board || null;
  const topBoards = d.top_boards ? (typeof d.top_boards === 'string' ? JSON.parse(d.top_boards) : d.top_boards) : [];
  const updatedAt = d.updated_at ? new Date(d.updated_at).toLocaleDateString('en-GB') : 'N/A';
  const { queuePos, queueTotal, nextScrapeEta, lastScraped } = queue;
  // queuePct: % of 24h cycle elapsed since last scrape (synced with ETA countdown)
  const cycleMs = 7 * 24 * 60 * 60 * 1000;
  const elapsedMs = lastScraped ? (Date.now() - new Date(lastScraped).getTime()) : 0;
  const queuePct = lastScraped ? Math.min(Math.round((elapsedMs / cycleMs) * 100), 100) : null;
  const etaStr = nextScrapeEta === 'queued' ? 'in queue' : nextScrapeEta ? (() => {
    const diff = nextScrapeEta - Date.now();
    if (diff < 60000) return 'less than a minute';
    if (diff < 3600000) return Math.round(diff / 60000) + ' min';
    if (diff < 86400000) {
      const h = Math.floor(diff / 3600000), m = Math.round((diff % 3600000) / 60000);
      if (m === 60) return (h + 1) + 'h';
      return h + 'h' + (m > 0 ? ' ' + m + 'm' : '');
    }
    const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000);
    return d + 'd' + (h > 0 ? ' ' + h + 'h' : '');
  })() : null;

  const statusEmoji = {Active:'🟢',Dormant:'🟡',Former:'🔴',Promising:'🟣',Reactivated:'🔵',Historical:'⚪',Banned:'🚫'}[status] || '⚪';
  const wipedBadge = d.posts_wiped ? '<span style="background:#78350f;color:#fbbf24;padding:2px 10px;border-radius:20px;font-size:12px;margin-left:8px">🗑️ Posts Wiped</span>' : '';
  const trendIcon = v => v >= 1.5 ? '🚀' : v >= 1.1 ? '📈' : v >= 0.9 ? '➡️' : v >= 0.5 ? '📉' : '⚠️';
  const trendColor = v => v >= 1.1 ? '#22c55e' : v >= 0.9 ? '#f59e0b' : '#ef4444';
  const boardFlags = {Italian:'🇮🇹',German:'🇩🇪',Spanish:'🇪🇸',French:'🇫🇷',Portuguese:'🇧🇷',Russian:'🇷🇺',Turkish:'🇹🇷',Dutch:'🇳🇱',Polish:'🇵🇱',Romanian:'🇷🇴',Greek:'🇬🇷',Croatian:'🇭🇷',Mandarin:'🇨🇳',Japanese:'🇯🇵',Korean:'🇰🇷',Arabic:'🇸🇦',Indonesian:'🇮🇩',Filipino:'🇵🇭',Nigerian:'🇳🇬',India:'🇮🇳',Scandinavian:'🇸🇪',Hebrew:'🇮🇱','Other languages/locations':'🌐'};

  const avatarSrc = `https://bitcointalk.org/useravatars/avatar_${uid}.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${username} — BRDb Profile</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#060a14;--s:#0d1526;--s2:#111c35;--b:#1e2d4a;--acc:#3b82f6;--gold:#f59e0b;--txt:#e2e8f0;--mut:#64748b;--st:${color}}
*{margin:0;padding:0;box-sizing:border-box}
html{background:#060a14;background-image:linear-gradient(rgba(59,130,246,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.03) 1px,transparent 1px);background-size:40px 40px;background-attachment:fixed}
body{background:transparent;color:var(--txt);font-family:'Syne',sans-serif;min-height:100vh;overflow-x:hidden}
.wrap{max-width:860px;margin:0 auto;padding:36px 16px 80px;position:relative;z-index:1;overflow-x:hidden}
@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{transform:translateX(-100%) skewX(-15deg)}100%{transform:translateX(250%) skewX(-15deg)}}
@keyframes pulse-glow{0%,100%{opacity:.4;transform:scaleX(.6)}50%{opacity:1;transform:scaleX(1)}}
.a1{animation:up .45s .0s both}.a2{animation:up .45s .08s both}.a3{animation:up .45s .16s both}.a4{animation:up .45s .22s both}.a5{animation:up .45s .28s both}

/* Header */
.hdr{display:flex;align-items:center;gap:22px;padding:24px;background:var(--s);border:1px solid var(--b);border-radius:18px;margin-bottom:20px;position:relative;overflow:hidden}
.hdr::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--st),transparent)}
.av{width:80px;height:80px;min-width:80px;min-height:80px;border-radius:50%;border:3px solid var(--st);object-fit:cover;flex-shrink:0;box-shadow:0 0 20px ${color}44;aspect-ratio:1/1}
.av-fb{width:80px;height:80px;border-radius:50%;border:3px solid var(--st);background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0}
.uname{font-size:26px;font-weight:800;color:#fff;letter-spacing:-.5px;overflow-wrap:break-word;word-break:break-word;min-width:0}
.uid{font-family:'Space Mono',monospace;font-size:11px;color:var(--mut);margin-top:3px}
.bdg{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
.b{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid currentColor}
.bs{color:var(--st);background:${color}18}
.bb{color:#a78bfa;background:#a78bfa18;border-color:#a78bfa}
.navbar{display:flex;align-items:center;justify-content:space-between;padding:12px 0;margin-bottom:20px;border-bottom:1px solid var(--b);gap:8px}
.nb-logo{font-size:16px;font-weight:800;color:#fff;letter-spacing:-0.5px;text-decoration:none;flex-shrink:0}
.nb-logo span{color:var(--gold)}
.nb-links{display:flex;gap:8px;flex-shrink:0}
.nb-link{display:inline-flex;align-items:center;gap:5px;padding:9px 16px;border-radius:9px;background:var(--s2);border:1px solid var(--b);color:var(--mut);text-decoration:none;font-size:13px;font-weight:600;transition:all .2s;flex-shrink:0}
.nb-link:hover{color:var(--txt);border-color:var(--acc)}
.nb-link.active{color:var(--acc);border-color:var(--acc)}
.btl{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:9px;background:var(--s2);border:1px solid var(--b);color:var(--acc);text-decoration:none;font-size:12px;font-weight:600;transition:all .2s;flex-shrink:0;margin-left:auto}
.btl:hover{background:var(--acc);color:#fff;border-color:var(--acc)}

/* Hero */
@keyframes sweep{0%{left:-40%}100%{left:140%}}
@keyframes border-pulse{0%,100%{box-shadow:0 0 10px 1px ${color}50,0 0 0 1px ${color}55}50%{box-shadow:0 0 20px 4px ${color}80,0 0 0 1px ${color}aa}}
.hero{background:var(--s);border:1px solid ${color}77;border-radius:18px;padding:28px;text-align:center;margin-bottom:20px;position:relative;animation:border-pulse 3s ease-in-out infinite}.hero-clip{position:absolute;inset:0;border-radius:18px;overflow:hidden;pointer-events:none}
.hero-sweep{position:absolute;bottom:0;left:-40%;width:35%;height:2px;background:linear-gradient(90deg,transparent,${color}dd,${color},${color}dd,transparent);animation:sweep 3s ease-in-out infinite;pointer-events:none;z-index:2}
.hero-glow{position:absolute;bottom:0;left:-40%;width:35%;height:16px;background:linear-gradient(90deg,transparent,${color}55,${color}77,${color}55,transparent);animation:sweep 3s ease-in-out infinite;pointer-events:none;filter:blur(5px);z-index:1}
.slbl{font-size:11px;letter-spacing:3px;color:var(--mut);text-transform:uppercase;margin-bottom:6px}
.sval{font-size:68px;font-weight:800;color:var(--gold);line-height:1;font-family:'Space Mono',monospace;text-shadow:0 0 36px ${color}55}
.ssub{font-size:13px;color:var(--mut);margin-top:7px}
.upd{font-size:10px;color:var(--mut);margin-top:5px;font-family:'Space Mono',monospace}
.queue-eta{color:var(--mut);font-size:10px;white-space:nowrap}
.queue-bar-wrap{display:inline-block;vertical-align:middle;width:60px;height:4px;background:#1e2d4a;border-radius:2px;margin-left:6px;overflow:hidden}
.queue-bar-fill{display:block;height:100%;background:linear-gradient(90deg,#3b82f6,#22c55e);border-radius:2px;transition:width .3s}
.rbar{background:var(--s2);border-radius:6px;height:7px;overflow:hidden;max-width:280px;margin:10px auto 0}
.rfill{height:100%;border-radius:6px;background:linear-gradient(90deg,#22c55e,#86efac);transition:width 1.2s ease}
.ptabs{display:flex;gap:2px;background:var(--s2);border-radius:12px;padding:4px;margin-bottom:20px;width:100%;box-sizing:border-box}
.ptab{padding:9px 8px;border-radius:9px;border:none;background:none;color:var(--mut);font-size:12px;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;transition:all .2s;flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.ptab.active{background:var(--acc);color:#fff}
.ppane{display:none}.ppane.active{display:block}
.m-sum{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.m-sc{background:var(--s2);border:1px solid var(--b);border-radius:12px;padding:16px;text-align:center}
.m-sv{font-size:24px;font-weight:800;font-family:'Space Mono',monospace}
.m-sl{font-size:10px;color:var(--mut);margin-top:4px;text-transform:uppercase;letter-spacing:1px}
.m-g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.m-card{background:var(--s2);border:1px solid var(--b);border-radius:13px;padding:16px}
.m-ct{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--acc);margin-bottom:12px;font-weight:700}
.m-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--b)}
.m-row:last-child{border-bottom:none}
@media(max-width:560px){.m-sum{grid-template-columns:1fr 1fr}.m-g2{grid-template-columns:1fr}}

/* Grid */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px}
@media(max-width:560px){.g3{grid-template-columns:1fr 1fr}}

/* Cards */
.c{background:var(--s);border:1px solid var(--b);border-radius:13px;padding:15px}
.cl{font-size:10px;color:var(--mut);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px}
.cv{font-size:24px;font-weight:700;font-family:'Space Mono',monospace}
.cs{font-size:10px;color:var(--mut);margin-top:3px}

/* Section */
.sec{font-size:10px;letter-spacing:3px;color:var(--mut);text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:10px}
.sec::after{content:'';flex:1;height:1px;background:var(--b)}

/* Rate rows */
.rr{display:flex;align-items:center;justify-content:space-between;background:var(--s2);border-radius:10px;padding:12px 16px;margin-bottom:10px;gap:10px}
.rs{text-align:center}
.rv{font-size:17px;font-weight:700;font-family:'Space Mono',monospace}
.rl{font-size:10px;color:var(--mut);margin-top:2px}
.rvs{font-size:16px;color:var(--b)}

.foot{text-align:center;margin-top:44px;font-size:11px;color:var(--mut);font-family:'Space Mono',monospace}
.foot a{color:var(--acc);text-decoration:none}
.hspin{display:inline-block;width:18px;height:18px;border:2px solid var(--b);border-top-color:var(--acc);border-radius:50%;animation:spin .7s linear infinite;margin-bottom:8px}
@keyframes spin{to{transform:rotate(360deg)}}

@media(max-width:480px){
  .badge-img{width:72px!important;height:90px!important}
  .badges-wrap{gap:8px!important;padding:12px 16px!important;justify-content:center}

  .hdr{flex-direction:column;align-items:flex-start;gap:12px;padding:16px;overflow:visible}
  .hdr>div{width:100%;min-width:0}
  .hdr-info{width:100%!important;max-width:100%!important}
  .av{width:56px;height:56px;min-width:56px;min-height:56px}
  .av-fb{width:56px;height:56px;min-width:56px;min-height:56px;font-size:20px}
  .uname{font-size:22px!important;word-break:break-word!important;overflow-wrap:break-word!important;max-width:calc(100vw - 48px)!important;display:block}
  .nb-link{padding:7px 10px!important;font-size:11px!important}
  .nb-logo{font-size:13px!important}
  .btl{margin-left:0;margin-top:4px}
  .rnk{flex-wrap:wrap;gap:10px;align-items:center}
  .rnk img{width:38px!important;height:43px!important}
  .rnk span{font-size:13px}
  .bdg{flex-wrap:wrap}
  .sval{font-size:52px}
}
/* Badge glow animations */
@keyframes glow-gold {
  0%,100%{filter:drop-shadow(0 0 4px #f59e0b88) drop-shadow(0 0 8px #f59e0b44)}
  50%{filter:drop-shadow(0 0 10px #f59e0bcc) drop-shadow(0 0 20px #f59e0b66)}
}
@keyframes glow-silver {
  0%,100%{filter:drop-shadow(0 0 4px #94a3b888) drop-shadow(0 0 8px #60a5fa44)}
  50%{filter:drop-shadow(0 0 10px #94a3b8cc) drop-shadow(0 0 20px #60a5fa66)}
}
@keyframes glow-bronze {
  0%,100%{filter:drop-shadow(0 0 4px #cd7f3288) drop-shadow(0 0 8px #cd7f3244)}
  50%{filter:drop-shadow(0 0 10px #cd7f32cc) drop-shadow(0 0 20px #cd7f3266)}
}
@keyframes glow-orange {
  0%,100%{filter:drop-shadow(0 0 4px #f9731688) drop-shadow(0 0 8px #f9731644)}
  50%{filter:drop-shadow(0 0 10px #f97316cc) drop-shadow(0 0 20px #f9731666)}
}
@keyframes glow-green {
  0%,100%{filter:drop-shadow(0 0 4px #4ade8088) drop-shadow(0 0 8px #4ade8044)}
  50%{filter:drop-shadow(0 0 10px #4ade80cc) drop-shadow(0 0 20px #4ade8066)}
}
@keyframes glow-amber {
  0%,100%{filter:drop-shadow(0 0 4px #d9770688) drop-shadow(0 0 8px #f59e0b44)}
  50%{filter:drop-shadow(0 0 12px #d97706cc) drop-shadow(0 0 22px #f59e0b88)}
}
.badge-gold    {animation:glow-gold   2.5s ease-in-out infinite}
.badge-silver  {animation:glow-silver 2.5s ease-in-out infinite}
.badge-bronze  {animation:glow-bronze 2.5s ease-in-out infinite}
.badge-orange  {animation:glow-orange 2.5s ease-in-out infinite}
.badge-green   {animation:glow-green  2.5s ease-in-out infinite}
.badge-amber   {animation:glow-amber  2.8s ease-in-out infinite}</style>
</head>
<body>
<div class="wrap">

<nav class="navbar">
  <a class="nb-logo" href="https://brdbscoreapi.ace-d89.workers.dev/leaderboard-page">⭐ <span>BRDb</span></a>
  <div class="nb-links">
    <a class="nb-link active" href="#">👤 Profile</a>
    <a class="nb-link" href="/notifications/${uid}">🔔 Notification</a>
    <a class="nb-link" href="https://brdbscoreapi.ace-d89.workers.dev/leaderboard-page">🏆 Leaderboard</a>
  </div>
</nav>

<div class="hdr a1">
  <img class="av" src="${avatarSrc}" alt="${username}"
    onerror="if(this.src.endsWith('.png')){this.src=this.src.replace('.png','.jpg')}else{this.style.display='none';this.nextElementSibling.style.display='flex'}">
  <div class="av-fb" style="display:none">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
      <defs>
        <linearGradient id="avG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${(['#1e3a5f','#1a3a2a','#2d1b4e','#3a1f0e','#0e2a3a','#2a1a3a','#1a2a0e','#3a2a0e'][parseInt(uid) % 8])}"/>
          <stop offset="100%" style="stop-color:${(['#0f172a','#0f1f15','#1a0f2e','#1f0f07','#071525','#150f1f','#0f1507','#1f150f'][parseInt(uid) % 8])}"/>
        </linearGradient>
        <linearGradient id="avA" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${(['#f59e0b','#3b82f6','#a78bfa','#f97316','#06b6d4','#ec4899','#22c55e','#84cc16'][parseInt(uid) % 8])};stop-opacity:0.5"/>
          <stop offset="100%" style="stop-color:${(['#f59e0b','#3b82f6','#a78bfa','#f97316','#06b6d4','#ec4899','#22c55e','#84cc16'][parseInt(uid) % 8])};stop-opacity:0.15"/>
        </linearGradient>
      </defs>
      <clipPath id="circ"><circle cx="40" cy="40" r="40"/></clipPath>
      <g clip-path="url(#circ)">
      <rect width="80" height="80" fill="url(#avG)"/>
      <rect width="80" height="80" fill="url(#avA)"/>
      <circle cx="40" cy="26" r="13" fill="rgba(255,255,255,0.18)"/>
      <path d="M12,78 Q12,52 40,52 Q68,52 68,78 Z" fill="rgba(255,255,255,0.18)"/>
      </g>
    </svg>
  </div>
  <div class="hdr-info" style="flex:1;min-width:0;width:100%">
    <div class="uname">${username}</div>
    <div class="uid">UID: ${uid} · Bitcointalk</div>
    <div class="bdg">
      <span class="b bs">${statusEmoji} ${status}${wipedBadge}</span>
      ${localBoard ? `<span class="b bb">${boardFlags[localBoard] || '🌍'} ${localBoard}</span>` : ''}
      ${topBoards.map(b => {
        const icons = {'Gambling discussion':'🎲','Other languages/locations':'🌐','Games and rounds':'🎮','Investor-based games':'🎯','Speculation':'📈','Speculation (Altcoins)':'📈','Trading Discussion':'💹','Trading, analisi e speculazione':'💹','Trading y especulación':'💹','Mining':'⛏️','Mining support':'⛏️','Mining (Altcoins)':'⛏️','Marketplace':'🛒','Altcoin Discussion':'🪙','Economics':'💰','Off-topic':'💬','Serious discussion':'🎓','Meta':'🔧','Politics & Society':'🏛️','Beginners & Help':'🆕','Development & Technical Discussion':'💻','Announcements (Altcoins)':'📢','Services':'🔌','Scam Accusations':'🚨','Reputation':'🔍','Legal':'⚖️','Press':'📰','Project Development':'🚀','Guide (Italiano)':'📖','Progetti':'🚀','Ivory Tower':'🏰'};
        return `<span class="b" style="color:#94a3b8;background:#94a3b818;border-color:#94a3b8">${icons[b]||'📌'} ${b}</span>`;
      }).join('')}
    </div>
    
  </div>
      <a class="btl" href="https://bitcointalk.org/index.php?action=profile;u=${uid}" target="_blank">⛓ Bitcointalk</a>
</div>
${ranks.total ? `<div style="background:var(--s);border:1px solid var(--b);border-radius:18px;padding:14px 20px;margin-bottom:20px" class="a2"><div style="font-size:10px;font-weight:700;color:#475569;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Ranks</div><div style="height:1px;background:var(--b);margin-bottom:14px"></div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center"><span style="display:inline-flex;align-items:center;gap:8px"><span style="display:inline-flex;flex-direction:column;align-items:center;gap:4px"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAgMTIwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ic3RlZWxfb3V0ZXIiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOWNhM2FmIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZTVlN2ViIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzZiNzI4MCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ic3RlZWxfaW5uZXIiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMWUyOTNiIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzBmMTcyYSIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ic3RlZWxfdGV4dCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmMWY1ZjkiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI1MCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZmZmZmYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojY2JkNWUxIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0iZ2xvd19zdGVlbCI+CiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjMiIHJlc3VsdD0iYiIvPgogICAgICA8ZmVNZXJnZT48ZmVNZXJnZU5vZGUgaW49ImIiLz48ZmVNZXJnZU5vZGUgaW49IlNvdXJjZUdyYXBoaWMiLz48L2ZlTWVyZ2U+CiAgICA8L2ZpbHRlcj4KICA8L2RlZnM+CiAgPHBvbHlnb24gcG9pbnRzPSI2MCw0IDEwOCwzMCAxMDgsOTAgNjAsMTE2IDEyLDkwIDEyLDMwIiBmaWxsPSJ1cmwoI3N0ZWVsX291dGVyKSIvPgogIDxwb2x5Z29uIHBvaW50cz0iNjAsMTIgMTAwLDM0IDEwMCw4NiA2MCwxMDggMjAsODYgMjAsMzQiIGZpbGw9InVybCgjc3RlZWxfaW5uZXIpIi8+CiAgPHBvbHlnb24gcG9pbnRzPSI2MCwxNCAxMDAsMzYgODAsMzYgNDYsMjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNykiLz4KICA8dGV4dCB4PSI2MCIgeT0iNzIiIGZvbnQtZmFtaWx5PSJHZW9yZ2lhLHNlcmlmIiBmb250LXNpemU9IjM4IiBmb250LXdlaWdodD0iOTAwIgogICAgICAgIGZpbGw9InVybCgjc3RlZWxfdGV4dCkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbHRlcj0idXJsKCNnbG93X3N0ZWVsKSIKICAgICAgICBsZXR0ZXItc3BhY2luZz0iLTEiPkJSPC90ZXh0Pgo8L3N2Zz4=" style="width:80px;height:80px"><span style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:1px">BRDb</span></span><span style="font-size:18px;font-weight:900;color:#e5e7eb">#${ranks.BRDb.toLocaleString()}</span></span><span style="color:#334155;font-size:14px">·</span><span style="display:inline-flex;align-items:center;gap:8px"><span style="display:inline-flex;flex-direction:column;align-items:center;gap:4px"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAgMTIwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ29sZF9vdXRlciIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmY2QzNGQiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIzMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZWYwOGEiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI2MCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmNTllMGIiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojYjQ1MzA5Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJnb2xkX2lubmVyIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzFjMWEwYSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwZjBkMDUiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdvbGRfdGV4dCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZWY5YzMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI1MCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZGUwNDciLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjU5ZTBiIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0iZ2xvd19nb2xkIj4KICAgICAgPGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMyIgcmVzdWx0PSJiIi8+CiAgICAgIDxmZU1lcmdlPjxmZU1lcmdlTm9kZSBpbj0iYiIvPjxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIvPjwvZmVNZXJnZT4KICAgIDwvZmlsdGVyPgogIDwvZGVmcz4KICA8cGF0aCBkPSJNNjAsNCBMMTA4LDIwIEwxMDgsNzIgUTEwOCwxMDQgNjAsMTE2IFExMiwxMDQgMTIsNzIgTDEyLDIwIFoiIGZpbGw9InVybCgjZ29sZF9vdXRlcikiLz4KICA8cGF0aCBkPSJNNjAsMTMgTDEwMCwyNyBMMTAwLDcxIFExMDAsOTggNjAsMTA4IFEyMCw5OCAyMCw3MSBMMjAsMjcgWiIgZmlsbD0idXJsKCNnb2xkX2lubmVyKSIvPgogIDxwYXRoIGQ9Ik02MCwxNSBMMTAwLDI5IEw4MCwyOSBMNTAsMTggWiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEyKSIvPgogIDx0ZXh0IHg9IjYwIiB5PSI3NCIgZm9udC1mYW1pbHk9Ikdlb3JnaWEsc2VyaWYiIGZvbnQtc2l6ZT0iMzgiIGZvbnQtd2VpZ2h0PSI5MDAiCiAgICAgICAgZmlsbD0idXJsKCNnb2xkX3RleHQpIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWx0ZXI9InVybCgjZ2xvd19nb2xkKSIKICAgICAgICBsZXR0ZXItc3BhY2luZz0iLTEiPlJFPC90ZXh0Pgo8L3N2Zz4=" style="width:80px;height:80px"><span style="font-size:11px;font-weight:700;color:#fbbf24;letter-spacing:1px">Reputation</span></span><span style="font-size:18px;font-weight:900;color:#fbbf24">#${ranks.Reputation.toLocaleString()}</span></span><span style="color:#334155;font-size:14px">·</span><span style="display:inline-flex;align-items:center;gap:8px"><span style="display:inline-flex;flex-direction:column;align-items:center;gap:4px"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAgMTIwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZGlhX291dGVyIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzkzYzVmZCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjMwJSIgc3R5bGU9InN0b3AtY29sb3I6I2JmZGJmZSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjcwJSIgc3R5bGU9InN0b3AtY29sb3I6IzNiODJmNiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZDRlZDgiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImRpYV9pbm5lciIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwNjBlMWYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMDMwNzEyIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJkaWFfdGV4dCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNlMGYyZmUiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI1MCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM3ZGQzZmMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMzhiZGY4Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0iZ2xvd19kaWEiPgogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzIiByZXN1bHQ9ImIiLz4KICAgICAgPGZlTWVyZ2U+PGZlTWVyZ2VOb2RlIGluPSJiIi8+PGZlTWVyZ2VOb2RlIGluPSJTb3VyY2VHcmFwaGljIi8+PC9mZU1lcmdlPgogICAgPC9maWx0ZXI+CiAgPC9kZWZzPgogIDxwb2x5Z29uIHBvaW50cz0iNjAsNCAxMTYsNjAgNjAsMTE2IDQsNjAiIGZpbGw9InVybCgjZGlhX291dGVyKSIvPgogIDxwb2x5Z29uIHBvaW50cz0iNjAsMTQgMTA2LDYwIDYwLDEwNiAxNCw2MCIgZmlsbD0idXJsKCNkaWFfaW5uZXIpIi8+CiAgPHBvbHlnb24gcG9pbnRzPSI2MCwxNiAxMDYsNjIgODIsMzgiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz4KICA8cG9seWdvbiBwb2ludHM9IjYwLDE2IDM4LDM4IDE0LDYyIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDQpIi8+CiAgPHRleHQgeD0iNjAiIHk9IjcyIiBmb250LWZhbWlseT0iR2VvcmdpYSxzZXJpZiIgZm9udC1zaXplPSIzOCIgZm9udC13ZWlnaHQ9IjkwMCIKICAgICAgICBmaWxsPSJ1cmwoI2RpYV90ZXh0KSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsdGVyPSJ1cmwoI2dsb3dfZGlhKSIKICAgICAgICBsZXR0ZXItc3BhY2luZz0iLTEiPklNPC90ZXh0Pgo8L3N2Zz4=" style="width:80px;height:80px"><span style="font-size:11px;font-weight:700;color:#60a5fa;letter-spacing:1px">Impact</span></span><span style="font-size:18px;font-weight:900;color:#60a5fa">#${ranks.impact.toLocaleString()}</span></span></div></div>` : ""}
${renderBadgesSection(d, ranks, awardData)}

<div class="hero a2">
  <div class="hero-clip"><div class="hero-sweep"></div><div class="hero-glow"></div></div>
  <div class="slbl">BRDb Score</div>
  <div class="sval">⭐${BRDb}</div>
  <div class="ssub">Reputation: <b style="color:${color}">${Reputation}</b> &nbsp;·&nbsp; Reliability: <b style="color:#22c55e">${Reliability}%</b></div>
  ${trustScore && trustScore.score > 0 ? `<div class="ssub" style="margin-top:6px">Trust Score: <b style="color:#a78bfa">${trustScore.score.toFixed(2)}</b> <span style="color:#475569;font-size:11px">(based on ${trustScore.senders} senders)</span></div>` : ''}
  <div class="upd">
    Last updated: ${updatedAt}
    ${etaStr ? '· 🔄 Next update in <b>' + etaStr + '</b> <span title="Queue #' + queuePos + ' of ' + queueTotal + '" class="queue-bar-wrap"><span class="queue-bar-fill" style="width:' + queuePct + '%"></span></span>' : ''}
  </div>
</div>

<div class="ptabs a3">
  <button class="ptab active" onclick="profileTab('overview')">📊 BRDb Overview</button>
  <button class="ptab" onclick="profileTab('merit')">🏅 Merit Stats</button>
</div>

<div id="ppane-overview" class="ppane active">
<div class="sec">📊 Core Stats</div>
<div class="g3 a3">
  <div class="c"><div class="cl">Posts (120d)</div><div class="cv" style="color:#3b82f6">${posts120}</div><div class="cs">Total: ${postsTotal}</div></div>
  <div class="c"><div class="cl">Merits ↓ (120d)</div><div class="cv" style="color:#22c55e">${merit120}</div><div class="cs">Earned: ${meritTotal}</div></div>
  <div class="c"><div class="cl">Merits ↑ (120d)</div><div class="cv" style="color:#f59e0b">${sent120}</div><div class="cs">Sent/Recv: ${sentRatio}</div></div>
  <div class="c"><div class="cl">Merit/Post (All)</div><div class="cv">${avg_all}</div><div class="cs">120d: ${avg_120}</div></div>
  <div class="c"><div class="cl">Active Days</div><div class="cv">${activeDays}<span style="font-size:13px;color:var(--mut)">/120</span></div><div class="cs">Consistency: ${consistency}%</div></div>
  <div class="c"><div class="cl">Impact</div><div class="cv">${impactAll}</div><div class="cs">120d: ${impact120}</div></div>
</div>

<div class="sec a4">📈 Activity Analytics</div>
<div class="g2 a4">
  <div class="c"><div class="cl">Recent Merit Activity</div><div class="cv" style="color:#22c55e">${recentMerit}%</div><div class="cs">of total in 120d</div></div>
  <div class="c"><div class="cl">Recent Post Activity</div><div class="cv" style="color:#3b82f6">${recentPost}%</div><div class="cs">of total in 120d</div></div>
  <div class="c"><div class="cl">Merit Trend ${trendIcon(parseFloat(meritTrend))}</div><div class="cv" style="color:${trendColor(parseFloat(meritTrend))}">${meritTrend}x</div><div class="cs">vs lifetime avg</div></div>
  <div class="c"><div class="cl">Post Trend ${trendIcon(parseFloat(postTrend))}</div><div class="cv" style="color:${trendColor(parseFloat(postTrend))}">${postTrend}x</div><div class="cs">vs lifetime avg</div></div>
</div>

<div class="sec a5">⚡ Rate Comparison</div>
<div class="a5">
  <div class="rr"><div class="rs"><div class="rv" style="color:#22c55e">${rMR}</div><div class="rl">Merit/day (120d)</div></div><div class="rvs">vs</div><div class="rs"><div class="rv" style="color:#60a5fa">${hMR}</div><div class="rl">Merit/day (all-time)</div></div></div>
  <div class="rr"><div class="rs"><div class="rv" style="color:#3b82f6">${rPR}</div><div class="rl">Posts/day (120d)</div></div><div class="rvs">vs</div><div class="rs"><div class="rv" style="color:#60a5fa">${hPR}</div><div class="rl">Posts/day (all-time)</div></div></div>
</div>

<div class="sec a5" style="margin-top:24px">📈 BRDb History</div>
<div class="a5" id="history-wrap">
  <div id="history-loading" style="background:var(--s);border:1px solid var(--b);border-radius:13px;padding:20px;text-align:center;color:var(--mut);font-size:13px">
    <div class="hspin"></div>Loading history...
  </div>
</div>

<div class="foot" style="margin-top:44px">
  <p>BRDb Score · Data by BRDb Scraper</p>
  <p style="margin-top:5px">Scores refreshed daily · <a href="https://bitcointalk.org/index.php?action=profile;u=${uid}" target="_blank">View on Bitcointalk</a></p>
</div>

</div>
</div><!-- /ppane-overview -->

<div id="ppane-merit" class="ppane">
  <div id="merit-content" style="text-align:center;padding:40px;color:var(--mut)">
    <div style="font-size:32px;margin-bottom:12px">🎖6️</div>
    <div style="font-size:14px">Loading merit data...</div>
  </div>
</div>

<script>
(async () => {
  const wrap = document.getElementById('history-wrap');
  try {
    const res = await fetch('https://brdbscoreapi.ace-d89.workers.dev/history?uid=${uid}&limit=90');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const history = (json.history || []).reverse();
    if (history.length < 2) {
      wrap.innerHTML = '<div style="background:var(--s);border:1px solid var(--b);border-radius:13px;padding:20px;text-align:center;color:var(--mut);font-size:13px">Not enough history data yet (' + history.length + ' snapshots)</div>';
      return;
    }
    const W = Math.min(wrap.offsetWidth - 32, 800);
    const H = 160;
    const PAD = {top:20,right:16,bottom:28,left:40};
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;
    const values = history.map(h => parseFloat(h.BRDb) || 0);
    const dates  = history.map(h => h.snapshot_date || '');
    const minV = Math.max(0, Math.min(...values) - 0.3);
    const maxV = Math.min(10, Math.max(...values) + 0.3);
    const range = maxV - minV || 1;
    const toX = i => PAD.left + (i / (values.length - 1)) * cW;
    const toY = v => PAD.top + cH - ((v - minV) / range) * cH;
    let pathD = '', areaD = '';
    values.forEach((v, i) => {
      const x = toX(i), y = toY(v);
      if (i === 0) { pathD += 'M'+x+','+y; areaD += 'M'+x+','+(PAD.top+cH)+' L'+x+','+y; }
      else { pathD += ' L'+x+','+y; areaD += ' L'+x+','+y; }
    });
    areaD += ' L'+toX(values.length-1)+','+(PAD.top+cH)+' Z';
    const trend = values[values.length-1] - values[0];
    const lc = trend >= 0 ? '#22c55e' : '#ef4444';
    const ticks = [minV, (minV+maxV)/2, maxV];
    const xLabels = [0, Math.floor(values.length/2), values.length-1];
    const lastX = toX(values.length-1), lastY = toY(values[values.length-1]);
    wrap.innerHTML = '<div style="background:var(--s);border:1px solid var(--b);border-radius:13px;padding:16px 16px 8px">'
      + '<svg width="'+W+'" height="'+H+'" style="display:block;overflow:visible">'
      + '<defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="'+lc+'" stop-opacity="0.25"/>'
      + '<stop offset="100%" stop-color="'+lc+'" stop-opacity="0.02"/>'
      + '</linearGradient></defs>'
      + ticks.map(t => '<line x1="'+PAD.left+'" y1="'+toY(t)+'" x2="'+(PAD.left+cW)+'" y2="'+toY(t)+'" stroke="#1e293b" stroke-width="1"/>').join('')
      + '<path d="'+areaD+'" fill="url(#hg)"/>'
      + '<path d="'+pathD+'" fill="none" stroke="'+lc+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>'
      + ticks.map(t => '<text x="'+(PAD.left-6)+'" y="'+(toY(t)+4)+'" text-anchor="end" font-size="10" fill="#64748b" font-family="monospace">'+t.toFixed(1)+'</text>').join('')
      + xLabels.map(i => '<text x="'+toX(i)+'" y="'+(H-4)+'" text-anchor="middle" font-size="10" fill="#64748b" font-family="monospace">'+(dates[i]?dates[i].slice(5):'')+'</text>').join('')
      + '<circle cx="'+lastX+'" cy="'+lastY+'" r="5" fill="'+lc+'" stroke="#060a14" stroke-width="2.5"/>'
      + '<text x="'+lastX+'" y="'+(lastY-10)+'" text-anchor="middle" font-size="11" font-weight="bold" fill="'+lc+'" font-family="monospace">⭐'+values[values.length-1].toFixed(2)+'</text>'
      + '<circle cx="'+toX(0)+'" cy="'+toY(values[0])+'" r="3.5" fill="#475569" stroke="#060a14" stroke-width="2"/>'
      + '</svg>'
      + '<div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--mut);font-family:Space Mono,monospace">'
      + '<span>'+history.length+' snapshots</span>'
      + '<span style="color:'+lc+';font-weight:700">'+(trend>=0?'▲':'▼')+' '+Math.abs(trend).toFixed(2)+' vs start</span>'
      + '<span>'+(dates[0]?dates[0].slice(0,7):'')+' → now</span>'
      + '</div></div>';
  } catch(e) {
    wrap.innerHTML = '<div style="background:var(--s);border:1px solid var(--b);border-radius:13px;padding:20px;text-align:center;color:#ef4444;font-size:13px">Error loading history</div>';
  }
})();

const _WU='https://brdbscoreapi.ace-d89.workers.dev';
const _SC='${color}';
const _ID='${uid}';

function profileTab(t){
  document.querySelectorAll('.ptab').forEach(b=>b.classList.toggle('active',b.textContent.includes(t==='overview'?'BRDb':'Merit')));
  document.getElementById('ppane-overview').classList.toggle('active',t==='overview');
  document.getElementById('ppane-merit').classList.toggle('active',t==='merit');
  if(t==='merit')_lm();
}
let _md=false;
async function _lm(){
  if(_md)return;_md=true;
  const el=document.getElementById('merit-content');
  el.innerHTML='<div style="text-align:center;padding:40px;color:var(--mut)"><div style="font-size:32px;margin-bottom:12px">\u23F3</div><div id="merit-progress" style="font-size:13px">Loading page 1...</div></div>';
  try{
    // Check cache first
    const cacheRes = await fetch(_WU+'/merit-stats-json/'+_ID);
    if(cacheRes.ok){
      const cacheData = await cacheRes.json();
      if(cacheData.recv_total !== undefined){
        el.innerHTML=_rm(cacheData);
        return;
      }
    }

    const recvM=[], sentM=[];
    let recvTotal=0, sentTotal=0;
    let dbRecvTotal=0, dbSentTotal=0, dbRecv120=0, dbSent120=0;

    // Fetch all pages with 200ms pause — browser has no timeout
    async function fetchAll(type, arr) {
      let page=1, total=0;
      while(true){
        const r=await fetch(_WU+'/merit-proxy/'+_ID+'?type='+type+'&page='+page);
        if(!r.ok) break;
        const d=await r.json();
        if(page===1){
          total=d.totalHits||0;
          if(type==='receiver'){ dbRecvTotal=d.db_recv_total||0; dbRecv120=d.db_recv_120||0; }
        }
        arr.push(...(d.merits||[]));
        const prog=document.getElementById('merit-progress');
        if(prog) prog.textContent='Loading '+type+' merit... page '+page+' of '+Math.ceil(total/100)+' ('+arr.length+' tx)';
        if(!d.hasNextPage) break;
        page++;
        await new Promise(res=>setTimeout(res,150));
      }
    }

    await fetchAll('receiver', recvM);
    await fetchAll('sender', sentM);
    recvTotal = dbRecvTotal || recvM.reduce((s,m)=>s+m.amount,0);
    sentTotal = dbSentTotal || sentM.reduce((s,m)=>s+m.amount,0);
    const prog2=document.getElementById('merit-progress');
    if(prog2) prog2.textContent='recv: '+recvM.length+' tx, '+recvTotal+' merit | sent: '+sentM.length+' tx, '+sentTotal+' merit | db_recv: '+dbRecvTotal;

    // Aggregate
    const sMap={}, rMap={}, bMap={}, bId={}, pMap={};
    const cutoff=new Date(Date.now()-120*86400000);
    let recv120=0, sent120=0;

    for(const m of recvM){
      if(!sMap[m.sender_uid]) sMap[m.sender_uid]={username:m.sender,uid:m.sender_uid,total:0};
      sMap[m.sender_uid].total+=m.amount;
      const bn=m.board_id;
      bMap[bn]=(bMap[bn]||0)+m.amount;
      if(!pMap[m.post_id]) pMap[m.post_id]={post_id:m.post_id,topic_id:m.topic_id,title:m.title,board_id:m.board_id,merits:0,date:m.date};
      pMap[m.post_id].merits+=m.amount;
      if(new Date(m.date)>=cutoff) recv120+=m.amount;
    }
    for(const m of sentM){
      if(!rMap[m.receiver_uid]) rMap[m.receiver_uid]={username:m.receiver,uid:m.receiver_uid,total:0};
      rMap[m.receiver_uid].total+=m.amount;
      if(new Date(m.date)>=cutoff) sent120+=m.amount;
    }

    const s={
      recv_total: recvTotal,
      sent_total: sentTotal,
      recv_120: recv120,
      sent_120: sent120,
      top_senders: Object.values(sMap).sort((a,b)=>b.total-a.total).slice(0,10),
      all_senders: Object.values(sMap).map(s=>({uid:s.uid,total:s.total})),
      top_receivers: Object.values(rMap).sort((a,b)=>b.total-a.total).slice(0,10),
      top_boards: Object.entries(bMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([bid,total])=>({board_id:parseInt(bid),total,name:null})),
      top_posts: Object.values(pMap).sort((a,b)=>b.merits-a.merits).slice(0,10),
    };
    // Save to cache
    fetch(_WU+'/merit-stats-json/'+_ID, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(s)
    }).catch(()=>{});

    el.innerHTML=_rm(s);
  }catch(e){el.innerHTML='<div style="color:#ef4444;padding:20px;font-size:13px">Error: '+e.message+'<br><small>'+e.stack+'</small></div>';}
}
function _rm(s){
  const bn={1:'Bitcoin Discussion',4:'Bitcoin Technical Support',5:'Marketplace',6:'Development & Technical Discussion',7:'Economics',8:'Trading Discussion',9:'Off-topic',10:'Русский (Russian)',11:'Other languages/locations',12:'Project Development',13:'Français',14:'Mining',16:'Deutsch (German)',17:'Chinese students',18:'Разное',19:'Юристы',20:'Трейдеры',21:'Майнеры',22:'Новички',23:'Бизнес',24:'Meta',25:'Obsolete (buying)',26:'Obsolete (selling)',27:'Español (Spanish)',28:'Italiano (Italian)',29:'Português (Portuguese)',30:'中文 (Chinese)',31:'Mercado y Economía',32:'Hardware y Minería',33:'Esquina Libre',34:'Politics & Society',35:'Biete',36:'Suche',37:'Wallet software',39:'Beginners & Help',40:'Mining support',41:'Pools',42:'Mining software (miners)',44:'CPU/GPU Bitcoin mining hardware',45:'Skandinavisk',46:'Mercato valute',47:'Discussions générales et utilisation du Bitcoin',48:'Mining et Hardware',49:'Place de marché',50:'Hors-sujet',51:'Goods',52:'Services',53:'Currency exchange',54:'Wiki, documentation et traduction',55:'Хайпы',56:'Gambling',57:'Speculation',59:'Archival',60:'Mining (Deutsch)',61:'Trading und Spekulation',62:'Anfänger und Hilfe',63:'Projektentwicklung',64:'Off-Topic (Deutsch)',65:'Lending',66:'Кодеры',67:'Altcoin Discussion',69:'Economia & Mercado',70:'Mineração em Geral',71:'Games and rounds',72:'Альтернативные криптовалюты',73:'Auctions',74:'Legal',75:'Computer hardware',76:'Hardware',77:'Press',78:'Securities',79:'Nederlands (Dutch)',80:'Markt',81:'Mining speculation',82:'한국어 (Korean)',83:'Scam Accusations',84:'Service Announcements',85:'Service Discussion',86:'Meetups',87:'Important Announcements',88:'Long-term offers',89:'India',90:'Идеи',91:'Политика',92:'Корзина',93:'Digital goods',94:'Gokken/lotterijen',95:'עברית (Hebrew)',97:'Armory',98:'Electrum',99:'MultiBit',100:'Bitcoin Wallet for Android',101:'Mercadillo',102:'Mexico',103:'Argentina',104:'España',105:'Centroamerica y Caribe',107:'Beni',108:'Română (Romanian)',109:'Anunturi importante',110:'Offtopic',111:'Market',112:'Tutoriale',113:'Bine ai venit!',114:'Presa',115:'Mining (Italiano)',116:'Mining (Nederlands)',117:'跳蚤市场',118:'山寨币',119:'媒体',120:'Ελληνικά (Greek)',121:'Mining (India)',122:'Marketplace (India)',123:'Regional Languages (India)',124:'Press & News from India',125:'Alt Coins (India)',126:'Buyer/ Seller Reputations (India)',127:'Off-Topic (India)',128:'Новости',129:'Reputation',130:'Primeros pasos y ayuda',131:'Primeiros Passos (Iniciantes)',132:'Alt-Currencies (Italiano)',133:'Türkçe (Turkish)',134:'Brasil',135:'Portugal',136:'Αγορά',137:'Group buys',138:'BitcoinJ',139:'Treffen',140:'Presse ',141:'Auktionen',142:'Polski',143:'Beurzen',144:'Raduni/Meeting (Italiano)',145:'Off-Topic (Italiano)',146:'挖矿',147:'Alt Coins (Nederlands)',148:'Off-topic (Nederlands)',149:'Altcoins (Français)',150:'Meetings (Nederlands)',151:'Altcoins (criptomonedas alternativas)',152:'Altcoins (Deutsch)',153:'Guide (Italiano)',155:'Pazar Alanı',156:'Madencilik',157:'Alternatif Kripto-Paralar',158:'Konu Dışı',159:'Announcements (Altcoins)',160:'Mining (Altcoins)',161:'Marketplace (Altcoins)',162:'Accuse scam/truffe',163:'Tablica ogłoszeń',164:'Alternatywne kryptowaluty',165:'Crittografia e decentralizzazione',166:'Minerit',167:'New forum software',168:'Bitcoin Wiki',169:'Progetti',170:'Mercato',171:'Servizi',172:'Esercizi commerciali',173:'Hardware/Mining (Italiano)',174:'Yeni Başlayanlar & Yardım',175:'Trading, analisi e speculazione',176:'Annunci',177:'Minería de altcoins',178:'Anunturi Monede Alternative',179:'Altcoins (Ελληνικά)',180:'Bitcoin Haberleri',181:'Criptomoedas Alternativas',182:'대체코인 Alt Coins (한국어)',183:'Actualité et News',184:'Vos sites et projets',185:'Работа',186:'Développement et technique',187:'Économie et spéculation',188:'Le Bitcoin et la loi',189:'Ekonomi',190:'Servisler',191:'Bahasa Indonesia (Indonesian)',192:'Altcoins (Bahasa Indonesia)',193:'Jual Beli',194:'Mining (Bahasa Indonesia)',195:'Mining Discussion (Ελληνικά)',196:'离题万里',197:'Service Announcements (Altcoins)',198:'Service Discussion (Altcoins)',199:'Pools (Altcoins)',200:'Gambling (Italiano)',201:'Hrvatski (Croatian)',202:'Servicios',203:'Trading y especulación',204:'Servicios',205:'Discussioni avanzate e sviluppo',206:'Desenvolvimento & Discussões Técnicas',207:'Investor-based games',208:'Débutants',209:'Échanges',210:'Produits et services',211:'Petites annonces',212:'Micro Earnings',217:'Collectibles',219:'Pilipinas',220:'Trgovina',221:'Altcoins (Hrvatski)',222:'Web Wallets',223:'Exchanges',224:'Speculation (Altcoins)',228:'Gambling discussion',229:'Proje Geliştirme',230:'Buluşmalar',231:'Mycelium',232:'Fonlar',234:'Invites & Accounts',235:'Madencilik (Alternatif Kripto-Paralar)',236:'Барахолка',237:'Обменники',238:'Bounties (Altcoins)',239:'Duyurular (Alternatif Kripto-Paralar)',240:'Tokens (Altcoins)',241:'العربية (Arabic)',242:'العملات البديلة (Altcoins)',243:'Altcoins (Pilipinas)',246:'Altcoin Announcements (Ελληνικά)',247:'Altcoin Mining (Ελληνικά)',248:'Токены',250:'Serious discussion',251:'Ivory Tower',252:'日本語 (Japanese)',253:'إستفسارات و أسئلة المبتدئين',254:'Tokens (Español)',255:'アルトコイン',256:'Бayнти и aиpдpoпы',257:'Discutii Servicii',258:'Annonces',259:'Altcoins (Monede Alternative)',260:'Altcoin Announcements (Pilipinas)',261:'Hardware wallets',262:'Oбcyждeниe Bitcoin',263:'Nowe kryptowaluty i tokeny',264:'Tablica ogłoszeń (altcoiny)',265:'النقاشات',266:'التعدين',267:'النقاشات الأخرى',268:'Pamilihan',269:'Marktplatz',270:'Announcements (Deutsch)',271:'منصات التبادل',272:'Off-topic (Hrvatski)',273:'Announcements (Hrvatski)',274:'Others (Pilipinas)',275:'Nigeria (Naija)',276:'Trading dan Spekulasi',277:'Ekonomi, Politik, dan Budaya',278:'Topik Lainnya',279:'Politics and society (Naija)',280:'Off-topic (Naija)'};
  const bN=id=>bn[id]||('Board #'+id);
  const bf={Italian:'\uD83C\uDDEE\uD83C\uDDF9',German:'\uD83C\uDDE9\uD83C\uDDEA',Spanish:'\uD83C\uDDEA\uD83C\uDDF8',French:'\uD83C\uDDEB\uD83C\uDDF7',Portuguese:'\uD83C\uDDE7\uD83C\uDDF7',Russian:'\uD83C\uDDF7\uD83C\uDDFA',Turkish:'\uD83C\uDDF9\uD83C\uDDF7',Croatian:'\uD83C\uDDED\uD83C\uDDF7',Indonesian:'\uD83C\uDDEE\uD83C\uDDE9',Filipino:'\uD83C\uDDF5\uD83C\uDDED',Arabic:'\uD83C\uDDF8\uD83C\uDDE6',Nigerian:'\uD83C\uDDF3\uD83C\uDDEC',Mandarin:'\uD83C\uDDE8\uD83C\uDDF3',Japanese:'\uD83C\uDDEF\uD83C\uDDF5',Korean:'\uD83C\uDDF0\uD83C\uDDF7',Dutch:'\uD83C\uDDF3\uD83C\uDDF1',Polish:'\uD83C\uDDF5\uD83C\uDDF1',Romanian:'\uD83C\uDDF7\uD83C\uDDF4',Greek:'\uD83C\uDDEC\uD83C\uDDF7',India:'\uD83C\uDDEE\uD83C\uDDF3',Hebrew:'\uD83C\uDDEE\uD83C\uDDF1'};
  const uR=(u,i)=>'<div class="m-row"><span style="font-family:monospace;color:var(--mut);font-size:12px;min-width:22px">#'+(i+1)+'</span><a href="'+_WU+'/profile/'+u.uid+'" style="flex:1;color:var(--txt);text-decoration:none;font-weight:600;font-size:13px">'+u.username+'</a><span style="font-family:monospace;color:'+_SC+';font-weight:700">'+u.total+'</span></div>';
  const bR=b=>'<div class="m-row"><span style="font-size:16px">'+(bf[b.name]||'\uD83C\uDF10')+'</span><span style="flex:1;color:var(--txt);font-size:13px">'+bN(b.board_id)+'</span><span style="font-family:monospace;color:'+_SC+';font-weight:700">'+b.total+'</span></div>';
  const pR=(p,i)=>'<div style="padding:10px 0;border-bottom:1px solid var(--b);display:flex;align-items:flex-start;gap:10px"><span style="font-family:monospace;color:var(--mut);font-size:12px;min-width:22px;margin-top:2px">#'+(i+1)+'</span><div style="flex:1;min-width:0"><a href="https://bitcointalk.org/index.php?topic='+p.topic_id+'.msg'+p.post_id+'#msg'+p.post_id+'" target="_blank" style="color:#60a5fa;text-decoration:none;font-size:12px;font-weight:600;display:block;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(p.title||'Post #'+p.post_id)+'</a><span style="font-size:11px;color:var(--mut)">'+bN(p.board_id)+' \u00b7 '+(p.date?p.date.split('T')[0]:'')+'</span></div><span style="font-family:monospace;color:'+_SC+';font-weight:700;white-space:nowrap">+'+p.merits+'</span></div>';
  const ratio=s.recv_total>0?((s.sent_total/s.recv_total)*100).toFixed(0)+'%':'\u2014';
  const nd='<div style="color:var(--mut);font-size:13px">No data</div>';
  return '<div class="m-sum"><div class="m-sc"><div class="m-sv" style="color:'+_SC+'">'+(s.recv_total||0).toLocaleString()+'</div><div class="m-sl">Merit Received</div></div><div class="m-sc"><div class="m-sv" style="color:'+_SC+'">'+(s.sent_total||0).toLocaleString()+'</div><div class="m-sl">Merit Sent</div></div><div class="m-sc"><div class="m-sv" style="color:'+_SC+'">'+(s.recv_120||0).toLocaleString()+'</div><div class="m-sl">Received (120d)</div></div><div class="m-sc"><div class="m-sv" style="color:'+_SC+'">'+(s.sent_120||0).toLocaleString()+'</div><div class="m-sl">Sent (120d)</div></div></div>'
    +'<div class="m-g2"><div class="m-card"><div class="m-ct">\uD83C\uDFC5 Top Senders</div>'+(s.top_senders.length?s.top_senders.map(uR).join(''):nd)+'</div><div class="m-card"><div class="m-ct">\uD83C\uDF81 Top Receivers</div>'+(s.top_receivers.length?s.top_receivers.map(uR).join(''):nd)+'</div></div>'
    +'<div class="m-g2"><div class="m-card"><div class="m-ct">\uD83C\uDF0D Merit by Board</div>'+(s.top_boards.length?s.top_boards.map(bR).join(''):nd)+'</div><div class="m-card" style="display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px"><div style="font-size:40px">\uD83D\uDCCA</div><div style="font-size:12px;color:var(--mut)">Sent / Received ratio</div><div style="font-size:32px;font-weight:800;font-family:monospace;color:'+_SC+'">'+ratio+'</div><div style="font-size:11px;color:var(--mut)">merit sent vs received</div></div></div>'
    +'<div class="m-card"><div class="m-ct">\uD83D\uDCDD Most Merited Posts</div>'+(s.top_posts.length?s.top_posts.map(pR).join(''):nd)+'</div>';
}

</script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// generateLeaderboardHTML — leaderboard page with global + local tabs
// ═══════════════════════════════════════════════════════════════
function generateHomepageHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BRDb — Bitcointalk Reputation Database</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { background: #060a14; background-image: linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px); background-size: 40px 40px; background-attachment: fixed; min-height: 100%; }
  body { font-family: 'Syne', sans-serif; color: #e2e8f0; min-height: 100vh; display: flex; flex-direction: column; }
  nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 32px; border-bottom: 1px solid rgba(255,255,255,.07); }
  .nb-logo { font-size: 20px; font-weight: 800; color: #fbbf24; text-decoration: none; }
  .nb-logo span { color: #e2e8f0; }
  .nb-links { display: flex; gap: 24px; }
  .nb-link { color: #94a3b8; text-decoration: none; font-size: 14px; font-weight: 600; transition: color .2s; }
  .nb-link:hover { color: #e2e8f0; }
  .hero { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 24px; text-align: center; }
  .hero-title { font-size: clamp(36px, 7vw, 80px); font-weight: 800; line-height: 1.1; margin-bottom: 16px; }
  .hero-title span { color: #fbbf24; }
  .hero-sub { color: #64748b; font-size: 18px; margin-bottom: 48px; max-width: 500px; }
  .search-wrap { width: 100%; max-width: 560px; position: relative; }
  .search-input { width: 100%; padding: 18px 24px; font-size: 18px; font-family: 'Space Mono', monospace; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; color: #e2e8f0; outline: none; transition: border-color .2s; }
  .search-input:focus { border-color: #fbbf24; }
  .search-input::placeholder { color: #475569; }
  .autocomplete { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #0f172a; border: 1px solid rgba(255,255,255,.12); border-radius: 10px; overflow: hidden; z-index: 100; display: none; }
  .ac-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; cursor: pointer; transition: background .15s; text-decoration: none; color: inherit; }
  .ac-item:hover { background: rgba(255,255,255,.06); }
  .ac-left { display: flex; align-items: center; gap: 10px; }
  .ac-username { font-weight: 700; font-size: 15px; }
  .ac-uid { font-size: 12px; color: #475569; font-family: 'Space Mono', monospace; }
  .ac-right { display: flex; align-items: center; gap: 8px; }
  .ac-brdb { font-family: 'Space Mono', monospace; font-weight: 700; color: #fbbf24; font-size: 14px; }
  .ac-status { font-size: 11px; padding: 2px 8px; border-radius: 20px; background: rgba(255,255,255,.08); }
  .search-hint { margin-top: 16px; color: #334155; font-size: 13px; }
  .stats-bar { display: flex; gap: 32px; margin-top: 64px; }
  .stat { text-align: center; }
  .stat-val { font-size: 28px; font-weight: 800; color: #fbbf24; font-family: 'Space Mono', monospace; }
  .stat-label { font-size: 12px; color: #475569; margin-top: 4px; }
  @media (max-width: 480px) { .stats-bar { gap: 20px; } .stat-val { font-size: 22px; } }
</style>
</head>
<body>
<nav>
  <a class="nb-logo" href="/">⭐ <span>BRDb</span></a>
  <div class="nb-links">
    <a class="nb-link" href="/leaderboard-page">🏆 Leaderboard</a>
  </div>
</nav>
<div class="hero">
  <h1 class="hero-title">Bitcointalk<br><span>Reputation</span> Database</h1>
  <p class="hero-sub">Search any Bitcointalk user to see their BRDb score, reputation and activity stats.</p>
  <div class="search-wrap">
    <input class="search-input" id="searchInput" type="text" placeholder="Username or User ID..." autocomplete="off" spellcheck="false">
    <div class="autocomplete" id="autocomplete"></div>
  </div>
  <p class="search-hint">Press Enter to search · Click a suggestion to open profile</p>
  <div class="stats-bar" id="statsBar">
    <div class="stat"><div class="stat-val" id="statUsers">—</div><div class="stat-label">Users Tracked</div></div>
    <div class="stat"><div class="stat-val" id="statAvg">—</div><div class="stat-label">Avg BRDb Score</div></div>
    <div class="stat"><div class="stat-val" id="statBoards">—</div><div class="stat-label">Local Boards</div></div>
  </div>
</div>
<script>
const WORKER = 'https://brdbscoreapi.ace-d89.workers.dev';
const input = document.getElementById('searchInput');
const ac = document.getElementById('autocomplete');
let debounce;

input.addEventListener('input', () => {
  clearTimeout(debounce);
  const q = input.value.trim();
  if (q.length < 2) { ac.style.display = 'none'; return; }
  debounce = setTimeout(() => fetchSuggestions(q), 200);
});

input.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const q = input.value.trim();
    if (!q) return;
    const num = /^\\d+$/.test(q);
    window.location.href = num ? WORKER + '/profile/' + q : WORKER + '/profile/search?username=' + encodeURIComponent(q);
  }
  if (e.key === 'Escape') { ac.style.display = 'none'; }
});

document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) ac.style.display = 'none'; });

async function fetchSuggestions(q) {
  try {
    const res = await fetch(WORKER + '/search?q=' + encodeURIComponent(q));
    const data = await res.json();
    const results = data.results || [];
    if (!results.length) { ac.style.display = 'none'; return; }
    ac.innerHTML = results.map(u => {
      const flag = {Italian:'🇮🇹',German:'🇩🇪',Spanish:'🇪🇸',French:'🇫🇷',Portuguese:'🇧🇷',Russian:'🇷🇺',Turkish:'🇹🇷',Dutch:'🇳🇱',Polish:'🇵🇱',Romanian:'🇷🇴',Greek:'🇬🇷',Croatian:'🇭🇷',Mandarin:'🇨🇳',Japanese:'🇯🇵',Korean:'🇰🇷',Arabic:'🇸🇦',Indonesian:'🇮🇩',Filipino:'🇵🇭',Nigerian:'🇳🇬',India:'🇮🇳',Scandinavian:'🇸🇪',Hebrew:'🇮🇱'}[u.local_board] || '';
      return \`<a class="ac-item" href="\${WORKER}/profile/\${u.uid}">
        <div class="ac-left">
          <span class="ac-username">\${u.username || 'uid:'+u.uid}</span>
          \${flag ? '<span>'+flag+'</span>' : ''}
          <span class="ac-uid">#\${u.uid}</span>
        </div>
        <div class="ac-right">
          <span class="ac-brdb">⭐\${(u.BRDb||0).toFixed(1)}</span>
          <span class="ac-status" style="color:\${u.color||'#94a3b8'}">\${u.status||''}</span>
        </div>
      </a>\`;
    }).join('');
    ac.style.display = 'block';
  } catch(e) { ac.style.display = 'none'; }
}

// Load stats
fetch(WORKER + '/stats').then(r => r.json()).then(d => {
  document.getElementById('statUsers').textContent = (d.total_users || 0).toLocaleString();
  document.getElementById('statAvg').textContent = (d.avg_brdb || 0).toFixed(2);
  document.getElementById('statBoards').textContent = d.local_boards_count || 0;
}).catch(() => {});
</script>
</body>
</html>`;
}

function generateLeaderboardHTML() {
  const WORKER = 'https://brdbscoreapi.ace-d89.workers.dev';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BRDb Leaderboard</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#060a14;--s:#0d1526;--s2:#111c35;--b:#1e2d4a;
  --acc:#3b82f6;--gold:#f59e0b;--txt:#e2e8f0;--mut:#64748b;
}
*{margin:0;padding:0;box-sizing:border-box}
html{background:#060a14;background-image:linear-gradient(rgba(59,130,246,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.025) 1px,transparent 1px);background-size:48px 48px;background-attachment:fixed}
body{background:transparent;color:var(--txt);font-family:'Syne',sans-serif;min-height:100vh}

.wrap{max-width:1000px;margin:0 auto;padding:32px 16px 80px;position:relative;z-index:1}

/* Header */
.site-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:36px;flex-wrap:wrap;gap:12px}
.logo{font-size:22px;font-weight:800;color:#fff;letter-spacing:-1px}
.logo span{color:var(--gold)}
.nav-link{color:var(--mut);text-decoration:none;font-size:13px;font-weight:600;
  padding:7px 14px;border-radius:8px;border:1px solid var(--b);transition:all .2s}
.nav-link:hover{color:var(--txt);border-color:var(--acc)}
.nav-link.active{color:var(--acc);border-color:var(--acc)}

/* Hero */
.hero{text-align:center;margin-bottom:36px}
.hero h1{font-size:48px;font-weight:800;line-height:1;letter-spacing:-2px;margin-bottom:8px}
.hero h1 span{color:var(--gold)}
.hero p{color:var(--mut);font-size:14px}

/* Tabs */
.tabs{display:flex;gap:2px;background:var(--s2);border-radius:12px;padding:4px;margin-bottom:24px;width:100%;box-sizing:border-box;overflow:hidden}
.tab{padding:9px 8px;border-radius:9px;border:none;background:none;color:var(--mut);font-size:12px;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;transition:all .2s;flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.tab.active{background:var(--acc);color:#fff}

/* Sort buttons */
.sort-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;align-items:center}
.sort-btn{padding:6px 14px;border-radius:8px;border:1px solid var(--b);background:var(--s2);
  color:var(--mut);font-size:12px;font-weight:600;font-family:'Syne',sans-serif;cursor:pointer;transition:all .2s}
.sort-btn.active{background:var(--acc);color:#fff;border-color:var(--acc)}
.sort-label{font-size:11px;color:var(--mut);letter-spacing:2px;text-transform:uppercase;margin-right:4px}

/* Board selector */
.board-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:24px}
.board-card{background:var(--s);border:1px solid var(--b);border-radius:11px;padding:12px 14px;
  cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:8px}
.board-card:hover{border-color:var(--acc);background:var(--s2)}
.board-card.active{border-color:var(--acc);background:#1e3a5f}
.board-flag{font-size:20px}
.board-name{font-size:13px;font-weight:700}
.board-count{font-size:10px;color:var(--mut);margin-top:1px}

/* Table */
.lb-table{width:100%;border-collapse:collapse}
.lb-table th{font-size:10px;letter-spacing:2px;color:var(--mut);text-transform:uppercase;
  padding:10px 14px;border-bottom:1px solid var(--b);text-align:left;font-weight:600}
.lb-table th.r{text-align:right}
.lb-row{border-bottom:1px solid rgba(30,45,74,.5);transition:background .15s;cursor:pointer}
.lb-row:hover{background:var(--s2)}
.lb-row td{padding:12px 14px;font-size:13px}
.lb-row td.r{text-align:right;font-family:'Space Mono',monospace}
.rank{font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:var(--mut);min-width:36px}
.rank.g1{color:#fbbf24}.rank.g2{color:#9ca3af}.rank.g3{color:#cd7f32}
.uname{font-weight:700;color:var(--txt);text-decoration:none;transition:color .15s}
.uname:hover{color:var(--acc)}
.status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;flex-shrink:0}
.score-val{font-family:'Space Mono',monospace;font-weight:700;color:var(--gold)}
.board-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:10px;
  font-size:10px;font-weight:600;background:#1e2d4a;color:#60a5fa;border:1px solid var(--b)}

/* Loading / empty */
.loader{text-align:center;padding:60px 20px;color:var(--mut)}
.loader-spin{display:inline-block;width:24px;height:24px;border:2px solid var(--b);
  border-top-color:var(--acc);border-radius:50%;animation:spin .7s linear infinite;margin-bottom:12px}
@keyframes spin{to{transform:rotate(360deg)}}
.empty{text-align:center;padding:60px;color:var(--mut);font-size:14px}

/* Stats bar */
.stats-bar{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
.stat-chip{background:var(--s);border:1px solid var(--b);border-radius:10px;
  padding:10px 16px;display:flex;flex-direction:column;gap:2px}
.stat-chip .sv{font-size:22px;font-weight:800;font-family:'Space Mono',monospace;color:var(--acc)}
.stat-chip .sl{font-size:10px;color:var(--mut);text-transform:uppercase;letter-spacing:1.5px}

/* Back button */
.back-btn{background:var(--s2);border:1px solid var(--b);border-radius:8px;
  padding:7px 14px;color:var(--mut);font-size:12px;font-weight:600;
  cursor:pointer;font-family:'Syne',sans-serif;margin-bottom:16px;display:inline-flex;align-items:center;gap:6px}
.back-btn:hover{color:var(--txt);border-color:var(--acc)}

@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.fade{animation:fadeUp .3s ease both}

.foot{text-align:center;margin-top:48px;font-size:11px;color:var(--mut);font-family:'Space Mono',monospace}
.foot a{color:var(--acc);text-decoration:none}
.stat-section{margin-bottom:28px}
.stat-section-title{font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--acc);margin-bottom:14px}
.stat-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.stat-card{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:14px;text-align:center}
.stat-val{font-size:22px;font-weight:800;color:#fff;font-family:'Space Mono',monospace}
.stat-lbl{font-size:11px;color:var(--mut);margin-top:4px;text-transform:uppercase;letter-spacing:1px}
.stat-status-grid{display:flex;flex-wrap:wrap;gap:8px}
.stat-status-pill{border:1px solid;border-radius:12px;padding:10px 16px;display:flex;flex-direction:column;align-items:center;min-width:100px;flex:1}
.stat-board-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.stat-board-row{display:flex;justify-content:space-between;align-items:center;background:var(--s);border:1px solid var(--b);border-radius:8px;padding:8px 12px;font-size:13px}

@media(max-width:600px){
  .hero h1{font-size:32px}
  .lb-table th.hide-sm,.lb-row td.hide-sm{display:none}
}
</style>
</head>
<body>
<div class="wrap">

  <header class="site-header">
    <a href="${WORKER}/leaderboard-page" style="text-decoration:none"><div class="logo">⭐ <span>BRDb</span></div></a>
    <div style="display:flex;gap:8px">
      <a class="nav-link active" href="#">🏆 Leaderboard</a>
    </div>
  </header>

  <div class="hero fade">
    <h1>🏆 <span>Leaderboard</span></h1>
    <p>Rankings updated daily · BRDb</p>
    <div style="position:relative;width:100%;max-width:420px;margin:16px auto 0">
      <input id="lbSearch" type="text" placeholder="Search username or UID..." autocomplete="off"
        style="width:100%;padding:12px 18px;font-size:15px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#e2e8f0;outline:none;font-family:inherit;transition:border-color .2s"
        onfocus="this.style.borderColor='#fbbf24'" onblur="this.style.borderColor='rgba(255,255,255,.12)'">
      <div id="lbAutocomplete" style="position:absolute;top:calc(100% + 4px);left:0;right:0;background:#0f172a;border:1px solid rgba(255,255,255,.12);border-radius:10px;overflow:hidden;z-index:100;display:none"></div>
    </div>
  </div>

  <div class="tabs">
    <button class="tab active" id="tab-global" onclick="switchTab('global')">🌍 Global</button>
    <button class="tab" id="tab-local" onclick="switchTab('local')">🗺️ Local Boards</button>
    <button class="tab" id="tab-stats" onclick="switchTab('stats')">📊 Stats</button>
  </div>

  <!-- GLOBAL TAB -->
  <div id="pane-global">
    <div class="stats-bar" id="global-stats"></div>
    <div class="sort-bar">
      <span class="sort-label">Sort by</span>
      <button class="sort-btn active" data-sort="BRDb" onclick="loadGlobal('BRDb')">⭐ BRDb</button>
      <button class="sort-btn" data-sort="Reputation" onclick="loadGlobal('Reputation')">🏆 Reputation</button>
      <button class="sort-btn" data-sort="impact_all" onclick="loadGlobal('impact_all')">💥 Impact</button>
      <button class="sort-btn" data-sort="merit_total" onclick="loadGlobal('merit_total')">🎖️ Merits</button>
      <button class="sort-btn" data-sort="posts_total" onclick="loadGlobal('posts_total')">📝 Posts</button>
    </div>
    <div id="global-table"><div class="loader"><div class="loader-spin"></div><div>Loading...</div></div></div>
  </div>

  <!-- LOCAL TAB -->
  <div id="pane-local" style="display:none">
    <div id="local-boards-grid"><div class="loader"><div class="loader-spin"></div><div>Loading boards...</div></div></div>
    <div id="local-board-view" style="display:none"></div>
  </div>

  <!-- STATS TAB -->
  <div id="pane-stats" style="display:none">
    <div id="stats-content" style="color:#64748b;font-size:13px;text-align:center;padding:30px">⏳ Loading...</div>
  </div>

  <div class="foot">
    <p>BRDb Score · Data by BRDb Scraper</p>
  </div>
</div>

<script>
const WORKER = '${WORKER}';
const BOARD_FLAGS = {Italian:'🇮🇹',German:'🇩🇪',Spanish:'🇪🇸',French:'🇫🇷',Portuguese:'🇧🇷',
  Russian:'🇷🇺',Turkish:'🇹🇷',Dutch:'🇳🇱',Polish:'🇵🇱',Romanian:'🇷🇴',Greek:'🇬🇷',
  Croatian:'🇭🇷',Mandarin:'🇨🇳',Japanese:'🇯🇵',Korean:'🇰🇷',Arabic:'🇸🇦',
  Indonesian:'🇮🇩',Filipino:'🇵🇭',Nigerian:'🇳🇬',India:'🇮🇳',Scandinavian:'🇸🇪',Hebrew:'🇮🇱','Other languages/locations':'🌐'};

const STATUS_COLORS = {Active:'#22c55e',Dormant:'#f59e0b',Former:'#ef4444',
  Promising:'#a855f7',Reactivated:'#3b82f6',Historical:'#cbd5e1',Banned:'#7f1d1d'};

let currentGlobalSort = 'BRDb';
let globalData = null;
let localBoardsData = null;

function switchTab(tab) {
  document.getElementById('pane-global').style.display = tab === 'global' ? 'block' : 'none';
  document.getElementById('pane-local').style.display  = tab === 'local'  ? 'block' : 'none';
  document.getElementById('pane-stats').style.display  = tab === 'stats'  ? 'block' : 'none';
  document.getElementById('tab-global').classList.toggle('active', tab === 'global');
  document.getElementById('tab-local').classList.toggle('active', tab === 'local');
  document.getElementById('tab-stats').classList.toggle('active', tab === 'stats');
  if (tab === 'local' && !localBoardsData) loadLocalBoards();
  if (tab === 'stats') loadStats();
}


// ── STATS ──────────────────────────────────────────────────────
let statsLoaded = false;
async function loadStats() {
  if (statsLoaded) return;
  const container = document.getElementById('stats-content');
  container.innerHTML = '<div style="text-align:center;padding:30px;color:#64748b">\u23f3 Loading...</div>';
  try {
    const res = await fetch(WORKER + '/stats/detail?_=' + Date.now());
    const data = await res.json();
    if (data.error) { container.innerHTML = '<div style="color:#ef4444">Error: ' + data.error + '</div>'; return; }
    const bu = data.brdb_users || {};
    const ui = data.users_index || {};
    const hi = data.history || {};
    const statusColors = { Active:'#22c55e', Promising:'#a855f7', Dormant:'#facc15', Reactivated:'#38bdf8', Former:'#ef4444', Historical:'#94a3b8', Banned:'#7f1d1d' };
    const byStatus = (bu.by_status || []).filter(s => s.count > 0).map(s => {
      const sc = statusColors[s.status] || '#94a3b8';
      return '<div class="stat-status-pill" style="border-color:' + sc + '33;background:' + sc + '11">' +
        '<span style="color:' + sc + ';font-weight:700;font-size:18px">' + s.count.toLocaleString() + '</span>' +
        '<span style="color:#94a3b8;font-size:11px;margin-top:3px">' + s.status + '</span></div>';
    }).join('');
    const byBoard = (bu.by_local_board || []).slice(0, 15).map(b =>
      '<div class="stat-board-row"><span>' + b.board + '</span><span style="color:#f59e0b;font-weight:600">' + b.count.toLocaleString() + '</span></div>'
    ).join('');
    const overview = [
      ['Scored Users',      (bu.total||0).toLocaleString(),         ''],
      ['Indexed',           (ui.total||0).toLocaleString(),         ''],
      ['Scraped (24h)',     (ui.scraped_24h||0).toLocaleString(),   'color:#22c55e'],
      ['Queue (24h)',       (ui.pending||0).toLocaleString(),         'color:#f59e0b'],
      ['Never Scraped',     (ui.never_scraped||0).toLocaleString(),   (ui.never_scraped||0) > 0 ? 'color:#ef4444' : ''],
      ['Full Cycle',        ui.cycle_hours ? ui.cycle_hours + 'h' : '—', 'font-size:15px'],
      ['Avg BRDb',          (bu.avg_brdb||0).toFixed(2),            ''],
      ['History Snapshots', (hi.snapshots||0).toLocaleString(),     ''],
      ['Last Snapshot',     hi.newest||'\u2014',                        'font-size:13px'],
    ].map(([lbl, val, style]) =>
      '<div class="stat-card"><div class="stat-val"' + (style ? ' style="' + style + '"' : '') + '>' + val + '</div>' +
      '<div class="stat-lbl">' + lbl + '</div></div>'
    ).join('');
    container.innerHTML =
      '<div class="stat-section">' +
        '<div class="stat-section-title">\ud83d\udcca Database Overview</div>' +
        '<div class="stat-grid-3">' + overview + '</div>' +
      '</div>' +
      '<div class="stat-section">' +
        '<div class="stat-section-title">\ud83d\udc65 Users by Status</div>' +
        '<div class="stat-status-grid">' + byStatus + '</div>' +
      '</div>' +
      '<div class="stat-section">' +
        '<div class="stat-section-title">\ud83c\udf0d Top Local Boards</div>' +
        '<div class="stat-board-grid">' + byBoard + '</div>' +
      '</div>';
    statsLoaded = true;
  } catch(e) {
    container.innerHTML = '<div style="color:#ef4444;text-align:center;padding:20px">Failed to load stats</div>';
  }
}

// ── GLOBAL ─────────────────────────────────────────────────────
async function loadGlobal(sort = 'BRDb') {
  currentGlobalSort = sort;
  document.querySelectorAll('#pane-global .sort-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.sort === sort));

  document.getElementById('global-table').innerHTML =
    '<div class="loader"><div class="loader-spin"></div><div>Loading...</div></div>';
  try {
    const res = await fetch(WORKER + '/leaderboard?sort=' + sort + '&limit=200');
    const json = await res.json();
    globalData = json.leaderboard || [];
  } catch(e) {
    document.getElementById('global-table').innerHTML = '<div class="empty">Error loading data</div>';
    return;
  }

  const sorted = [...globalData];

  // Stats
  const total = globalData.length;
  const avgBRDb = (globalData.reduce((s,u) => s + (u.BRDb||0), 0) / total).toFixed(2);
  const boards = [...new Set(globalData.map(u => u.local_board).filter(Boolean))].length;
  document.getElementById('global-stats').innerHTML =
    statChip(total, 'Users') + statChip(avgBRDb, 'Avg BRDb') + statChip(boards, 'Local Boards');

  renderTable('global-table', sorted, sort, false);
}

function statChip(v, l) {
  return \`<div class="stat-chip"><div class="sv">\${v}</div><div class="sl">\${l}</div></div>\`;
}

function renderTable(containerId, users, sortKey, showBack) {
  if (!users.length) {
    document.getElementById(containerId).innerHTML = '<div class="empty">No users found</div>';
    return;
  }

  // Label e colore per il criterio selezionato
  const colMeta = {
    BRDb:        { label: '⭐ BRDb',      color: '#fbbf24', fmt: v => parseFloat(v).toFixed(2) },
    Reputation:  { label: '🏆 Reputation', color: '#60a5fa', fmt: v => parseFloat(v).toFixed(2) },
    impact_all:  { label: '💥 Impact',    color: '#a78bfa', fmt: v => Math.round(v).toLocaleString() },
    merit_total: { label: '🎖️ Merits',    color: '#a3e635', fmt: v => Math.round(v).toLocaleString() },
    posts_total: { label: '📝 Posts',     color: '#60a5fa', fmt: v => Math.round(v).toLocaleString() },
  };
  const col = colMeta[sortKey] || colMeta.BRDb;

  let html = showBack ? '<button class="back-btn" onclick="showBoardsGrid()">← All Boards</button>' : '';
  html += \`<table class="lb-table fade">
    <thead><tr>
      <th>#</th>
      <th>User</th>
      <th class="r">\${col.label}</th>
      <th class="hide-sm">Board</th>
    </tr></thead>
    <tbody>\`;

  users.forEach((u, i) => {
    const rank = i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
    const rankClass = rank === 1 ? 'g1' : rank === 2 ? 'g2' : rank === 3 ? 'g3' : '';
    const sc = u.color || STATUS_COLORS[u.status] || '#94a3b8';
    const scoreVal = u[sortKey] ?? u.BRDb ?? 0;
    const scoreDisp = col.fmt(scoreVal);
    const flag = u.local_board ? (BOARD_FLAGS[u.local_board] || '🌍') : '';
    html += \`<tr class="lb-row" onclick="window.open('\${WORKER}/profile/\${u.uid}','_blank')">
      <td><span class="rank \${rankClass}">\${medal}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="status-dot" style="background:\${sc}"></span>
          <div>
            <div class="uname">\${u.username || 'User #'+u.uid}</div>
            <div style="font-size:10px;color:var(--mut)">UID \${u.uid}</div>
          </div>
        </div>
      </td>
      <td class="r"><span class="score-val" style="color:\${col.color}">\${scoreDisp}</span></td>
      <td class="hide-sm">\${u.local_board ? \`<span class="board-badge">\${flag} \${u.local_board}</span>\` : '<span style="color:var(--mut);font-size:11px">—</span>'}</td>
    </tr>\`;
  });

  html += '</tbody></table>';
  document.getElementById(containerId).innerHTML = html;
}

// ── LOCAL BOARDS ────────────────────────────────────────────────
async function loadLocalBoards() {
  try {
    const res = await fetch(WORKER + '/leaderboard/local');
    const json = await res.json();
    localBoardsData = json.boards || {};
    renderBoardsGrid();
  } catch(e) {
    document.getElementById('local-boards-grid').innerHTML = '<div class="empty">Error loading boards</div>';
  }
}

function renderBoardsGrid() {
  const boards = Object.entries(localBoardsData)
    .sort((a,b) => b[1].length - a[1].length);

  if (!boards.length) {
    document.getElementById('local-boards-grid').innerHTML = '<div class="empty">No local boards found</div>';
    return;
  }

  let html = '<div class="board-grid fade">';
  boards.forEach(([name, users]) => {
    const flag = BOARD_FLAGS[name] || '🌍';
    html += \`<div class="board-card" onclick="showBoard('\${name}')">
      <span class="board-flag">\${flag}</span>
      <div>
        <div class="board-name">\${name}</div>
        <div class="board-count">\${users.length} users</div>
      </div>
    </div>\`;
  });
  html += '</div>';

  document.getElementById('local-boards-grid').innerHTML = html;
  document.getElementById('local-board-view').style.display = 'none';
}

let currentBoard = null;
let currentBoardSort = 'BRDb';
let boardCache = {};

async function showBoard(board, sort = 'BRDb') {
  currentBoard = board;
  currentBoardSort = sort;

  document.getElementById('local-boards-grid').style.display = 'none';
  const view = document.getElementById('local-board-view');
  view.style.display = 'block';
  view.innerHTML = '<div class="loader"><div class="loader-spin"></div><div>Loading...</div></div>';

  const cacheKey = board + '_' + sort;
  if (!boardCache[cacheKey]) {
    try {
      const res = await fetch(\`\${WORKER}/leaderboard/local?board=\${encodeURIComponent(board)}&sort=\${sort}&limit=100\`);
      const json = await res.json();
      boardCache[cacheKey] = json.leaderboard || [];
    } catch(e) {
      view.innerHTML = '<div class="empty">Error loading board</div>';
      return;
    }
  }

  const users = boardCache[cacheKey];
  const flag = BOARD_FLAGS[board] || '🌍';

  let html = \`<button class="back-btn" onclick="showBoardsGrid()">← All Boards</button>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <div style="font-size:28px">\${flag}</div>
      <div>
        <div style="font-size:22px;font-weight:800">\${board} Board</div>
        <div style="font-size:12px;color:var(--mut)">\${users.length} users ranked</div>
      </div>
    </div>
    <div class="sort-bar">
      <span class="sort-label">Sort</span>
      \${['BRDb','Reputation','impact_all','merit_total','posts_total'].map(s =>
        \`<button class="sort-btn \${s === sort ? 'active' : ''}" onclick="showBoard('\${board}','\${s}')">\${
          s==='BRDb'?'⭐ BRDb':s==='Reputation'?'🏆 Rep':s==='impact_all'?'💥 Impact':s==='merit_total'?'🎖️ Merits':'📝 Posts'
        }</button>\`
      ).join('')}
    </div>\`;

  view.innerHTML = html;
  const tableDiv = document.createElement('div');
  tableDiv.id = 'board-table';
  view.appendChild(tableDiv);
  renderTable('board-table', users, sort, false);
}

function showBoardsGrid() {
  document.getElementById('local-boards-grid').style.display = 'block';
  document.getElementById('local-board-view').style.display = 'none';
}

// Init
loadGlobal('BRDb');

// Search autocomplete nella leaderboard
const lbSearch = document.getElementById('lbSearch');
const lbAc = document.getElementById('lbAutocomplete');
let lbDebounce;
const FLAGS = {Italian:'🇮🇹',German:'🇩🇪',Spanish:'🇪🇸',French:'🇫🇷',Portuguese:'🇧🇷',Russian:'🇷🇺',Turkish:'🇹🇷',Dutch:'🇳🇱',Polish:'🇵🇱',Romanian:'🇷🇴',Greek:'🇬🇷',Croatian:'🇭🇷',Mandarin:'🇨🇳',Japanese:'🇯🇵',Korean:'🇰🇷',Arabic:'🇸🇦',Indonesian:'🇮🇩',Filipino:'🇵🇭',Nigerian:'🇳🇬',India:'🇮🇳',Scandinavian:'🇸🇪',Hebrew:'🇮🇱','Other languages/locations':'🌐'};

if (lbSearch) {
  lbSearch.addEventListener('input', () => {
    clearTimeout(lbDebounce);
    const q = lbSearch.value.trim();
    if (q.length < 2) { lbAc.style.display = 'none'; return; }
    lbDebounce = setTimeout(async () => {
      try {
        const res = await fetch(WORKER + '/search?q=' + encodeURIComponent(q));
        const data = await res.json();
        const results = data.results || [];
        if (!results.length) { lbAc.style.display = 'none'; return; }
        lbAc.innerHTML = results.map(u => {
          const flag = FLAGS[u.local_board] ? '<span>'+FLAGS[u.local_board]+'</span>' : '';
          return '<a href="'+WORKER+'/profile/'+u.uid+'" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;cursor:pointer;text-decoration:none;color:inherit;transition:background .15s">'
            +'<div style="display:flex;align-items:center;gap:8px">'
            +'<span style="font-weight:700">'+(u.username||'uid:'+u.uid)+'</span>'
            +flag
            +'<span style="font-size:11px;color:#475569;font-family:monospace">#'+u.uid+'</span>'
            +'</div>'
            +'<div style="display:flex;align-items:center;gap:8px">'
            +'<span style="font-weight:700;color:#fbbf24;font-family:monospace">⭐'+(u.BRDb||0).toFixed(1)+'</span>'
            +'<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:rgba(255,255,255,.08);color:'+(u.color||'#94a3b8')+'">'+(u.status||'')+'</span>'
            +'</div></a>';
        }).join('');
        lbAc.style.display = 'block';
      } catch(e) { lbAc.style.display = 'none'; }
    }, 200);
  });
  lbSearch.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = lbSearch.value.trim();
      if (!q) return;
      window.location.href = /^\d+$/.test(q) ? WORKER+'/profile/'+q : WORKER+'/search?q='+encodeURIComponent(q);
    }
    if (e.key === 'Escape') lbAc.style.display = 'none';
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#lbSearch') && !e.target.closest('#lbAutocomplete')) lbAc.style.display = 'none';
  });
}
</script>
</body>
</html>`;

}
