-- Test Economy Stats RPC
-- Returns aggregate test balance and test bet activity across all mini games

CREATE OR REPLACE FUNCTION public.get_test_economy_stats()
RETURNS TABLE (
  total_test_balance        NUMERIC,
  users_with_test_balance   BIGINT,
  crash_bets_total          BIGINT,
  crash_bets_wagered        NUMERIC,
  crash_bets_won            BIGINT,
  crash_bets_lost           BIGINT,
  crash_bets_active         BIGINT,
  crash_profit_house        NUMERIC,
  dice_rolls_total          BIGINT,
  dice_rolls_wagered        NUMERIC,
  dice_rolls_won            BIGINT,
  dice_rolls_lost           BIGINT,
  dice_profit_house         NUMERIC,
  external_bets_total       BIGINT,
  external_bets_wagered     NUMERIC,
  tournament_bets_total     BIGINT,
  tournament_bets_wagered   NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Wallets
    COALESCE((SELECT SUM(test_balance) FROM wallets WHERE test_balance > 0), 0)                                AS total_test_balance,
    COALESCE((SELECT COUNT(*) FROM wallets WHERE test_balance > 0), 0)                                        AS users_with_test_balance,

    -- Crash bets
    COALESCE((SELECT COUNT(*) FROM crash_bets WHERE is_test = true), 0)                                       AS crash_bets_total,
    COALESCE((SELECT SUM(amount) FROM crash_bets WHERE is_test = true), 0)                                    AS crash_bets_wagered,
    COALESCE((SELECT COUNT(*) FROM crash_bets WHERE is_test = true AND status = 'won'), 0)                    AS crash_bets_won,
    COALESCE((SELECT COUNT(*) FROM crash_bets WHERE is_test = true AND status = 'lost'), 0)                   AS crash_bets_lost,
    COALESCE((SELECT COUNT(*) FROM crash_bets WHERE is_test = true AND status = 'active'), 0)                 AS crash_bets_active,
    COALESCE((SELECT SUM(amount) - SUM(COALESCE(payout, 0)) FROM crash_bets WHERE is_test = true AND status IN ('won','lost')), 0) AS crash_profit_house,

    -- Dice rolls
    COALESCE((SELECT COUNT(*) FROM dice_rolls WHERE is_test = true), 0)                                       AS dice_rolls_total,
    COALESCE((SELECT SUM(amount) FROM dice_rolls WHERE is_test = true), 0)                                    AS dice_rolls_wagered,
    COALESCE((SELECT COUNT(*) FROM dice_rolls WHERE is_test = true AND won = true), 0)                        AS dice_rolls_won,
    COALESCE((SELECT COUNT(*) FROM dice_rolls WHERE is_test = true AND won = false), 0)                       AS dice_rolls_lost,
    COALESCE((SELECT SUM(amount) - SUM(payout) FROM dice_rolls WHERE is_test = true), 0)                     AS dice_profit_house,

    -- External bets (sports)
    COALESCE((SELECT COUNT(*) FROM external_bets WHERE is_test = true), 0)                                    AS external_bets_total,
    COALESCE((SELECT SUM(amount) FROM external_bets WHERE is_test = true), 0)                                 AS external_bets_wagered,

    -- Tournament bets
    COALESCE((SELECT COUNT(*) FROM tournament_bets WHERE is_test = true), 0)                                  AS tournament_bets_total,
    COALESCE((SELECT SUM(amount) FROM tournament_bets WHERE is_test = true), 0)                               AS tournament_bets_wagered;
$$;

GRANT EXECUTE ON FUNCTION public.get_test_economy_stats() TO authenticated;
