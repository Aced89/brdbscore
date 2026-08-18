// ═══════════════════════════════════════════════════════════════
// POST SCRAPER WORKER v4.6 - COMPLETO E FUNZIONANTE
// ═══════════════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // ═══════════════════════════════════════════════════════════════
    // GET /get-post-body — Restituisce il body del post (API JSON)
    // ═══════════════════════════════════════════════════════════════
    if (path === '/get-post-body' && url.searchParams.get('post_id')) {
      const post_id = url.searchParams.get('post_id');
      const topic_id = url.searchParams.get('topic_id');
      
      if (!topic_id) {
        return Response.json({ error: 'Missing topic_id' }, { status: 400 });
      }
      
      try {
        const postUrl = 'https://bitcointalk.org/index.php?topic=' + topic_id + '.msg' + post_id + '#msg' + post_id;
        const res = await fetch(postUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': env.BTT_COOKIE || '',
            'Accept': 'text/html,application/xhtml+xml'
          }
        });
        
        if (!res.ok) {
          return Response.json({ error: 'HTTP ' + res.status }, res.status);
        }
        
        const html = await res.text();
        let postBody = extractPostBody(html, post_id);
        
        if (postBody) {
          postBody = postBody.replace(/<hr[^>]*class="hrcolor"[^>]*>[\s\S]*?<div class="signature[^"]*">.*?<\/div>/gi, '');
          postBody = postBody.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          postBody = postBody.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
        }
        
        return Response.json({ 
          success: true, 
          body: postBody || '',
          post_id: post_id,
          found: !!postBody
        });
        
      } catch (err) {
        return Response.json({ error: err.message }, 500);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // GET /post/:post_id — Mostra il post completo (HTML)
    // ═══════════════════════════════════════════════════════════════
    if (path.startsWith('/post/') && request.method === 'GET') {
      const parts = path.split('/');
      const post_id = parseInt(parts[2]);
      if (!post_id) {
        return new Response('Invalid post_id', { status: 400 });
      }
      
      const topic_id = parseInt(url.searchParams.get('topic')) || null;
      
      if (!topic_id) {
        return new Response('Missing topic_id', { status: 400 });
      }
      
      try {
        const postUrl = 'https://bitcointalk.org/index.php?topic=' + topic_id + '.msg' + post_id + '#msg' + post_id;
        const res = await fetch(postUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': env.BTT_COOKIE || '',
            'Accept': 'text/html,application/xhtml+xml'
          }
        });
        
        // Se la richiesta fallisce, mostra il link a Bitcointalk
        if (!res.ok) {
          return new Response(htmlError(post_id, topic_id, 'HTTP ' + res.status), { 
            status: 200, 
            headers: { 'Content-Type': 'text/html; charset=utf-8' } 
          });
        }
        
        const html = await res.text();
        
        // ─── ESTRAI IL BODY ──────────────────────────────────────
        let postBody = extractPostBody(html, post_id);
        
        // ─── PULISCI IL BODY SE TROVATO ──────────────────────────
        if (postBody) {
          // Rimuovi il div esterno
          postBody = postBody.replace(/^<div[^>]*>/, '');
          postBody = postBody.replace(/<\/div>$/, '');
          // Rimuovi signature
          postBody = postBody.replace(/<hr[^>]*class="hrcolor"[^>]*>[\s\S]*?<div class="signature[^"]*">.*?<\/div>/gi, '');
          postBody = postBody.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          postBody = postBody.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
        } else {
          // Solo se NON trovato, usa il fallback
          postBody = '<div style="text-align:center;padding:40px;color:#64748b">' +
            '<div style="font-size:48px;margin-bottom:12px">📝</div>' +
            '<div style="margin-bottom:8px">Post content not available</div>' +
            '<a href="' + postUrl + '" target="_blank" style="color:#60a5fa;font-size:14px;text-decoration:underline">🔗 View on Bitcointalk →</a>' +
            '</div>';
        }
        
        // ─── ESTRAI TITOLO ──────────────────────────────────────
        let title = 'Post #' + post_id;
        const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
        if (titleMatch) {
          title = titleMatch[1].replace(/ - Bitcoin Forum$/, '').trim();
        }
        
        // ─── ESTRAI AUTORE ──────────────────────────────────────
        let authorName = 'Unknown';
        const authorMatch = html.match(/action=profile;u=(\d+)[^>]*>([^<]+)<\/a>/i);
        if (authorMatch) {
          authorName = authorMatch[2].trim();
        }
        
        // ─── ESTRAI DATA ──────────────────────────────────────
        let postDate = 'Unknown date';
        const dateMatch = html.match(/Posted on:\s*<\/b>\s*([^<]+)<\/td>/i);
        if (dateMatch) {
          postDate = dateMatch[1].trim();
        }
        
        // ─── ESTRAI BOARD ──────────────────────────────────────
        let board_id = null;
        const boardMatch = html.match(/board=(\d+)/i);
        if (boardMatch) {
          board_id = parseInt(boardMatch[1]);
        }
        
        const boardNames = {
          1: 'Bitcoin Discussion', 28: 'Italian', 56: 'Gambling', 67: 'Altcoin Discussion',
          153: 'Guide (Italiano)', 228: 'Gambling discussion', 89: 'India', 9: 'Off-topic'
        };
        const boardName = boardNames[board_id] || ('Board #' + (board_id || '?'));
        
        function escapeHtml(str) {
          if (!str) return '';
          return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
          });
        }
        
        const finalHtml = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + escapeHtml(title) + ' - BRDb</title>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{background:#080c18;color:#e8edf5;font-family:system-ui,sans-serif;min-height:100vh;padding:20px}\n.wrap{max-width:840px;margin:0 auto}\nnav{display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;margin-bottom:24px;border-bottom:1px solid rgba(255,255,255,.06)}\n.logo{font-size:20px;font-weight:800;color:#fbbf24;text-decoration:none}\n.logo span{color:#e8edf5}\n.links{display:flex;gap:12px}\n.links a{color:#94a3b8;text-decoration:none;font-size:13px;font-weight:600;padding:6px 12px;border-radius:8px}\n.links a:hover{color:#e8edf5;background:rgba(255,255,255,.05)}\n.card{background:rgba(15,23,42,.7);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:24px;margin-bottom:16px}\n.meta{display:flex;gap:12px;flex-wrap:wrap;font-size:13px;color:#94a3b8;margin-bottom:12px}\n.meta .author{color:#fff;font-weight:600}\n.title{font-size:20px;font-weight:700;color:#fbbf24;margin-bottom:16px}\n.content{font-size:14px;line-height:1.6;color:#cbd5e1}\n.content .quoteheader{color:#a855f7;margin:8px 0 4px}\n.content .quote{background:rgba(0,0,0,0.3);border-left:3px solid #a855f7;padding:8px 12px;margin:4px 0 8px;border-radius:4px}\n.btc-link{display:inline-block;margin-top:16px;padding:10px 24px;background:linear-gradient(135deg,#fbbf24,#f59e0b);border-radius:40px;color:#0f172a;font-weight:700;text-decoration:none}\n.btc-link:hover{transform:scale(1.02)}\n.footer{text-align:center;margin-top:32px;font-size:12px;color:#475569}\n</style>\n</head>\n<body>\n<div class="wrap">\n<nav>\n<a class="logo" href="/">✦ <span>BRDb</span></a>\n<div class="links">\n<a href="javascript:history.back()">← Back</a>\n</div>\n</nav>\n<div class="card">\n<div class="meta">\n<span class="author">' + escapeHtml(authorName) + '</span>\n<span>📁 ' + escapeHtml(boardName) + '</span>\n<span>📅 ' + escapeHtml(postDate) + '</span>\n</div>\n<div class="title">' + escapeHtml(title) + '</div>\n<div class="content">' + postBody + '</div>\n</div>\n<div style="text-align:center">\n<a href="' + postUrl + '" target="_blank" class="btc-link">🔗 View on Bitcointalk →</a>\n</div>\n<div class="footer">✦ BRDb — Post Viewer ✦</div>\n</div>\n</body>\n</html>';

        return new Response(finalHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
        
      } catch (err) {
        const postUrl = 'https://bitcointalk.org/index.php?topic=' + topic_id + '.msg' + post_id + '#msg' + post_id;
        return new Response(htmlError(post_id, topic_id, err.message), { 
          status: 200, 
          headers: { 'Content-Type': 'text/html; charset=utf-8' } 
        });
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // ALTRI ENDPOINT
    // ═══════════════════════════════════════════════════════════════
    
    // ─── STATS ──────────────────────────────────────────────────
    if (path === '/stats') {
      try {
        const count = await env.DB.prepare('SELECT COUNT(*) as n FROM post_events').first();
        const quotes = await env.DB.prepare('SELECT COUNT(*) as n FROM quote_events').first();
        return Response.json({ 
          total_posts: count?.n || 0,
          total_quotes: quotes?.n || 0
        });
      } catch (e) {
        return Response.json({ error: e.message }, 500);
      }
    }
    
    // ─── QUOTES-FOR-USER ────────────────────────────────────────
    if (path === '/quotes-for-user' && url.searchParams.get('uid')) {
      const uid = url.searchParams.get('uid');
      
      try {
        const userProfile = await env.DB.prepare(
          'SELECT username FROM user_profiles WHERE uid = ?'
        ).bind(uid).first();
        
        const username = userProfile?.username;
        let params = [uid];
        let query = 'SELECT q.*, p.title as post_title, p.board_id, p.topic_id FROM quote_events q LEFT JOIN post_events p ON p.post_id = q.post_id WHERE q.quoted_uid = ?';
        
        if (username) {
          query += ' OR (q.quoted_uid IS NULL AND q.quoted_name = ?)';
          params.push(username);
        }
        
        query += ' ORDER BY q.collected_at DESC LIMIT 50';
        
        const quotes = await env.DB.prepare(query).bind(...params).all();
        
        return Response.json({ 
          ok: true, 
          quotes: quotes.results,
          searched_by_uid: uid,
          searched_by_name: username
        });
      } catch (e) {
        return Response.json({ ok: false, error: e.message }, { status: 500 });
      }
    }
    
    // ─── FIX-QUOTES ─────────────────────────────────────────────
    if (path === '/fix-quotes' && url.searchParams.get('post_id')) {
      const post_id = parseInt(url.searchParams.get('post_id'));
      return await fixMissingQuotes(env, post_id);
    }
    
    // ─── FIX-ALL-QUOTES ─────────────────────────────────────────
    if (path === '/fix-all-quotes') {
      const limit = parseInt(url.searchParams.get('limit') || '100');
      return await fixAllMissingQuotes(env, limit);
    }
    
    // ─── COLLECT ─────────────────────────────────────────────────
    if (path === '/collect') {
      return await collectPosts(env, request);
    }
    
    // ─── COLLECT-MULTI ───────────────────────────────────────────
    if (path === '/collect-multi' || path === '/collect-all') {
      return await collectPostsMulti(env, request);
    }
    
    return new Response('Post Scraper OK - v4.6', { status: 200 });
  }
};

