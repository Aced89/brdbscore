export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/scrape-next') {
      return await scrapeNext(env);
    }
    
    if (url.pathname === '/scrape-active-merits') {
      const BTT_COOKIE = env.BTT_COOKIE;
      if (!BTT_COOKIE) return Response.json({ error: 'No cookie' });
      
      const user = await env.DB.prepare(`
        SELECT DISTINCT p.uid FROM post_events p 
        LEFT JOIN merit_events m ON p.uid = m.to_uid 
        WHERE p.collected_at > unixepoch()*1000 - 30*86400000 
        AND m.id IS NULL
        LIMIT 1
      `).first();
      
      if (!user) {
        const u2 = await env.DB.prepare(`
          SELECT DISTINCT from_uid as uid FROM merit_events 
          WHERE collected_at > unixepoch()*1000 - 30*86400000 
          AND from_uid NOT IN (SELECT DISTINCT to_uid FROM merit_events WHERE to_uid IS NOT NULL)
          LIMIT 1
        `).first();
        
        if (!u2) return Response.json({ ok: true, message: 'All active users scraped' });
        
        return await scrapeMerits(u2.uid, BTT_COOKIE, env.DB);
      }
      
      return await scrapeMerits(user.uid, BTT_COOKIE, env.DB);
    }
    
    if (url.pathname === '/scrape-my-merits' && url.searchParams.get('uid')) {
      const uid = url.searchParams.get('uid');
      const BTT_COOKIE = env.BTT_COOKIE;
      if (!BTT_COOKIE) return Response.json({ error: 'No cookie' });
      return await scrapeMerits(uid, BTT_COOKIE, env.DB);
    }
    
    if (url.pathname === '/force-profile' && url.searchParams.get('uid')) {
      const uid = url.searchParams.get('uid');
      const BTT_COOKIE = env.BTT_COOKIE;
      if (!BTT_COOKIE) return Response.json({ error: 'No cookie' });
      const profile = await scrapeProfile(uid, BTT_COOKIE, env.DB);
      return Response.json({ ok: true, profile });
    }
    
    if (url.pathname === '/build-daily-aggregates') {
      const today = new Date().toISOString().split('T')[0];
      const cutoff = Date.now() - 86400000;
      
      const postsResult = await env.DB.prepare(`
        INSERT OR REPLACE INTO daily_aggregates (uid, date, posts_count, updated_at)
        SELECT uid, DATE(collected_at), COUNT(*), unixepoch()*1000
        FROM post_events
        WHERE collected_at > ?
        GROUP BY uid, DATE(collected_at)
      `).bind(cutoff).run();
      
      const receivedResult = await env.DB.prepare(`
        UPDATE daily_aggregates SET merit_received = (
          SELECT COALESCE(SUM(amount), 0) FROM merit_events 
          WHERE to_uid = daily_aggregates.uid 
          AND collected_at > ? AND DATE(collected_at) = daily_aggregates.date
        ), updated_at = unixepoch()*1000
        WHERE date = ?
      `).bind(cutoff, today).run();
      
      const sentResult = await env.DB.prepare(`
        UPDATE daily_aggregates SET merit_sent = (
          SELECT COALESCE(SUM(amount), 0) FROM merit_events 
          WHERE from_uid = daily_aggregates.uid 
          AND collected_at > ? AND DATE(collected_at) = daily_aggregates.date
        ), updated_at = unixepoch()*1000
        WHERE date = ?
      `).bind(cutoff, today).run();
      
      return Response.json({ 
        ok: true, 
        posts_inserted: postsResult.meta?.changes || 0,
        received_updated: receivedResult.meta?.changes || 0,
        sent_updated: sentResult.meta?.changes || 0
      });
    }
    
    if (url.pathname === '/user-120d' && url.searchParams.get('uid')) {
      const uid = url.searchParams.get('uid');
      const row = await env.DB.prepare(`
        SELECT 
          COALESCE(SUM(posts_count), 0) as posts_120d,
          COALESCE(SUM(merit_received), 0) as merit_received_120d,
          COALESCE(SUM(merit_sent), 0) as merit_sent_120d,
          COUNT(DISTINCT date) as active_days_120d
        FROM daily_aggregates 
        WHERE uid = ? 
        AND date >= DATE('now', '-120 days')
      `).bind(uid).first();
      
      return Response.json({ uid, ...row });
    }
    
    if (url.pathname === '/debug-profile' && url.searchParams.get('uid')) {
      const uid = url.searchParams.get('uid');
      const BTT_COOKIE = env.BTT_COOKIE;
      
      // Scraping diretto del profilo
      const profileRes = await fetch(`https://bitcointalk.org/index.php?action=profile;u=${uid}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': BTT_COOKIE }
      });
      
      let btData = { error: 'Failed to scrape' };
      if (profileRes.ok) {
        const pHtml = await profileRes.text();
        const postsMatch = pHtml.match(/<td><b>Posts:\s*<\/b><\/td>\s*<td>(\d+)<\/td>/i);
        const meritMatch = pHtml.match(/<td><b>Merit:\s*<\/b><\/td>\s*<td>(\d+)<\/td>/i);
        const nameMatch = pHtml.match(/<td><b>Name:\s*<\/b><\/td>\s*<td>([^<]+)<\/td>/i);
        btData = {
          name: nameMatch ? nameMatch[1].trim() : null,
          posts: postsMatch ? parseInt(postsMatch[1]) : null,
          meritTotal: meritMatch ? parseInt(meritMatch[1]) : null,
        };
      }
      
      // Dati dal database user_profiles
      const dbProfile = await env.DB.prepare('SELECT * FROM user_profiles WHERE uid = ?').bind(uid).first();
      
      // Dati dal database brdb_users
      const dbBrdb = await env.DB.prepare('SELECT * FROM brdb_users WHERE uid = ?').bind(uid).first();
      
      // Calcolo merit da merit_events
      const meritReceived = await env.DB.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM merit_events WHERE to_uid = ?').bind(uid).first();
      const meritSent = await env.DB.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM merit_events WHERE from_uid = ?').bind(uid).first();
      const meritRecent = await env.DB.prepare(`
        SELECT * FROM merit_events 
        WHERE from_uid = ? OR to_uid = ? 
        ORDER BY collected_at DESC LIMIT 10
      `).bind(uid, uid).all();
      
      return Response.json({
        uid,
        bitcointalk_scraped: btData,
        db_user_profiles: dbProfile,
        db_brdb_users: dbBrdb,
        merit_received_total: meritReceived.total,
        merit_sent_total: meritSent.total,
        recent_merit_events: meritRecent.results || [],
        comparison: {
          bt_posts: btData.posts,
          db_posts_total: dbProfile?.posts_total,
          bt_merit: btData.merit,
          brdb_merit_total: dbBrdb?.merit_total,
          db_merit_total: dbProfile?.merit_total
        }
      });
    }
    if (url.pathname === '/stats') {
      const total = await env.DB.prepare('SELECT COUNT(*) as n FROM users_queue').first();
      const scraped = await env.DB.prepare('SELECT COUNT(*) as n FROM users_queue WHERE scraped = 1').first();
      const profiles = await env.DB.prepare('SELECT COUNT(*) as n FROM user_profiles').first();
      const merits = await env.DB.prepare('SELECT COUNT(*) as n FROM merit_events').first();
      const aggregates = await env.DB.prepare('SELECT COUNT(*) as n FROM daily_aggregates').first();
      return Response.json({ 
        total: total?.n, scraped: scraped?.n, remaining: (total?.n||0)-(scraped?.n||0), 
        profiles: profiles?.n, merits: merits?.n, aggregates: aggregates?.n 
      });
    }
    
    if (url.pathname === '/profile' && url.searchParams.get('uid')) {
      const uid = url.searchParams.get('uid');
      const profile = await env.DB.prepare('SELECT * FROM user_profiles WHERE uid = ?').bind(uid).first();
      if (!profile) return Response.json({ error: 'not found' });
      const sent = await env.DB.prepare('SELECT SUM(amount) as total FROM merit_events WHERE from_uid = ?').bind(uid).first();
      const received = await env.DB.prepare('SELECT SUM(amount) as total FROM merit_events WHERE to_uid = ?').bind(uid).first();
      return Response.json({ ...profile, merits_sent_live: sent?.total||0, merits_received_live: received?.total||0 });
    }
    
    return new Response('Scraper OK', { status: 200 });
  }
};

async function scrapeNext(env) {
  const BTT_COOKIE = env.BTT_COOKIE;
  if (!BTT_COOKIE) return Response.json({ error: 'No cookie' });
  
  const user = await env.DB.prepare('SELECT uid FROM users_queue WHERE scraped = 0 ORDER BY id ASC LIMIT 1').first();
  if (!user) return Response.json({ ok: true, message: 'All done' });
  
  const result = await scrapeProfile(user.uid, BTT_COOKIE, env.DB);
  await env.DB.prepare('UPDATE users_queue SET scraped = 1, scraped_at = ? WHERE uid = ?').bind(Date.now(), user.uid).run();
  
  return Response.json({ ok: true, uid: user.uid, result });
}

async function scrapeMerits(uid, BTT_COOKIE, db) {
  const res = await fetch(`https://bitcointalk.org/index.php?action=merit;u=${uid}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': BTT_COOKIE }
  });
  
  if (!res.ok) return Response.json({ error: `HTTP ${res.status}` });
  
  const html = await res.text();
  
  const recvRegex = /(\d+)\s*from\s*<a href="\/index\.php\?action=profile;u=(\d+)">([^<]+)<\/a>\s*for\s*<a href="\/index\.php\?topic=\d+\.msg(\d+)#msg\d+">([^<]+)<\/a>/gi;
  const sentRegex = /(\d+)\s*to\s*<a href="\/index\.php\?action=profile;u=(\d+)">([^<]+)<\/a>\s*for\s*<a href="\/index\.php\?topic=\d+\.msg(\d+)#msg\d+">([^<]+)<\/a>/gi;
  
  let rSaved = 0, sSaved = 0, skipped = 0;
  let match;
  
  while ((match = recvRegex.exec(html)) !== null) {
    const amount = parseInt(match[1]);
    const from_uid = parseInt(match[2]);
    const msg_id = parseInt(match[4]);
    const title = match[5];
    
    const exists = await db.prepare('SELECT id FROM merit_events WHERE msg_id = ? AND to_uid = ?').bind(msg_id, uid).first();
    if (exists) { skipped++; continue; }
    
    await db.prepare(
      'INSERT OR IGNORE INTO merit_events (from_uid, to_uid, amount, msg_id, title, timestamp, collected_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(from_uid, uid, amount, msg_id, title, new Date().toISOString(), Date.now()).run();
    rSaved++;
    
    // Aggiorniamo subito il profilo di chi ha ricevuto il merit
    await scrapeProfile(uid, BTT_COOKIE, db);
  }
  
  while ((match = sentRegex.exec(html)) !== null) {
    const amount = parseInt(match[1]);
    const to_uid = parseInt(match[2]);
    const msg_id = parseInt(match[4]);
    const title = match[5];
    
    const exists = await db.prepare('SELECT id FROM merit_events WHERE msg_id = ? AND from_uid = ?').bind(msg_id, uid).first();
    if (exists) { skipped++; continue; }
    
    await db.prepare(
      'INSERT OR IGNORE INTO merit_events (from_uid, to_uid, amount, msg_id, title, timestamp, collected_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(uid, to_uid, amount, msg_id, title, new Date().toISOString(), Date.now()).run();
    sSaved++;
    
    // Aggiorniamo subito il profilo di chi ha inviato il merit
    await scrapeProfile(uid, BTT_COOKIE, db);
  }
  
  const cutoff = Date.now() - 120 * 86400000;
  const recv120 = await db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM merit_events WHERE to_uid = ? AND collected_at > ?').bind(uid, cutoff).first();
  const sent120 = await db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM merit_events WHERE from_uid = ? AND collected_at > ?').bind(uid, cutoff).first();
  
  // NON aggiorniamo merit_total qui - viene aggiornato solo da scrapeProfile
  
  await db.prepare(`
    UPDATE user_profiles 
    SET merit_received_120d = ?, 
        merit_sent_120d = ?,
        updated_at = ? 
    WHERE uid = ?
  `).bind(recv120.total, sent120.total, Date.now(), uid).run();
  
  return Response.json({ ok: true, received_saved: rSaved, sent_saved: sSaved, skipped });
}

async function scrapeProfile(uid, cookie, db) {
  await new Promise(r => setTimeout(r, 1500));
  try {
    const profileRes = await fetch(`https://bitcointalk.org/index.php?action=profile;u=${uid}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookie }
    });
    if (!profileRes.ok) return { error: 'Profile not found' };
    const pHtml = await profileRes.text();
    
    const postsMatch = pHtml.match(/<td><b>Posts:\s*<\/b><\/td>\s*<td>(\d+)<\/td>/i);
    const regMatch = pHtml.match(/<td><b>Date Registered:\s*<\/b><\/td>\s*<td>([^<]+)<\/td>/i);
    const lastMatch = pHtml.match(/<td><b>Last Active:\s*<\/b><\/td>\s*<td[^>]*>([^<]*)<\/td>/i);
    const nameMatch = pHtml.match(/<td><b>Name:\s*<\/b><\/td>\s*<td>([^<]+)<\/td>/i);
    const meritMatch = pHtml.match(/<td><b>Merit:\s*<\/b><\/td>\s*<td>(\d+)<\/td>/i);
    
    const profile = {
      uid: uid,
      username: nameMatch ? nameMatch[1].trim() : null,
      posts_total: postsMatch ? parseInt(postsMatch[1]) : null,
      merit_total: meritMatch ? parseInt(meritMatch[1]) : null,
      reg_date: regMatch ? regMatch[1].trim() : null,
      last_active: lastMatch ? lastMatch[1].trim() : null,
      bitcointalk_scraped: JSON.stringify({
        name: nameMatch ? nameMatch[1].trim() : null,
        posts: postsMatch ? parseInt(postsMatch[1]) : null,
        meritTotal: meritMatch ? parseInt(meritMatch[1]) : null,
        regDate: regMatch ? regMatch[1].trim() : null,
        lastActive: lastMatch ? lastMatch[1].trim() : null
      }),
      updated_at: Date.now()
    };
    const existing = await db.prepare('SELECT uid FROM user_profiles WHERE uid = ?').bind(uid).first();
    if (existing) {
      await db.prepare(
        'UPDATE user_profiles SET username = ?, posts_total = ?, merit_total = ?, reg_date = ?, last_active = ?, bitcointalk_scraped = ?, updated_at = ? WHERE uid = ?'
      ).bind(profile.username, profile.posts_total, profile.merit_total, profile.reg_date, profile.last_active, profile.bitcointalk_scraped, profile.updated_at, uid).run();
    } else {
      await db.prepare(
        'INSERT INTO user_profiles (uid, username, posts_total, merit_total, reg_date, last_active, bitcointalk_scraped, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(uid, profile.username, profile.posts_total, profile.merit_total, profile.reg_date, profile.last_active, profile.bitcointalk_scraped, profile.updated_at).run();
    }
    
    return profile;
  } catch (e) { return { error: e.message }; }
}
