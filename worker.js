/**
 * ESPN API Proxy for ChatGPT Custom GPT Actions — v2.2.0
 * Strips ESPN's massive JSON responses to essential data under 100K chars
 * Deploy as a Cloudflare Worker (free tier)
 */

var ESPN_CORE = 'https://site.api.espn.com';
var ESPN_WEB = 'https://site.web.api.espn.com';

export default {
  async fetch(request) {
    var url = new URL(request.url);
    var path = url.pathname;
    var search = url.search;

    var headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=60'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: headers });
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Only GET requests allowed' }), { status: 405, headers: headers });
    }

    try {
      var espnUrl;
      var processor;

      if (path === '/scoreboard' || path === '/scoreboard/') {
        espnUrl = ESPN_CORE + '/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard' + search;
        processor = processScoreboard;
      } else if (path === '/rankings' || path === '/rankings/') {
        espnUrl = ESPN_CORE + '/apis/site/v2/sports/basketball/mens-college-basketball/rankings' + search;
        processor = processRankings;
      } else if (path.startsWith('/teams/') && path.split('/').filter(Boolean).length === 2) {
        var teamId = path.split('/').filter(Boolean)[1];
        espnUrl = ESPN_CORE + '/apis/site/v2/sports/basketball/mens-college-basketball/teams/' + teamId + search;
        processor = processTeamDetail;
      } else if (path === '/teams' || path === '/teams/') {
        espnUrl = ESPN_CORE + '/apis/site/v2/sports/basketball/mens-college-basketball/teams' + (search || '?limit=400');
        processor = processTeamsList;
      } else if (path === '/summary' || path === '/summary/') {
        espnUrl = ESPN_WEB + '/apis/site/v2/sports/basketball/mens-college-basketball/summary' + search;
        processor = processGameSummary;
      } else if (path === '/standings' || path === '/standings/') {
        // If no group param, return conference directory instead of hitting ESPN (all-conf response exceeds 100K)
        var standingsParams = new URL(request.url).searchParams;
        if (!standingsParams.get('group')) {
          return new Response(JSON.stringify({
            _proxy: {
              source: 'ESPN via PoolCommissionerAI proxy',
              version: '2.2.0',
              endpoint: '/standings',
              note: 'Specify a conference with ?group=ID. All-conference response exceeds ChatGPT size limits.'
            },
            message: 'Please specify a conference using ?group=ID. Example: /standings?group=23 for SEC standings.',
            conferences: [
              { name: 'ACC', id: 2 },
              { name: 'A-10', id: 3 },
              { name: 'Big East', id: 4 },
              { name: 'Big Sky', id: 5 },
              { name: 'Big South', id: 6 },
              { name: 'Big Ten', id: 7 },
              { name: 'Big 12', id: 8 },
              { name: 'Big West', id: 9 },
              { name: 'CAA', id: 10 },
              { name: 'C-USA', id: 11 },
              { name: 'Ivy', id: 12 },
              { name: 'MAAC', id: 13 },
              { name: 'MAC', id: 14 },
              { name: 'MVC', id: 18 },
              { name: 'Patriot', id: 22 },
              { name: 'SEC', id: 23 },
              { name: 'SWAC', id: 26 },
              { name: 'Sun Belt', id: 27 },
              { name: 'WCC', id: 29 },
              { name: 'Mountain West', id: 44 },
              { name: 'Horizon', id: 45 },
              { name: 'AAC', id: 62 }
            ]
          }), { headers: headers });
        }
        espnUrl = ESPN_WEB + '/apis/v2/sports/basketball/mens-college-basketball/standings' + search;
        processor = processStandings;
      } else if (path.startsWith('/roster/') && path.split('/').filter(Boolean).length === 2) {
        var rosterId = path.split('/').filter(Boolean)[1];
        espnUrl = ESPN_CORE + '/apis/site/v2/sports/basketball/mens-college-basketball/teams/' + rosterId + '/roster' + search;
        processor = processRoster;
      } else if (path === '/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          version: '2.2.0',
          endpoints: [
            'GET /scoreboard — Todays scores (optional: ?dates=YYYYMMDD)',
            'GET /rankings — AP Top 25 and Coaches Poll',
            'GET /teams — List teams (optional: ?limit=N)',
            'GET /teams/{id} — Specific team detail',
            'GET /summary?event={id} — Game box score and summary',
            'GET /standings — Conference standings (optional: ?group={confId}&season=YYYY)',
            'GET /roster/{teamId} — Team roster with player profiles',
            'GET /health — This endpoint'
          ],
          conferenceIds: {
            'ACC': 2,
            'Big East': 4,
            'Big Sky': 5,
            'Big South': 6,
            'Big Ten': 7,
            'Big 12': 8,
            'Big West': 9,
            'Ivy': 12,
            'SEC': 23,
            'WCC': 29,
            'AAC': 62,
            'Mountain West': 44,
            'A-10': 3,
            'MVC': 18,
            'Horizon': 45,
            'MAAC': 13,
            'Patriot': 22,
            'CAA': 10,
            'C-USA': 11,
            'Sun Belt': 27,
            'MAC': 14,
            'SWAC': 26
          }
        }), { headers: headers });
      } else {
        return new Response(JSON.stringify({
          error: 'Unknown endpoint. Try /health for a list of available endpoints.'
        }), { status: 404, headers: headers });
      }

      var espnResponse = await fetch(espnUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PoolCommissionerAI/2.0)' }
      });

      if (!espnResponse.ok) {
        return new Response(JSON.stringify({
          error: 'ESPN returned HTTP ' + espnResponse.status,
          espnUrl: espnUrl
        }), { status: espnResponse.status, headers: headers });
      }

      var rawData = await espnResponse.json();
      var rawSize = JSON.stringify(rawData).length;
      var processed = processor(rawData);
      var processedSize = JSON.stringify(processed).length;

      var finalResponse = {
        _proxy: {
          source: 'ESPN via PoolCommissionerAI proxy',
          version: '2.2.0',
          endpoint: path,
          fetchedAt: new Date().toISOString(),
          originalSize: Math.round(rawSize / 1024) + 'KB',
          deliveredSize: Math.round(processedSize / 1024) + 'KB',
          reduction: Math.round((1 - processedSize / rawSize) * 100) + '%'
        }
      };
      Object.assign(finalResponse, processed);

      return new Response(JSON.stringify(finalResponse, null, 0), { headers: headers });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: headers });
    }
  }
};