// ═══════════════════════════════════════════════════════════════
// FUNZIONI DI SUPPORTO
// ═══════════════════════════════════════════════════════════════

// ─── HTML ERROR ──────────────────────────────────────────────────

function htmlError(post_id, topic_id, error) {
  const postUrl = 'https://bitcointalk.org/index.php?topic=' + topic_id + '.msg' + post_id + '#msg' + post_id;
  return '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Post #' + post_id + ' - BRDb</title>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{background:#080c18;color:#e8edf5;font-family:system-ui,sans-serif;min-height:100vh;padding:40px;text-align:center}\n.wrap{max-width:600px;margin:0 auto}\n.icon{font-size:64px;margin-bottom:16px}\nh2{font-size:24px;font-weight:700;margin-bottom:8px}\n.error{color:#ef4444;font-size:14px;margin-bottom:16px}\na{color:#60a5fa;font-size:16px;text-decoration:underline;display:inline-block;margin-top:8px}\n.footer{margin-top:32px;font-size:12px;color:#475569}\n</style>\n</head>\n<body>\n<div class="wrap">\n<div class="icon">⚠️</div>\n<h2>Post #' + post_id + '</h2>\n<p class="error">' + error + '</p>\n<a href="' + postUrl + '" target="_blank">🔗 View on Bitcointalk →</a>\n<div class="footer">✦ BRDb — Post Viewer ✦</div>\n</div>\n</body>\n</html>';
}

