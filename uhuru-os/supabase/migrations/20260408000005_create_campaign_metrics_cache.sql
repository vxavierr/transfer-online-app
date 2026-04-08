-- Migration: 20260408000005_create_campaign_metrics_cache
-- Description: Cached campaign metrics from Meta/Google Ads (populated by background refresh)
-- Depends on: 20260408000002_create_clients
-- Note: INSERT/UPDATE done only via SECURITY DEFINER functions, not directly by users

CREATE TABLE IF NOT EXISTS public.campaign_metrics_cache (
  id              uuid          NOT NULL DEFAULT gen_random_uuid(),
  client_id       uuid          NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform        text          NOT NULL CHECK (platform IN ('meta', 'google')),
  campaign_id     text          NOT NULL,
  campaign_name   text          NOT NULL,
  campaign_status text          NOT NULL,
  date            date          NOT NULL,
  spend           numeric(12,2) NOT NULL DEFAULT 0,
  impressions     bigint        NOT NULL DEFAULT 0,
  clicks          bigint        NOT NULL DEFAULT 0,
  ctr             numeric(8,4)  NOT NULL DEFAULT 0,
  cpc             numeric(10,2) NOT NULL DEFAULT 0,
  conversions     integer       NOT NULL DEFAULT 0,
  revenue         numeric(12,2) NOT NULL DEFAULT 0,
  roas            numeric(8,4)  NOT NULL DEFAULT 0,
  fetched_at      timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT campaign_metrics_cache_pkey         PRIMARY KEY (id),
  CONSTRAINT campaign_metrics_cache_upsert_key   UNIQUE (client_id, platform, campaign_id, date)
);

COMMENT ON TABLE public.campaign_metrics_cache IS 'Cached daily campaign metrics from ad platforms. Refreshed in background — never fetched on-demand per user request. Use UPSERT on the unique constraint for updates.';
COMMENT ON COLUMN public.campaign_metrics_cache.fetched_at IS 'When this record was last synced from the ad platform API';
COMMENT ON COLUMN public.campaign_metrics_cache.roas       IS 'Return on Ad Spend = revenue / spend. Computed at fetch time.';
COMMENT ON COLUMN public.campaign_metrics_cache.ctr        IS 'Click-Through Rate = clicks / impressions';

-- Indexes for common query patterns
CREATE INDEX idx_cache_client_date     ON public.campaign_metrics_cache (client_id, date DESC);
CREATE INDEX idx_cache_client_platform ON public.campaign_metrics_cache (client_id, platform);
CREATE INDEX idx_cache_date            ON public.campaign_metrics_cache (date DESC);

-- SECURITY DEFINER function for service-layer upserts (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.upsert_campaign_metrics(
  p_client_id     uuid,
  p_platform      text,
  p_campaign_id   text,
  p_campaign_name text,
  p_campaign_status text,
  p_date          date,
  p_spend         numeric,
  p_impressions   bigint,
  p_clicks        bigint,
  p_ctr           numeric,
  p_cpc           numeric,
  p_conversions   integer,
  p_revenue       numeric,
  p_roas          numeric
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.campaign_metrics_cache (
    client_id, platform, campaign_id, campaign_name, campaign_status,
    date, spend, impressions, clicks, ctr, cpc, conversions, revenue, roas, fetched_at
  ) VALUES (
    p_client_id, p_platform, p_campaign_id, p_campaign_name, p_campaign_status,
    p_date, p_spend, p_impressions, p_clicks, p_ctr, p_cpc, p_conversions, p_revenue, p_roas, now()
  )
  ON CONFLICT (client_id, platform, campaign_id, date)
  DO UPDATE SET
    campaign_name   = EXCLUDED.campaign_name,
    campaign_status = EXCLUDED.campaign_status,
    spend           = EXCLUDED.spend,
    impressions     = EXCLUDED.impressions,
    clicks          = EXCLUDED.clicks,
    ctr             = EXCLUDED.ctr,
    cpc             = EXCLUDED.cpc,
    conversions     = EXCLUDED.conversions,
    revenue         = EXCLUDED.revenue,
    roas            = EXCLUDED.roas,
    fetched_at      = EXCLUDED.fetched_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.campaign_metrics_cache ENABLE ROW LEVEL SECURITY;
