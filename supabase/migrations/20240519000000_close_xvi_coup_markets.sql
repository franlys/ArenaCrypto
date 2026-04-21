-- Close all open bet markets for XVI COUP (tournament finished, markets were left open)
UPDATE public.bet_markets
SET status = 'closed'
WHERE pt_tournament_id = 'c6a952a4-6162-4dc5-a882-6617346d2091'
  AND status = 'open';