// ─── EXTRACT POST BODY ──────────────────────────────────────────

function extractPostBody(html, post_id) {
  // 🔥 METODO 1: Cerca <a name="msgXXXXX"> (senza underscore)
  var searchStr1 = 'name="msg' + post_id + '"';
  var pos1 = html.indexOf(searchStr1);
  
  if (pos1 !== -1) {
    var start = html.lastIndexOf('<div', pos1);
    if (start !== -1) {
      var depth = 1;
      var i = start + 4;
      while (i < html.length && depth > 0) {
        if (html.substring(i, i + 4) === '<div') depth++;
        if (html.substring(i, i + 6) === '</div>') depth--;
        i++;
      }
      var candidate = html.substring(start, i);
      if (candidate.indexOf('msg' + post_id) !== -1) {
        return candidate;
      }
    }
  }
  
  // 🔥 METODO 2: Cerca <a name="msg_XXXXX"> (con underscore)
  var searchStr2 = 'name="msg_' + post_id + '"';
  var pos2 = html.indexOf(searchStr2);
  
  if (pos2 !== -1) {
    var start2 = html.lastIndexOf('<div', pos2);
    if (start2 !== -1) {
      var depth2 = 1;
      var i2 = start2 + 4;
      while (i2 < html.length && depth2 > 0) {
        if (html.substring(i2, i2 + 4) === '<div') depth2++;
        if (html.substring(i2, i2 + 6) === '</div>') depth2--;
        i2++;
      }
      var candidate2 = html.substring(start2, i2);
      if (candidate2.indexOf('msg_' + post_id) !== -1) {
        return candidate2;
      }
    }
  }
  
  // 🔥 METODO 3: Cerca il div della finestra del messaggio
  var msgPattern = 'msg' + post_id;
  var msgPos = html.indexOf(msgPattern);
  if (msgPos !== -1) {
    var start3 = html.lastIndexOf('<div', msgPos);
    if (start3 !== -1) {
      var depth3 = 1;
      var i3 = start3 + 4;
      while (i3 < html.length && depth3 > 0) {
        if (html.substring(i3, i3 + 4) === '<div') depth3++;
        if (html.substring(i3, i3 + 6) === '</div>') depth3--;
        i3++;
      }
      var candidate3 = html.substring(start3, i3);
      if (candidate3.indexOf('msg' + post_id) !== -1 && candidate3.length < 50000) {
        return candidate3;
      }
    }
  }
  
  // 🔥 METODO 4: Cerca <div class="post"> che contiene il msg_id
  var divStart = html.indexOf('<div class="post">');
  while (divStart !== -1) {
    var depth4 = 1;
    var i4 = divStart + 18;
    while (i4 < html.length && depth4 > 0) {
      if (html.substring(i4, i4 + 4) === '<div') depth4++;
      if (html.substring(i4, i4 + 6) === '</div>') depth4--;
      i4++;
    }
    var candidate4 = html.substring(divStart, i4);
    if (candidate4.indexOf('msg' + post_id) !== -1) {
      return candidate4;
    }
    divStart = html.indexOf('<div class="post">', i4);
  }
  
  return null;
}