// ============================================================
// PROCESSORS
// ============================================================

function processScoreboard(data) {
  var events = data.events || [];
  return {
    date: (data.leagues && data.leagues[0] && data.leagues[0].season && data.leagues[0].season.displayName) || 'Unknown season',
    gameCount: events.length,
    games: events.map(function(event) {
      var comp = (event.competitions && event.competitions[0]) || {};
      var teams = comp.competitors || [];
      var home = teams.find(function(t) { return t.homeAway === 'home'; }) || teams[0] || {};
      var away = teams.find(function(t) { return t.homeAway === 'away'; }) || teams[1] || {};
      var status = comp.status || {};
      var statusType = status.type || {};

      return {
        eventId: event.id,
        name: event.shortName || event.name,
        status: statusType.description || 'Unknown',
        detail: statusType.detail || status.displayClock || '',
        completed: statusType.completed || false,
        startTime: event.date || null,
        home: {
          team: (home.team && home.team.displayName) || 'TBD',
          abbrev: (home.team && home.team.abbreviation) || '',
          score: home.score || '0',
          record: (home.records && home.records[0] && home.records[0].summary) || '',
          rank: (home.curatedRank && home.curatedRank.current <= 25) ? home.curatedRank.current : null,
          winner: home.winner || false
        },
        away: {
          team: (away.team && away.team.displayName) || 'TBD',
          abbrev: (away.team && away.team.abbreviation) || '',
          score: away.score || '0',
          record: (away.records && away.records[0] && away.records[0].summary) || '',
          rank: (away.curatedRank && away.curatedRank.current <= 25) ? away.curatedRank.current : null,
          winner: away.winner || false
        },
        tv: (comp.broadcasts && comp.broadcasts[0] && comp.broadcasts[0].names && comp.broadcasts[0].names[0]) || null
      };
    })
  };
}

function processRankings(data) {
  var rawRankings = data.rankings || [];
  var rankings = rawRankings.map(function(ranking) {
    return {
      poll: ranking.name || 'Unknown',
      headline: ranking.headline || '',
      date: ranking.lastUpdated || '',
      teams: (ranking.ranks || []).map(function(r) {
        return {
          rank: r.current,
          prev: (r.previous === 0 || r.previous === null || r.previous === undefined) ? 'NR' : r.previous,
          trend: r.trend || 'steady',
          team: (r.team && (r.team.nickname || r.team.name || r.team.location)) || 'Unknown',
          teamId: (r.team && r.team.id) || null,
          record: r.recordSummary || '',
          points: r.points || null,
          firstPlaceVotes: r.firstPlaceVotes || null
        };
      })
    };
  });
  return { pollCount: rankings.length, rankings: rankings };
}

