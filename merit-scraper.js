// ═══════════════════════════════════════════════════════════════
// MERIT SCRAPER WORKER v2.7 - COMPLETO
// - Usa hash univoco per identificare ogni transazione
// - Non duplica più i meriti
// ═══════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ═══════════════════════════════════════════════════════════════
    // /collect - Scrapa i meriti recenti (CON HASH UNIVOCO)
    // ═══════════════════════════════════════════════════════════════
    if (path === '/collect') {
      const BTT_COOKIE = env.BTT_COOKIE;
      
      if (!BTT_COOKIE) {
        return Response.json({ 
          error: 'Missing BTT_COOKIE environment variable' 
        }, { status: 500, headers: corsHeaders });
      }

      try {
        const res = await fetch('https://bitcointalk.org/index.php?action=merit;stats=recent', {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': BTT_COOKIE,
            'Accept': 'text/html,application/xhtml+xml'
          }
        });
        
        if (!res.ok) {
          return Response.json({ 
            error: `Bitcointalk returned HTTP ${res.status}` 
          }, { status: 500, headers: corsHeaders });
        }
        
        const html = await res.text();
        
        const regex = /<li>(?:<b>)?([^<]*?)(?:<\/b>)?\s*(?:at\s*([\d:]+(?:\s*[AP]M)?)\s*)?:?\s*(\d+)\s*from\s*<a\s+href="\/index\.php\?action=profile;u=(\d+)">([^<]+)<\/a>\s*for\s*<a\s+href="\/index\.php\?topic=(\d+)\.msg(\d+)#msg\d+">([^<]+)<\/a>/gi;
        
        let saved = 0, skipped = 0, resolved = 0;
        let processed = 0;
        let match;
        const BATCH_SIZE = 90;
        
        const merits = [];
        while ((match = regex.exec(html)) !== null && processed < BATCH_SIZE) {
          const amount = parseInt(match[3]);
          const from_uid = parseInt(match[4]);
          const topic_id = parseInt(match[6]);
          const msg_id = parseInt(match[7]);
          const title = match[8] || 'Untitled';
          const timestamp_str = match[2] || '';
          const collected_at = Date.now();
          
          const post = await env.DB.prepare(
            'SELECT uid FROM post_events WHERE post_id = ?'
          ).bind(msg_id).first();
          
          const to_uid = post ? post.uid : null;
          
          // Crea hash univoco
          const uniqueKey = `${msg_id}|${from_uid}|${to_uid || 'null'}|${amount}|${timestamp_str}`;
          
          const exists = await env.DB.prepare(`
            SELECT id FROM merit_events 
            WHERE unique_key = ?
          `).bind(uniqueKey).first();
          
          merits.push({
            amount, from_uid, to_uid, msg_id, topic_id, title, 
            timestamp: new Date().toISOString(), 
            collected_at,
            unique_key: uniqueKey,
            exists: !!exists
          });
          
          processed++;
        }
        
        for (const merit of merits) {
          if (merit.exists) {
            skipped++;
            continue;
          }
          
          await env.DB.prepare(`
            INSERT INTO merit_events 
            (from_uid, to_uid, amount, msg_id, topic_id, title, timestamp, collected_at, unique_key) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            merit.from_uid, merit.to_uid, merit.amount, 
            merit.msg_id, merit.topic_id, merit.title, 
            merit.timestamp, merit.collected_at,
            merit.unique_key
          ).run();
          
          saved++;
          
          if (merit.to_uid) {
            await updateUserStats(merit.to_uid, merit.amount, 'received', env);
            resolved++;
          }
          await updateUserStats(merit.from_uid, merit.amount, 'sent', env);
        }
        
        return Response.json({ 
          ok: true, 
          saved, 
          skipped,
          resolved,
          processed,
          message: `Saved ${saved} new merit events (skipped ${skipped} duplicates)`
        }, { headers: corsHeaders });
        
      } catch (err) {
        console.error('Error in collectMerits:', err);
        return Response.json({ 
          error: err.message 
        }, { status: 500, headers: corsHeaders });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // /force-collect?secret=XXX - Forza il salvataggio
    // ═══════════════════════════════════════════════════════════════
    if (path === '/force-collect') {
      const secret = url.searchParams.get('secret');
      if (secret !== 'ace_brdb') {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
      
      const BTT_COOKIE = env.BTT_COOKIE;
      
      if (!BTT_COOKIE) {
        return Response.json({ 
          error: 'Missing BTT_COOKIE environment variable' 
        }, { status: 500, headers: corsHeaders });
      }

      try {
        const res = await fetch('https://bitcointalk.org/index.php?action=merit;stats=recent', {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': BTT_COOKIE,
            'Accept': 'text/html,application/xhtml+xml'
          }
        });
        
        if (!res.ok) {
          return Response.json({ 
            error: `Bitcointalk returned HTTP ${res.status}` 
          }, { status: 500, headers: corsHeaders });
        }
        
        const html = await res.text();
        
        const regex = /<li>(?:<b>)?([^<]*?)(?:<\/b>)?\s*(?:at\s*([\d:]+(?:\s*[AP]M)?)\s*)?:?\s*(\d+)\s*from\s*<a\s+href="\/index\.php\?action=profile;u=(\d+)">([^<]+)<\/a>\s*for\s*<a\s+href="\/index\.php\?topic=(\d+)\.msg(\d+)#msg\d+">([^<]+)<\/a>/gi;
        
        let saved = 0;
        let match;
        
        while ((match = regex.exec(html)) !== null) {
          const amount = parseInt(match[3]);
          const from_uid = parseInt(match[4]);
          const topic_id = parseInt(match[6]);
          const msg_id = parseInt(match[7]);
          const title = match[8] || 'Untitled';
          const timestamp_str = match[2] || '';
          const timestamp = new Date().toISOString();
          const collected_at = Date.now();
          
          const post = await env.DB.prepare(
            'SELECT uid FROM post_events WHERE post_id = ?'
          ).bind(msg_id).first();
          
          const to_uid = post ? post.uid : null;
          const uniqueKey = `${msg_id}|${from_uid}|${to_uid || 'null'}|${amount}|${timestamp_str}`;
          
          await env.DB.prepare(`
            INSERT INTO merit_events 
            (from_uid, to_uid, amount, msg_id, topic_id, title, timestamp, collected_at, unique_key) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            from_uid, to_uid, amount, 
            msg_id, topic_id, title, 
            timestamp, collected_at, uniqueKey
          ).run();
          
          saved++;
          
          if (to_uid) {
            await updateUserStats(to_uid, amount, 'received', env);
          }
          await updateUserStats(from_uid, amount, 'sent', env);
        }
        
        return Response.json({ 
          ok: true, 
          saved,
          message: `Force saved ${saved} merit events`
        }, { headers: corsHeaders });
        
      } catch (err) {
        console.error('Error in forceCollect:', err);
        return Response.json({ 
          error: err.message 
        }, { status: 500, headers: corsHeaders });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // /deduplicate?secret=XXX - Rimuove i duplicati esistenti
    // ═══════════════════════════════════════════════════════════════
    if (path === '/deduplicate' && url.searchParams.get('secret')) {
      const secret = url.searchParams.get('secret');
      if (secret !== 'ace_brdb') {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
      
      try {
        const duplicates = await env.DB.prepare(`
          SELECT 
            unique_key,
            COUNT(*) as count,
            GROUP_CONCAT(id) as ids,
            MIN(id) as keep_id
          FROM merit_events
          WHERE unique_key IS NOT NULL
          GROUP BY unique_key
          HAVING COUNT(*) > 1
        `).all();
        
        let deleted = 0;
        let groups = 0;
        
        for (const dup of duplicates.results || []) {
          const ids = dup.ids.split(',').map(Number);
          const deleteIds = ids.slice(1);
          
          if (deleteIds.length > 0) {
            const placeholders = deleteIds.map(() => '?').join(',');
            await env.DB.prepare(`
              DELETE FROM merit_events WHERE id IN (${placeholders})
            `).bind(...deleteIds).run();
            deleted += deleteIds.length;
            groups++;
          }
        }
        
        // Ricalcola le statistiche
        const cutoff = Date.now() - 120 * 86400000;
        await env.DB.prepare(`
          UPDATE user_profiles 
          SET merit_received_120d = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM merit_events 
            WHERE to_uid = user_profiles.uid 
            AND collected_at > ?
          ),
          merit_sent_120d = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM merit_events 
            WHERE from_uid = user_profiles.uid 
            AND collected_at > ?
          ),
          merit_total = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM merit_events 
            WHERE to_uid = user_profiles.uid
          ),
          updated_at = ?
        `).bind(cutoff, cutoff, Date.now()).run();
        
        return Response.json({
          ok: true,
          groups_fixed: groups,
          records_deleted: deleted,
          message: `Fixed ${groups} duplicate groups, deleted ${deleted} records`
        }, { headers: corsHeaders });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // /add-unique-key-column - Aggiunge la colonna unique_key
    // ═══════════════════════════════════════════════════════════════
    if (path === '/add-unique-key-column' && url.searchParams.get('secret')) {
      const secret = url.searchParams.get('secret');
      if (secret !== 'ace_brdb') {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
      
      try {
        await env.DB.prepare(`
          ALTER TABLE merit_events ADD COLUMN unique_key TEXT
        `).run();
        
        return Response.json({
          ok: true,
          message: 'Column unique_key added successfully'
        }, { headers: corsHeaders });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // /populate-unique-keys - Popola le unique_key esistenti
    // ═══════════════════════════════════════════════════════════════
    if (path === '/populate-unique-keys' && url.searchParams.get('secret')) {
      const secret = url.searchParams.get('secret');
      if (secret !== 'ace_brdb') {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
      
      try {
        const rows = await env.DB.prepare(`
          SELECT id, msg_id, from_uid, to_uid, amount, timestamp
          FROM merit_events 
          WHERE unique_key IS NULL
        `).all();
        
        let updated = 0;
        
        for (const row of rows.results || []) {
          const uniqueKey = `${row.msg_id}|${row.from_uid}|${row.to_uid || 'null'}|${row.amount}|${row.timestamp || ''}`;
          
          await env.DB.prepare(`
            UPDATE merit_events SET unique_key = ? WHERE id = ?
          `).bind(uniqueKey, row.id).run();
          
          updated++;
        }
        
        return Response.json({
          ok: true,
          updated,
          message: `Populated ${updated} unique keys`
        }, { headers: corsHeaders });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // /reset-all?secret=XXX - Reset COMPLETO
    // ═══════════════════════════════════════════════════════════════
    if (path === '/reset-all' && url.searchParams.get('secret')) {
      const secret = url.searchParams.get('secret');
      if (secret !== 'ace_brdb') {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
      
      try {
        await env.DB.prepare('DELETE FROM merit_events').run();
        await env.DB.prepare('UPDATE user_profiles SET merit_total = 0, merit_received_120d = 0, merit_sent_120d = 0').run();
        
        return Response.json({
          ok: true,
          message: 'All merits deleted and user stats reset'
        }, { headers: corsHeaders });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // /reset-merits?secret=XXX - Ripristina i meriti corrotti
    // ═══════════════════════════════════════════════════════════════
    if (path === '/reset-merits' && url.searchParams.get('secret')) {
      const secret = url.searchParams.get('secret');
      if (secret !== 'ace_brdb') {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
      
      try {
        const duplicates = await env.DB.prepare(`
          SELECT 
            msg_id, 
            from_uid, 
            to_uid,
            MIN(amount) as correct_amount,
            MIN(id) as keep_id,
            COUNT(*) as count,
            GROUP_CONCAT(id) as ids
          FROM merit_events
          WHERE msg_id IS NOT NULL AND from_uid IS NOT NULL
          GROUP BY msg_id, from_uid, to_uid
          HAVING COUNT(*) > 1
        `).all();
        
        let fixed = 0;
        let deleted = 0;
        
        for (const dup of duplicates.results || []) {
          const ids = dup.ids.split(',').map(Number);
          const deleteIds = ids.slice(1);
          
          if (deleteIds.length > 0) {
            const placeholders = deleteIds.map(() => '?').join(',');
            await env.DB.prepare(`
              DELETE FROM merit_events WHERE id IN (${placeholders})
            `).bind(...deleteIds).run();
            deleted += deleteIds.length;
            fixed++;
          }
        }
        
        const cutoff = Date.now() - 120 * 86400000;
        await env.DB.prepare(`
          UPDATE user_profiles 
          SET merit_received_120d = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM merit_events 
            WHERE to_uid = user_profiles.uid 
            AND collected_at > ?
          ),
          merit_sent_120d = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM merit_events 
            WHERE from_uid = user_profiles.uid 
            AND collected_at > ?
          ),
          merit_total = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM merit_events 
            WHERE to_uid = user_profiles.uid
          ),
          updated_at = ?
        `).bind(cutoff, cutoff, Date.now()).run();
        
        return Response.json({
          ok: true,
          duplicate_groups_fixed: fixed,
          duplicate_records_deleted: deleted,
          message: `Fixed ${fixed} duplicate groups, deleted ${deleted} records`
        }, { headers: corsHeaders });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // /stats - Statistiche database
    // ═══════════════════════════════════════════════════════════════
    if (path === '/stats') {
      try {
        const count = await env.DB.prepare('SELECT COUNT(*) as n FROM merit_events').first();
        const nulls = await env.DB.prepare('SELECT COUNT(*) as n FROM merit_events WHERE to_uid IS NULL').first();
        const profiles = await env.DB.prepare('SELECT COUNT(*) as n FROM user_profiles').first();
        const posts = await env.DB.prepare('SELECT COUNT(*) as n FROM post_events').first();
        const uniqueKeys = await env.DB.prepare('SELECT COUNT(*) as n FROM merit_events WHERE unique_key IS NOT NULL').first();
        
        return Response.json({
          success: true,
          total_merits: count?.n || 0,
          null_to_uid: nulls?.n || 0,
          total_profiles: profiles?.n || 0,
          total_posts: posts?.n || 0,
          unique_keys: uniqueKeys?.n || 0
        }, { headers: corsHeaders });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // /user-stats?uid=X - Statistiche utente
    // ═══════════════════════════════════════════════════════════════
    if (path === '/user-stats' && url.searchParams.get('uid')) {
      return await getUserStats(url.searchParams.get('uid'), env);
    }

    // ═══════════════════════════════════════════════════════════════
    // /sync-users (POST) - Sincronizza username da BRDb
    // ═══════════════════════════════════════════════════════════════
    if (path === '/sync-users' && request.method === 'POST') {
      return await syncUsernames(env);
    }

    // ═══════════════════════════════════════════════════════════════
    // /merit-history?uid=X - Storico meriti di un utente
    // ═══════════════════════════════════════════════════════════════
    if (path === '/merit-history' && url.searchParams.get('uid')) {
      return await getMeritHistory(url.searchParams.get('uid'), env);
    }

    // ═══════════════════════════════════════════════════════════════
    // /clean-orphans - Pulisce i meriti orfani
    // ═══════════════════════════════════════════════════════════════
    if (path === '/clean-orphans' && url.searchParams.get('secret')) {
      const secret = url.searchParams.get('secret');
      if (secret !== 'ace_brdb') {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
      
      try {
        const result = await env.DB.prepare(`
          DELETE FROM merit_events 
          WHERE from_uid IS NULL OR to_uid IS NULL
        `).run();
        
        return Response.json({
          ok: true,
          deleted: result.meta?.changes || 0,
          message: 'Orphan merits deleted'
        }, { headers: corsHeaders });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // /fix-merit-counts - Ricalcola i totali per tutti gli utenti
    // ═══════════════════════════════════════════════════════════════
    if (path === '/fix-merit-counts' && url.searchParams.get('secret')) {
      const secret = url.searchParams.get('secret');
      if (secret !== 'ace_brdb') {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
      
      try {
        const cutoff = Date.now() - 120 * 86400000;
        
        await env.DB.prepare(`
          UPDATE user_profiles 
          SET merit_total = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM merit_events 
            WHERE to_uid = user_profiles.uid
          ),
          merit_received_120d = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM merit_events 
            WHERE to_uid = user_profiles.uid 
            AND collected_at > ?
          ),
          merit_sent_120d = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM merit_events 
            WHERE from_uid = user_profiles.uid 
            AND collected_at > ?
          ),
          updated_at = ?
        `).bind(cutoff, cutoff, Date.now()).run();
        
        return Response.json({
          ok: true,
          message: 'Merit counts recalculated for all users'
        }, { headers: corsHeaders });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // /query?secret=XXX - Esegui query SQL (solo per admin)
    // ═══════════════════════════════════════════════════════════════
    if (path === '/query' && request.method === 'POST') {
      const secret = url.searchParams.get('secret');
      if (secret !== 'ace_brdb') {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
      
      try {
        const body = await request.json();
        if (!body.sql) {
          return Response.json({ error: 'Missing sql' }, { status: 400, headers: corsHeaders });
        }
        
        const result = await env.DB.prepare(body.sql).run();
        
        return Response.json({
          ok: true,
          changes: result.meta?.changes || 0,
          last_row_id: result.meta?.last_row_id || null
        }, { headers: corsHeaders });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // /fix-all-null?secret=XXX - Corregge TUTTI i meriti senza to_uid
    // ═══════════════════════════════════════════════════════════════
    if (path === '/fix-all-null') {
      const secret = url.searchParams.get('secret');
      if (secret !== 'ace_brdb') {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
      
      const BTT_COOKIE = env.BTT_COOKIE;
      if (!BTT_COOKIE) {
        return Response.json({ error: 'Missing BTT_COOKIE' }, { status: 500, headers: corsHeaders });
      }
      
      try {
        const nulls = await env.DB.prepare(`
          SELECT id, msg_id, topic_id, from_uid 
          FROM merit_events 
          WHERE to_uid IS NULL
          ORDER BY collected_at DESC
        `).all();
        
        if (!nulls.results.length) {
          return Response.json({ ok: true, fixed: 0, message: 'No null to_uid entries found' }, { headers: corsHeaders });
        }
        
        let fixed = 0;
        let failed = 0;
        let fromCache = 0;
        let fromScrape = 0;
        let postsCreated = 0;
        
        for (const row of nulls.results) {
          await new Promise(r => setTimeout(r, 300));
          
          try {
            const post = await env.DB.prepare(
              'SELECT uid FROM post_events WHERE post_id = ?'
            ).bind(row.msg_id).first();
            
            if (post && post.uid) {
              await env.DB.prepare(`
                UPDATE merit_events SET to_uid = ? WHERE id = ?
              `).bind(post.uid, row.id).run();
              
              const amountRow = await env.DB.prepare('SELECT amount FROM merit_events WHERE id = ?').bind(row.id).first();
              await updateUserStats(post.uid, amountRow?.amount || 1, 'received', env);
              fixed++;
              fromCache++;
              continue;
            }
            
            const postUrl = `https://bitcointalk.org/index.php?topic=${row.topic_id}.msg${row.msg_id}#msg${row.msg_id}`;
            const res = await fetch(postUrl, {
              headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': BTT_COOKIE,
                'Accept': 'text/html,application/xhtml+xml'
              }
            });
            
            if (!res.ok) {
              failed++;
              continue;
            }
            
            const html = await res.text();
            
            const authorRegex = /<a\s+href="[^"]*action=profile;u=(\d+)"[^>]*>\s*<b>([^<]+)<\/b>\s*<\/a>/i;
            const authorMatch = html.match(authorRegex);
            
            const msgRegex = new RegExp(`msg${row.msg_id}[\\s\\S]*?action=profile;u=(\\d+)`, 'i');
            const msgMatch = html.match(msgRegex);
            
            const to_uid = authorMatch ? parseInt(authorMatch[1]) : 
                           (msgMatch ? parseInt(msgMatch[1]) : null);
            
            if (to_uid) {
              await env.DB.prepare(`
                UPDATE merit_events 
                SET to_uid = ? 
                WHERE id = ?
              `).bind(to_uid, row.id).run();
              
              const amountRow = await env.DB.prepare('SELECT amount FROM merit_events WHERE id = ?').bind(row.id).first();
              await updateUserStats(to_uid, amountRow?.amount || 1, 'received', env);
              
              const postExists = await env.DB.prepare(
                'SELECT id FROM post_events WHERE post_id = ?'
              ).bind(row.msg_id).first();
              
              if (!postExists) {
                const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
                const title = titleMatch ? titleMatch[1].replace(/^Bitcointalk /, '').trim() : 'Untitled';
                
                const boardMatch = html.match(/board=(\d+)/i);
                const board_id = boardMatch ? parseInt(boardMatch[1]) : 0;
                
                const usernameMatch = html.match(/<a\s+href="[^"]*action=profile;u=\d+"[^>]*>\s*<b>([^<]+)<\/b>\s*<\/a>/i);
                const username = usernameMatch ? usernameMatch[1].trim() : null;
                
                await env.DB.prepare(`
                  INSERT INTO post_events (uid, username, post_id, topic_id, board_id, title, timestamp, collected_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                  to_uid, 
                  username,
                  row.msg_id,
                  row.topic_id,
                  board_id,
                  title,
                  new Date().toISOString(),
                  Date.now()
                ).run();
                postsCreated++;
              }
              
              fixed++;
              fromScrape++;
            } else {
              failed++;
            }
            
          } catch (e) {
            console.error(`Failed to fix row ${row.id}:`, e.message);
            failed++;
          }
        }
        
        const cutoff = Date.now() - 120 * 86400000;
        await env.DB.prepare(`
          UPDATE user_profiles 
          SET merit_received_120d = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM merit_events 
            WHERE to_uid = user_profiles.uid 
            AND collected_at > ?
          ),
          merit_sent_120d = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM merit_events 
            WHERE from_uid = user_profiles.uid 
            AND collected_at > ?
          ),
          updated_at = ?
        `).bind(cutoff, cutoff, Date.now()).run();
        
        return Response.json({ 
          ok: true, 
          fixed,
          from_cache: fromCache,
          from_scrape: fromScrape,
          posts_created: postsCreated,
          failed,
          processed: nulls.results.length,
          message: `Fixed ${fixed} merits (${fromCache} from cache, ${fromScrape} from scrape)`
        }, { headers: corsHeaders });
        
      } catch (err) {
        console.error('Error in fixAllNull:', err);
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // /fix-null - Corregge i meriti senza to_uid (batch di 20)
    // ═══════════════════════════════════════════════════════════════
    if (path === '/fix-null') {
      const BTT_COOKIE = env.BTT_COOKIE;
      
      if (!BTT_COOKIE) {
        return Response.json({ 
          error: 'Missing BTT_COOKIE environment variable' 
        }, { status: 500, headers: corsHeaders });
      }
      
      try {
        const nulls = await env.DB.prepare(`
          SELECT id, msg_id, topic_id, from_uid 
          FROM merit_events 
          WHERE to_uid IS NULL 
          LIMIT 20
        `).all();
        
        if (!nulls.results.length) {
          return Response.json({ 
            ok: true, 
            fixed: 0, 
            message: 'No null to_uid entries found' 
          }, { headers: corsHeaders });
        }
        
        let fixed = 0;
        let failed = 0;
        
        for (const row of nulls.results) {
          await new Promise(r => setTimeout(r, 500));
          
          try {
            const post = await env.DB.prepare(
              'SELECT uid FROM post_events WHERE post_id = ?'
            ).bind(row.msg_id).first();
            
            if (post && post.uid) {
              await env.DB.prepare(`
                UPDATE merit_events SET to_uid = ? WHERE id = ?
              `).bind(post.uid, row.id).run();
              
              const amountRow = await env.DB.prepare('SELECT amount FROM merit_events WHERE id = ?').bind(row.id).first();
              await updateUserStats(post.uid, amountRow?.amount || 1, 'received', env);
              fixed++;
              continue;
            }
            
            const postUrl = `https://bitcointalk.org/index.php?topic=${row.topic_id}.msg${row.msg_id}#msg${row.msg_id}`;
            const res = await fetch(postUrl, {
              headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': BTT_COOKIE 
              }
            });
            
            if (!res.ok) continue;
            
            const html = await res.text();
            
            const authorRegex = new RegExp(`msg${row.msg_id}[\\s\\S]*?action=profile;u=(\\d+)`, 'i');
            const authorMatch = html.match(authorRegex);
            const to_uid = authorMatch ? parseInt(authorMatch[1]) : null;
            
            if (to_uid) {
              await env.DB.prepare(`
                UPDATE merit_events 
                SET to_uid = ? 
                WHERE id = ?
              `).bind(to_uid, row.id).run();
              
              const amountRow = await env.DB.prepare('SELECT amount FROM merit_events WHERE id = ?').bind(row.id).first();
              await updateUserStats(to_uid, amountRow?.amount || 1, 'received', env);
              fixed++;
            } else {
              failed++;
            }
            
          } catch (e) {
            console.error(`Failed to fix row ${row.id}:`, e.message);
            failed++;
          }
        }
        
        return Response.json({ 
          ok: true, 
          fixed, 
          failed,
          processed: nulls.results.length 
        }, { headers: corsHeaders });
        
      } catch (err) {
        console.error('Error in fixNullToUid:', err);
        return Response.json({ 
          error: err.message 
        }, { status: 500, headers: corsHeaders });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // Root - Info
    // ═══════════════════════════════════════════════════════════════
    return new Response(JSON.stringify({
      name: 'Merit Scraper Worker',
      version: '2.7',
      endpoints: [
        '/collect - Scrape recent merits (with unique_key duplicate check)',
        '/force-collect?secret=XXX - Force save merits (no duplicate check)',
        '/deduplicate?secret=XXX - Remove existing duplicates',
        '/add-unique-key-column?secret=XXX - Add unique_key column to DB',
        '/populate-unique-keys?secret=XXX - Populate unique_key for existing records',
        '/reset-all?secret=XXX - DELETE ALL merits and reset stats',
        '/reset-merits?secret=XXX - Fix corrupted data',
        '/fix-all-null?secret=XXX - Fix ALL missing to_uid (with post creation)',
        '/fix-null - Fix missing to_uid (batch of 20)',
        '/stats - Database statistics',
        '/user-stats?uid=XXX - User statistics',
        '/sync-users (POST) - Sync usernames from BRDb',
        '/merit-history?uid=XXX - User merit history',
        '/clean-orphans?secret=XXX - Delete orphan merits',
        '/fix-merit-counts?secret=XXX - Recalculate all user counts',
        '/query?secret=XXX - Execute SQL (POST)'
      ]
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// ──────────────────────────────────────────────────────────────────
// FUNZIONI DI SUPPORTO
// ──────────────────────────────────────────────────────────────────

async function updateUserStats(uid, amount, type, env) {
  const existing = await env.DB.prepare(
    'SELECT uid FROM user_profiles WHERE uid = ?'
  ).bind(uid).first();
  
  if (existing) {
    const field = type === 'sent' ? 'merit_sent_120d' : 'merit_received_120d';
    
    if (type === 'received') {
      await env.DB.prepare(`
        UPDATE user_profiles 
        SET ${field} = COALESCE(${field}, 0) + ?,
            merit_total = COALESCE(merit_total, 0) + ?,
            posts_120d = COALESCE(posts_120d, 0),
            updated_at = ?
        WHERE uid = ?
      `).bind(amount, amount, Date.now(), uid).run();
    } else {
      await env.DB.prepare(`
        UPDATE user_profiles 
        SET ${field} = COALESCE(${field}, 0) + ?,
            posts_120d = COALESCE(posts_120d, 0),
            updated_at = ?
        WHERE uid = ?
      `).bind(amount, Date.now(), uid).run();
    }
  } else {
    const receivedInit = type === 'received' ? amount : 0;
    const totalInit = type === 'received' ? amount : 0;
    const sentInit = type === 'sent' ? amount : 0;
    await env.DB.prepare(`
      INSERT INTO user_profiles (uid, username, merit_received_120d, merit_sent_120d, merit_total, posts_120d, updated_at)
      VALUES (?, NULL, ?, ?, ?, 0, ?)
    `).bind(uid, receivedInit, sentInit, totalInit, Date.now()).run();
  }
  
  // Trigger profile scrape in background (non-blocking)
  env.BTT_COOKIE && env.self && env.self.fetch(new Request('https://placeholder/force-profile?uid=' + uid, {
    headers: { 'Cookie': env.BTT_COOKIE }
  })).catch(() => {});
}

async function getUserStats(uid, env) {
  try {
    const [topBoards, topThreads, topSenders, topReceivers] = await Promise.all([
      env.DB.prepare(`
        SELECT 
          CASE 
            WHEN board_id = 28 THEN 'Italian'
            WHEN board_id = 228 THEN 'Gambling discussion'
            WHEN board_id = 67 THEN 'Altcoin Discussion'
            WHEN board_id = 1 THEN 'Bitcoin Discussion'
            WHEN board_id = 56 THEN 'Gambling'
            ELSE NULL
          END as board_name,
          board_id,
          COUNT(*) as count
        FROM post_events
        WHERE uid = ? AND board_id IS NOT NULL
        GROUP BY board_id
        ORDER BY count DESC
        LIMIT 8
      `).bind(uid).all(),
      env.DB.prepare(`
        SELECT topic_id, title, COUNT(*) as count, MAX(timestamp) as last_post
        FROM post_events
        WHERE uid = ? AND topic_id IS NOT NULL
        GROUP BY topic_id
        ORDER BY count DESC
        LIMIT 5
      `).bind(uid).all(),
      env.DB.prepare(`
        SELECT m.from_uid, COALESCE(u.username, 'User #' || m.from_uid) as username, SUM(m.amount) as total
        FROM merit_events m
        LEFT JOIN user_profiles u ON u.uid = m.from_uid
        WHERE m.to_uid = ? AND m.from_uid IS NOT NULL
        GROUP BY m.from_uid
        ORDER BY total DESC
        LIMIT 10
      `).bind(uid).all(),
      env.DB.prepare(`
        SELECT m.to_uid, COALESCE(u.username, 'User #' || m.to_uid) as username, SUM(m.amount) as total
        FROM merit_events m
        LEFT JOIN user_profiles u ON u.uid = m.to_uid
        WHERE m.from_uid = ? AND m.to_uid IS NOT NULL
        GROUP BY m.to_uid
        ORDER BY total DESC
        LIMIT 10
      `).bind(uid).all()
    ]);
    
    const processedBoards = (topBoards.results || []).map(b => ({
      board_name: b.board_name || `Board #${b.board_id}`,
      board_id: b.board_id,
      count: b.count
    }));
    
    return Response.json({
      success: true,
      uid,
      topBoards: processedBoards,
      topThreads: topThreads.results || [],
      topSenders: topSenders.results || [],
      topReceivers: topReceivers.results || []
    }, { headers: corsHeaders });
    
  } catch (err) {
    console.error('Error in /user-stats:', err);
    return Response.json({ 
      success: false, 
      error: err.message,
      uid 
    }, { status: 500, headers: corsHeaders });
  }
}

async function syncUsernames(env) {
  try {
    const brdbUsers = await env.BRDB_DB.prepare(
      'SELECT uid, username FROM brdb_users WHERE username IS NOT NULL'
    ).all();
    
    let updated = 0;
    const BATCH_SIZE = 100;
    const users = brdbUsers.results || [];
    
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const stmts = batch.map(u => 
        env.DB.prepare(`
          UPDATE user_profiles SET username = ? WHERE uid = ?
        `).bind(u.username, u.uid)
      );
      const results = await env.DB.batch(stmts);
      for (const r of results) {
        if (r.meta?.changes > 0) updated++;
      }
    }
    
    return Response.json({
      success: true,
      updated,
      total: users.length
    }, { headers: corsHeaders });
    
  } catch (err) {
    console.error('Error in syncUsernames:', err);
    return Response.json({
      success: false,
      error: err.message
    }, { status: 500, headers: corsHeaders });
  }
}

async function getMeritHistory(uid, env) {
  try {
    const received = await env.DB.prepare(`
      SELECT 
        m.id,
        m.amount,
        m.from_uid,
        m.to_uid,
        m.msg_id,
        m.topic_id,
        m.title,
        m.timestamp,
        m.collected_at,
        m.unique_key,
        COALESCE(u.username, 'User #' || m.from_uid) as from_username
      FROM merit_events m
      LEFT JOIN user_profiles u ON u.uid = m.from_uid
      WHERE m.to_uid = ?
      ORDER BY m.collected_at DESC
      LIMIT 50
    `).bind(uid).all();
    
    const sent = await env.DB.prepare(`
      SELECT 
        m.id,
        m.amount,
        m.from_uid,
        m.to_uid,
        m.msg_id,
        m.topic_id,
        m.title,
        m.timestamp,
        m.collected_at,
        m.unique_key,
        COALESCE(u.username, 'User #' || m.to_uid) as to_username
      FROM merit_events m
      LEFT JOIN user_profiles u ON u.uid = m.to_uid
      WHERE m.from_uid = ?
      ORDER BY m.collected_at DESC
      LIMIT 50
    `).bind(uid).all();
    
    const totalReceived = (received.results || []).reduce((sum, r) => sum + r.amount, 0);
    const totalSent = (sent.results || []).reduce((sum, s) => sum + s.amount, 0);
    
    return Response.json({
      uid,
      totals: {
        received: totalReceived,
        sent: totalSent,
        net: totalReceived - totalSent
      },
      received: received.results || [],
      sent: sent.results || []
    }, { headers: corsHeaders });
    
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