// ─── EXTRACT QUOTES ─────────────────────────────────────────────

function extractQuotesFromPost(postHtml) {
  var quotes = [];
  var regex = /Quote from:\s*<a[^>]*href="[^"]*action=profile;u=(\d+)[^>]*>([^<]+)<\/a>/gi;
  var match;
  
  while ((match = regex.exec(postHtml)) !== null) {
    quotes.push({
      quoted_uid: parseInt(match[1]),
      quoted_name: match[2].trim()
    });
  }
  
  // Se non trova quote con UID, prova con solo nome
  if (quotes.length === 0) {
    var regex2 = /Quote from:\s*([^<]+?)(?:\s+on\s+|\s*<)/gi;
    while ((match = regex2.exec(postHtml)) !== null) {
      var name = match[1].trim().replace(/<[^>]*>/g, '');
      if (name) {
        var exists = false;
        for (var j = 0; j < quotes.length; j++) {
          if (quotes[j].quoted_name === name) {
            exists = true;
            break;
          }
        }
        if (!exists) {
          quotes.push({ quoted_uid: null, quoted_name: name });
        }
      }
    }
  }
  
  return quotes;
}

// ─── FIX MISSING QUOTES ─────────────────────────────────────────

async function fixMissingQuotes(env, post_id) {
  var BTT_COOKIE = env.BTT_COOKIE;
  if (!BTT_COOKIE) {
    return Response.json({ error: 'Missing BTT_COOKIE' }, 500);
  }
  
  var post = await env.DB.prepare('SELECT * FROM post_events WHERE post_id = ?').bind(post_id).first();
  if (!post) {
    return Response.json({ error: 'Post not found', post_id: post_id });
  }
  
  var postUrl = 'https://bitcointalk.org/index.php?topic=' + post.topic_id + '.msg' + post_id + '#msg' + post_id;
  var res = await fetch(postUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': BTT_COOKIE }
  });
  
  if (!res.ok) {
    return Response.json({ error: 'HTTP ' + res.status }, res.status);
  }
  
  var html = await res.text();
  var postBody = extractPostBody(html, post_id);
  
  if (!postBody) {
    return Response.json({ error: 'Post body not found', post_id: post_id });
  }
  
  var quotes = extractQuotesFromPost(postBody);
  var saved = 0;
  
  for (var i = 0; i < quotes.length; i++) {
    var quote = quotes[i];
    var quotedUid = quote.quoted_uid;
    
    if (!quotedUid && quote.quoted_name) {
      var userMatch = await env.DB.prepare(
        'SELECT uid FROM user_profiles WHERE username = ? LIMIT 1'
      ).bind(quote.quoted_name).first();
      
      if (userMatch) {
        quotedUid = userMatch.uid;
      }
    }
    
    if (quotedUid) {
      var exists = await env.DB.prepare(
        'SELECT id FROM quote_events WHERE post_id = ? AND quoted_uid = ?'
      ).bind(post_id, quotedUid).first();
      
      if (!exists) {
        await env.DB.prepare(`
          INSERT INTO quote_events (
            quoted_uid, quoted_by_uid, quoted_by_name, quoted_name,
            post_id, topic_id, board_id, timestamp, collected_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          quotedUid, post.uid || null, post.username || null, quote.quoted_name,
          post_id, post.topic_id, post.board_id,
          Date.now(), Date.now()
        ).run();
        saved++;
      }
    }
  }
  
  return Response.json({ 
    ok: true, 
    post_id: post_id, 
    quotes_found: quotes.length, 
    quotes_saved: saved
  });
}

// ─── FIX ALL MISSING QUOTES ─────────────────────────────────────

async function fixAllMissingQuotes(env, limit) {
  var posts = await env.DB.prepare('SELECT post_id FROM post_events ORDER BY collected_at DESC LIMIT ?').bind(limit).all();
  var results = [];
  var totalFound = 0;
  var totalSaved = 0;
  
  for (var i = 0; i < (posts.results || []).length; i++) {
    var result = await fixMissingQuotes(env, posts.results[i].post_id);
    var data = await result.json();
    results.push(data);
    totalFound += data.quotes_found || 0;
    totalSaved += data.quotes_saved || 0;
    await new Promise(function(r) { setTimeout(r, 500); });
  }
  
  return Response.json({ 
    ok: true, 
    processed: results.length, 
    total_quotes_found: totalFound, 
    total_quotes_saved: totalSaved,
    results: results
  });
}

// ─── COLLECT POSTS ──────────────────────────────────────────────

async function collectPosts(env, request) {
  var BTT_COOKIE = env.BTT_COOKIE;
  var url = new URL(request.url);
  var start = url.searchParams.get('start') || '0';
  var db = env.DB;
  
  if (!BTT_COOKIE) {
    return Response.json({ error: 'Missing BTT_COOKIE' }, 500);
  }
  
  try {
    var res = await fetch('https://bitcointalk.org/index.php?action=recent;start=' + start, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': BTT_COOKIE }
    });
    var html = await res.text();
    var postBlocks = html.split(/<tr class="titlebg2">/);
    var saved = 0, skipped = 0, quotesSaved = 0;
    
    for (var i = 1; i < postBlocks.length; i++) {
      var block = postBlocks[i];
      var idMatch = block.match(/topic=(\d+)\.msg(\d+)#msg\d+/);
      if (!idMatch) continue;
      
      var topic_id = parseInt(idMatch[1]);
      var post_id = parseInt(idMatch[2]);
      var exists = await db.prepare('SELECT id FROM post_events WHERE post_id = ?').bind(post_id).first();
      
      var boardMatch = block.match(/board=(\d+)/);
      var board_id = boardMatch ? parseInt(boardMatch[1]) : 0;
      
      var titleMatch = block.match(/<b><a[^>]*>([^<]+)<\/a><\/b>/);
      var title = titleMatch ? titleMatch[1] : 'Untitled';
      
      var lastPosterMatch = block.match(/Last post by <a[^>]*href="[^"]*action=profile;u=(\d+)[^"]*"[^>]*>([^<]+)<\/a>/);
      if (!lastPosterMatch) continue;
      
      var last_uid = parseInt(lastPosterMatch[1]);
      var last_name = lastPosterMatch[2];
      
      var postBody = '';
      var divPostIndex = block.indexOf('<div class="post">');
      if (divPostIndex !== -1) {
        var depth = 1;
        var j = divPostIndex + 18;
        while (j < block.length && depth > 0) {
          if (block.substring(j, j + 4) === '<div') depth++;
          if (block.substring(j, j + 6) === '</div>') depth--;
          j++;
        }
        postBody = block.substring(divPostIndex + 18, j - 6);
      }
      
      var now = Date.now();
      var timestamp = new Date().toISOString();
      
      if (postBody) {
        var quotes = extractQuotesFromPost(postBody);
        for (var q = 0; q < quotes.length; q++) {
          var quote = quotes[q];
          var quotedUid = quote.quoted_uid;
          
          if (!quotedUid && quote.quoted_name) {
            var userMatch = await db.prepare(
              'SELECT uid FROM user_profiles WHERE username = ? LIMIT 1'
            ).bind(quote.quoted_name).first();
            if (userMatch) quotedUid = userMatch.uid;
          }
          
          if (quotedUid) {
            var quoteExists = await db.prepare(
              'SELECT id FROM quote_events WHERE post_id = ? AND quoted_uid = ?'
            ).bind(post_id, quotedUid).first();
            
            if (!quoteExists) {
              await db.prepare(`
                INSERT INTO quote_events (
                  quoted_uid, quoted_by_uid, quoted_by_name, quoted_name,
                  post_id, topic_id, board_id, timestamp, collected_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                quotedUid, last_uid, last_name, quote.quoted_name,
                post_id, topic_id, board_id, now, now
              ).run();
              quotesSaved++;
            }
          }
        }
      }
      
      if (exists) {
        skipped++;
        continue;
      }
      
      await db.prepare(
        'INSERT INTO post_events (uid, username, post_id, topic_id, board_id, title, timestamp, collected_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(last_uid, last_name, post_id, topic_id, board_id, title, timestamp, now).run();
      
      var profile = await db.prepare('SELECT uid FROM user_profiles WHERE uid = ?').bind(last_uid).first();
      if (!profile) {
        await scrapeProfile(last_uid, BTT_COOKIE, db);
      } else {
        await db.prepare(
          'UPDATE user_profiles SET posts_total = COALESCE(posts_total, 0) + 1, posts_120d = COALESCE(posts_120d, 0) + 1, updated_at = ? WHERE uid = ?'
        ).bind(now, last_uid).run();
      }
      
      saved++;
    }
    
    return Response.json({ ok: true, saved: saved, skipped: skipped, quotes_saved: quotesSaved });
    
  } catch (err) {
    return Response.json({ error: err.message }, 500);
  }
}