function processTeamDetail(data) {
  var team = data.team || {};
  var records = (team.record && team.record.items || []).map(function(i) {
    return { type: i.description || i.type || 'Overall', record: i.summary || 'N/A' };
  });
  var nextGame = null;
  if (team.nextEvent && team.nextEvent[0]) {
    nextGame = {
      name: team.nextEvent[0].shortName || team.nextEvent[0].name,
      date: team.nextEvent[0].date
    };
  }
  return {
    id: team.id,
    name: team.displayName || team.name,
    abbreviation: team.abbreviation,
    location: team.location,
    nickname: team.nickname,
    color: team.color ? '#' + team.color : null,
    records: records,
    standingSummary: team.standingSummary || null,
    rank: team.rank || null,
    nextGame: nextGame
  };
}

function processTeamsList(data) {
  var teams = [];
  var sports = data.sports || [];
  for (var s = 0; s < sports.length; s++) {
    var leagues = sports[s].leagues || [];
    for (var l = 0; l < leagues.length; l++) {
      var entries = leagues[l].teams || [];
      for (var e = 0; e < entries.length; e++) {
        var t = entries[e].team || {};
        teams.push({ id: t.id, name: t.displayName || t.name, abbrev: t.abbreviation, location: t.location });
      }
    }
  }
  return { count: teams.length, teams: teams };
}

function processGameSummary(data) {
  var boxscore = data.boxscore || {};
  var teamStats = (boxscore.teams || []).map(function(team) {
    var stats = {};
    (team.statistics || []).forEach(function(s) {
      if (s.label) stats[s.label] = s.displayValue;
    });
    var playersData = (boxscore.players || []).find(function(p) {
      return p.team && team.team && p.team.id === team.team.id;
    });
    var topPlayers = [];
    if (playersData && playersData.statistics && playersData.statistics[0] && playersData.statistics[0].athletes) {
      var labels = playersData.statistics[0].labels || [];
      playersData.statistics[0].athletes.slice(0, 5).forEach(function(a) {
        var pStats = {};
        (a.stats || []).forEach(function(val, i) {
          if (labels[i]) pStats[labels[i]] = val;
        });
        topPlayers.push({ name: (a.athlete && a.athlete.displayName) || 'Unknown', stats: pStats });
      });
    }
    return {
      team: (team.team && team.team.displayName) || 'Unknown',
      abbrev: (team.team && team.team.abbreviation) || '',
      teamStats: stats,
      topPlayers: topPlayers
    };
  });

  var header = data.header || {};
  var comp = (header.competitions && header.competitions[0]) || {};
  var competitors = (comp.competitors || []).map(function(c) {
    return {
      team: (c.team && c.team.displayName) || 'Unknown',
      abbrev: (c.team && c.team.abbreviation) || '',
      score: c.score || '0',
      record: c.record || '',
      rank: c.rank || null,
      winner: c.winner || false,
      homeAway: c.homeAway || ''
    };
  });

  // Leaders are grouped by team, each with stat categories (points, assists, rebounds)
  var leaders = (data.leaders || []).map(function(teamGroup) {
    var teamName = (teamGroup.team && teamGroup.team.abbreviation) || '';
    return {
      team: (teamGroup.team && teamGroup.team.displayName) || teamName,
      teamAbbrev: teamName,
      categories: (teamGroup.leaders || []).map(function(statCat) {
        var topPlayer = (statCat.leaders && statCat.leaders[0]) || {};
        return {
          stat: statCat.displayName || statCat.name || '',
          player: (topPlayer.athlete && topPlayer.athlete.displayName) || '',
          value: topPlayer.displayValue || ''
        };
      })
    };
  });

  return {
    status: (comp.status && comp.status.type && comp.status.type.description) || 'Unknown',
    detail: (comp.status && comp.status.type && comp.status.type.detail) || '',
    competitors: competitors,
    teamStats: teamStats,
    leaders: leaders,
    venue: (data.gameInfo && data.gameInfo.venue && data.gameInfo.venue.fullName) || null,
    attendance: (data.gameInfo && data.gameInfo.attendance) || null
  };
}

