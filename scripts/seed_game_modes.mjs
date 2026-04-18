import https from 'https';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjeXpza2J2Y3JxYnprdXppaHRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzMzk4OSwiZXhwIjoyMDkxNTA5OTg5fQ.IOmtjr-HbsmIlnzuFXRtBPbtMj5DeBrSdlCy4hD92lA';

const rows = [
  // FPS — Valorant
  { game_slug:'valorant', mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'⚡', team_size:1, min_stake:5,  max_stake:500,  sort_order:1 },
  { game_slug:'valorant', mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:1000, sort_order:2 },
  { game_slug:'valorant', mode:'2v2',        label:'2v2 Equipos',        icon:'👥', team_size:2, min_stake:5,  max_stake:300,  sort_order:3 },
  // CS2
  { game_slug:'cs2', mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'💣', team_size:1, min_stake:5,  max_stake:500,  sort_order:1 },
  { game_slug:'cs2', mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:1000, sort_order:2 },
  { game_slug:'cs2', mode:'2v2',        label:'2v2 Equipos',        icon:'👥', team_size:2, min_stake:5,  max_stake:300,  sort_order:3 },
  // COD
  { game_slug:'cod-warzone', mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🪖', team_size:1, min_stake:5,  max_stake:300, sort_order:1 },
  { game_slug:'cod-warzone', mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:500, sort_order:2 },
  { game_slug:'cod-mw3',     mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🔫', team_size:1, min_stake:5,  max_stake:300, sort_order:1 },
  { game_slug:'cod-mw3',     mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:500, sort_order:2 },
  // Apex
  { game_slug:'apex-legends', mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🔵', team_size:1, min_stake:5,  max_stake:300, sort_order:1 },
  { game_slug:'apex-legends', mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:500, sort_order:2 },
  // OW2
  { game_slug:'overwatch-2', mode:'1v1_ranked', label:'Duelo 1v1 Custom', icon:'🦸', team_size:1, min_stake:5, max_stake:200, sort_order:1 },
  { game_slug:'overwatch-2', mode:'2v2',        label:'2v2 Equipos',      icon:'👥', team_size:2, min_stake:5, max_stake:200, sort_order:2 },
  // R6
  { game_slug:'r6-siege', mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🛡️', team_size:1, min_stake:5,  max_stake:300, sort_order:1 },
  { game_slug:'r6-siege', mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:500, sort_order:2 },
  { game_slug:'r6-siege', mode:'2v2',        label:'2v2 Equipos',        icon:'👥', team_size:2, min_stake:5,  max_stake:200, sort_order:3 },
  // BF / Halo
  { game_slug:'battlefield-2042', mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'💥', team_size:1, min_stake:5, max_stake:200, sort_order:1 },
  { game_slug:'halo-infinite',    mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🪐', team_size:1, min_stake:5,  max_stake:300, sort_order:1 },
  { game_slug:'halo-infinite',    mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:500, sort_order:2 },
  { game_slug:'halo-infinite',    mode:'2v2',        label:'2v2 Equipos',        icon:'👥', team_size:2, min_stake:5,  max_stake:200, sort_order:3 },
  // MOBA
  { game_slug:'league-of-legends',  mode:'1v1_ranked', label:'Mid Lane 1v1',      icon:'⚔️', team_size:1, min_stake:5, max_stake:300, sort_order:1 },
  { game_slug:'league-of-legends',  mode:'2v2',        label:'2v2 Botlane',        icon:'👥', team_size:2, min_stake:5, max_stake:200, sort_order:2 },
  { game_slug:'dota-2',             mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🌀', team_size:1, min_stake:5, max_stake:300, sort_order:1 },
  { game_slug:'dota-2',             mode:'2v2',        label:'2v2 Equipos',        icon:'👥', team_size:2, min_stake:5, max_stake:200, sort_order:2 },
  { game_slug:'wild-rift',          mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'📱', team_size:1, min_stake:5, max_stake:100, sort_order:1 },
  { game_slug:'wild-rift',          mode:'2v2',        label:'2v2 Botlane',        icon:'👥', team_size:2, min_stake:5, max_stake:100, sort_order:2 },
  { game_slug:'mobile-legends',     mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🗡️', team_size:1, min_stake:5, max_stake:100, sort_order:1 },
  { game_slug:'mobile-legends',     mode:'2v2',        label:'2v2 Equipos',        icon:'👥', team_size:2, min_stake:5, max_stake:100, sort_order:2 },
  { game_slug:'heroes-of-the-storm',mode:'2v2',        label:'2v2 Equipos',        icon:'🌟', team_size:2, min_stake:5, max_stake:150, sort_order:1 },
  // Sports
  { game_slug:'ea-sports-fc-25', mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'⚽', team_size:1, min_stake:5,  max_stake:500,  sort_order:1 },
  { game_slug:'ea-sports-fc-25', mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:1000, sort_order:2 },
  { game_slug:'ea-sports-fc-24', mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'⚽', team_size:1, min_stake:5,  max_stake:300, sort_order:1 },
  { game_slug:'ea-sports-fc-24', mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:500, sort_order:2 },
  { game_slug:'nba-2k25',        mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🏀', team_size:1, min_stake:5,  max_stake:500,  sort_order:1 },
  { game_slug:'nba-2k25',        mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:1000, sort_order:2 },
  { game_slug:'rocket-league',   mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🚀', team_size:1, min_stake:5,  max_stake:300, sort_order:1 },
  { game_slug:'rocket-league',   mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:500, sort_order:2 },
  { game_slug:'rocket-league',   mode:'2v2',        label:'2v2 Equipos',        icon:'👥', team_size:2, min_stake:5,  max_stake:200, sort_order:3 },
  { game_slug:'efootball-2025',  mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🥅', team_size:1, min_stake:5,  max_stake:300, sort_order:1 },
  { game_slug:'efootball-2025',  mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:500, sort_order:2 },
  { game_slug:'nhl-25',          mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🏒', team_size:1, min_stake:5,  max_stake:300, sort_order:1 },
  { game_slug:'nhl-25',          mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:500, sort_order:2 },
  { game_slug:'madden-25',       mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🏈', team_size:1, min_stake:5,  max_stake:300, sort_order:1 },
  { game_slug:'madden-25',       mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:500, sort_order:2 },
  // Battle Royale
  { game_slug:'fortnite',       mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🏗️', team_size:1, min_stake:5,  max_stake:300, sort_order:1 },
  { game_slug:'fortnite',       mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:500, sort_order:2 },
  { game_slug:'pubg',           mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🪂', team_size:1, min_stake:5,  max_stake:200, sort_order:1 },
  { game_slug:'free-fire',      mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🔥', team_size:1, min_stake:5,  max_stake:200, sort_order:1 },
  { game_slug:'free-fire',      mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:300, sort_order:2 },
  { game_slug:'pubg-mobile',    mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'📲', team_size:1, min_stake:5,  max_stake:200, sort_order:1 },
  { game_slug:'warcraft-rumble',mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'⚔️', team_size:1, min_stake:5,  max_stake:100, sort_order:1 },
  // Fighting
  { game_slug:'street-fighter-6', mode:'1v1_ranked', label:'Clasificatoria FT3', icon:'👊', team_size:1, min_stake:5,  max_stake:500,  sort_order:1 },
  { game_slug:'street-fighter-6', mode:'1v1_cash',   label:'Cash Game FT5',      icon:'💰', team_size:1, min_stake:10, max_stake:1000, sort_order:2 },
  { game_slug:'tekken-8',         mode:'1v1_ranked', label:'Clasificatoria FT3', icon:'🥊', team_size:1, min_stake:5,  max_stake:500,  sort_order:1 },
  { game_slug:'tekken-8',         mode:'1v1_cash',   label:'Cash Game FT5',      icon:'💰', team_size:1, min_stake:10, max_stake:1000, sort_order:2 },
  { game_slug:'mortal-kombat-1',  mode:'1v1_ranked', label:'Clasificatoria FT3', icon:'🩸', team_size:1, min_stake:5,  max_stake:500,  sort_order:1 },
  { game_slug:'mortal-kombat-1',  mode:'1v1_cash',   label:'Cash Game FT5',      icon:'💰', team_size:1, min_stake:10, max_stake:1000, sort_order:2 },
  { game_slug:'smash-ultimate',   mode:'1v1_ranked', label:'Clasificatoria FT3', icon:'💫', team_size:1, min_stake:5,  max_stake:300, sort_order:1 },
  { game_slug:'smash-ultimate',   mode:'1v1_cash',   label:'Cash Game FT5',      icon:'💰', team_size:1, min_stake:10, max_stake:500, sort_order:2 },
  // RTS
  { game_slug:'starcraft-2', mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🛸', team_size:1, min_stake:5,  max_stake:500,  sort_order:1 },
  { game_slug:'starcraft-2', mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:1000, sort_order:2 },
  { game_slug:'starcraft-2', mode:'2v2',        label:'2v2 Equipo',         icon:'👥', team_size:2, min_stake:5,  max_stake:300,  sort_order:3 },
  { game_slug:'aoe-4',       mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🏰', team_size:1, min_stake:5,  max_stake:300, sort_order:1 },
  { game_slug:'aoe-4',       mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:500, sort_order:2 },
  { game_slug:'aoe-4',       mode:'2v2',        label:'2v2 Equipo',         icon:'👥', team_size:2, min_stake:5,  max_stake:200, sort_order:3 },
  // Other
  { game_slug:'clash-royale', mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'👑', team_size:1, min_stake:5,  max_stake:200, sort_order:1 },
  { game_slug:'clash-royale', mode:'1v1_cash',   label:'Cash Game 1v1',      icon:'💰', team_size:1, min_stake:10, max_stake:300, sort_order:2 },
  { game_slug:'brawl-stars',  mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'⭐', team_size:1, min_stake:5,  max_stake:100, sort_order:1 },
  { game_slug:'brawl-stars',  mode:'2v2',        label:'2v2 Duos',           icon:'👥', team_size:2, min_stake:5,  max_stake:100, sort_order:2 },
  { game_slug:'minecraft',    mode:'1v1_ranked', label:'Clasificatoria 1v1', icon:'🧱', team_size:1, min_stake:5,  max_stake:100, sort_order:1 },
];

const body = JSON.stringify(rows);

const req = https.request({
  hostname: 'bcyzskbvcrqbzkuzihtn.supabase.co',
  path: '/rest/v1/game_modes',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'apikey': SERVICE_KEY,
    'Authorization': 'Bearer ' + SERVICE_KEY,
    'Prefer': 'resolution=ignore-duplicates',
  },
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    if (res.statusCode === 201 || res.statusCode === 200) {
      console.log(`✅ ${rows.length} modos insertados (status ${res.statusCode})`);
    } else {
      console.log(`❌ Status ${res.statusCode}:`, d.slice(0, 300));
    }
  });
});
req.on('error', e => console.error('Error:', e.message));
req.write(body);
req.end();