// ─── COLLECT POSTS MULTI ────────────────────────────────────────

async function collectPostsMulti(env, request) {
  var BTT_COOKIE = env.BTT_COOKIE;
  var totalSaved = 0, totalSkipped = 0, totalQuotes = 0;
  var pages = ['0', '20', '40', '60', '80', '100', '120', '140', '160', '180'];
  var results = [];
  
  if (!BTT_COOKIE) {
    return Response.json({ error: 'Missing BTT_COOKIE' }, 500);
  }
  
  for (var p = 0; p < pages.length; p++) {
    var newUrl = new URL(request.url);
    newUrl.searchParams.set('start', pages[p]);
    var newRequest = new Request(newUrl, request);
    var result = await collectPosts(env, newRequest);
    var data = await result.json();
    
    results.push({ page: pages[p], saved: data.saved || 0, skipped: data.skipped || 0, quotes: data.quotes_saved || 0 });
    
    if (data.ok) {
      totalSaved += data.saved || 0;
      totalSkipped += data.skipped || 0;
      totalQuotes += data.quotes_saved || 0;
    }
    
    await new Promise(function(r) { setTimeout(r, 1000); });
  }
  
  return Response.json({ 
    ok: true, 
    saved: totalSaved, 
    skipped: totalSkipped, 
    quotes_saved: totalQuotes, 
    pages: pages.length,
    details: results
  });
}