function processStandings(data) {
  var children = data.children || [];

  function extractTeams(entries) {
    return (entries || []).map(function(entry) {
      // Build a map keyed by type for precise stat extraction
      var byType = {};
      (entry.stats || []).forEach(function(s) {
        if (s.type) byType[s.type] = s;
      });

      // Overall record (type="total")
      var overall = byType.total ? byType.total.displayValue : 'N/A';
      // Conference record (type="vsconf")
      var confRecord = byType.vsconf ? byType.vsconf.displayValue : 'N/A';
      // Home record
      var homeRecord = byType.home ? byType.home.displayValue : 'N/A';
      // Away record
      var awayRecord = byType.road ? byType.road.displayValue : 'N/A';
      // Wins and losses (type="wins", type="losses")
      var wins = byType.wins ? byType.wins.displayValue : null;
      var losses = byType.losses ? byType.losses.displayValue : null;
      // Games behind (type="gamesbehind")
      var gb = byType.gamesbehind ? byType.gamesbehind.displayValue : '-';
      // Streak (type="streak")
      var streak = byType.streak ? byType.streak.displayValue : '-';
      // Win percentage (type="winpercent")
      var winPct = byType.winpercent ? byType.winpercent.displayValue : '-';
      // Conference win pct
      var confWinPct = byType.vsconf_leaguewinpercent ? byType.vsconf_leaguewinpercent.displayValue : (byType.leaguewinpercent ? byType.leaguewinpercent.displayValue : '-');
      // PPG and OPP PPG
      var ppg = byType.avgpointsfor ? byType.avgpointsfor.displayValue : null;
      var oppPpg = byType.avgpointsagainst ? byType.avgpointsagainst.displayValue : null;
      // Seed
      var seed = byType.playoffseed ? byType.playoffseed.displayValue : null;
      // vs AP ranked
      var vsRanked = byType.vsaprankedteams ? byType.vsaprankedteams.displayValue : null;

      return {
        team: (entry.team && entry.team.displayName) || 'Unknown',
        teamId: (entry.team && entry.team.id) || null,
        overall: overall,
        confRecord: confRecord,
        homeRecord: homeRecord,
        awayRecord: awayRecord,
        wins: wins,
        losses: losses,
        gb: gb,
        streak: streak,
        winPct: winPct,
        confWinPct: confWinPct,
        ppg: ppg,
        oppPpg: oppPpg,
        seed: seed,
        vsRanked: vsRanked
      };
    });
  }

  // Single conference request (group param) — standings at top level
  if (data.standings && data.standings.entries && children.length === 0) {
    return {
      season: (data.season && data.season.displayName) || 'Current',
      conferenceCount: 1,
      conferences: [{
        name: data.name || data.abbreviation || 'Unknown',
        id: data.id || null,
        teams: extractTeams(data.standings.entries)
      }]
    };
  }

  // All conferences — standings nested in children
  return {
    season: (data.season && data.season.displayName) || 'Current',
    conferenceCount: children.length,
    conferences: children.map(function(conf) {
      return {
        name: conf.name || conf.abbreviation || 'Unknown',
        id: conf.id || null,
        teams: extractTeams(conf.standings && conf.standings.entries)
      };
    })
  };
}

function processRoster(data) {
  var athletes = data.athletes || [];
  var team = (data.team && data.team.displayName) || (athletes[0] && athletes[0].teams && athletes[0].teams[0] && athletes[0].teams[0].displayName) || 'Unknown';
  var season = (data.season && data.season.displayName) || 'Current';

  return {
    team: team,
    season: season,
    playerCount: athletes.length,
    players: athletes.map(function(a) {
      return {
        id: a.id,
        name: a.displayName || a.fullName,
        jersey: a.jersey || null,
        position: (a.position && a.position.displayName) || null,
        positionAbbrev: (a.position && a.position.abbreviation) || null,
        height: a.displayHeight || null,
        weight: a.displayWeight || null,
        experience: (a.experience && a.experience.displayValue) || null,
        birthPlace: (a.birthPlace && a.birthPlace.city) ? (a.birthPlace.city + (a.birthPlace.state ? ', ' + a.birthPlace.state : '')) : null,
        headshot: (a.headshot && a.headshot.href) || null,
        injured: (a.injuries && a.injuries.length > 0) ? true : false,
        injuryStatus: (a.injuries && a.injuries[0] && a.injuries[0].status) || null
      };
    })
  };
}