// ─── SCRAPE PROFILE ─────────────────────────────────────────────

async function scrapeProfile(uid, cookie, db) {
  await new Promise(function(r) { setTimeout(r, 1500); });
  try {
    var res = await fetch('https://bitcointalk.org/index.php?action=profile;u=' + uid, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookie }
    });
    if (!res.ok) return;
    var html = await res.text();
    var postsMatch = html.match(/<td[^>]*><b[^>]*>Posts:\s*<\/b><\/td>\s*<td[^>]*>(\d+)<\/td>/i);
    var meritMatch = html.match(/<td[^>]*><b[^>]*><a[^>]*>Merit<\/a>:\s*<\/b><\/td>\s*<td[^>]*>(\d+)<\/td>/i);
    var regMatch = html.match(/<td[^>]*><b[^>]*>Date Registered:\s*<\/b><\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    var lastMatch = html.match(/<td[^>]*><b[^>]*>Last Active:\s*<\/b><\/td>\s*<td[^>]*>([^<]*)<\/td>/i);
    var nameMatch = html.match(/<td[^>]*><b[^>]*>Name:\s*<\/b><\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    
    var profile = {
      uid: uid,
      username: nameMatch?.[1]?.trim() || null,
      posts_total: postsMatch ? parseInt(postsMatch[1]) : null,
      merit_total: meritMatch ? parseInt(meritMatch[1]) : null,
      reg_date: regMatch?.[1]?.trim() || null,
      last_active: lastMatch?.[1]?.trim() || null,
      updated_at: Date.now()
    };
    
    var existing = await db.prepare('SELECT uid FROM user_profiles WHERE uid = ?').bind(uid).first();
    if (existing) {
      await db.prepare(
        'UPDATE user_profiles SET username = ?, posts_total = ?, merit_total = ?, reg_date = ?, last_active = ?, updated_at = ? WHERE uid = ?'
      ).bind(profile.username, profile.posts_total, profile.merit_total, profile.reg_date, profile.last_active, profile.updated_at, uid).run();
    } else {
      await db.prepare(
        'INSERT INTO user_profiles (uid, username, posts_total, merit_total, reg_date, last_active, posts_120d, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
      ).bind(uid, profile.username, profile.posts_total, profile.merit_total, profile.reg_date, profile.last_active, profile.updated_at).run();
    }
  } catch (e) {}
}
