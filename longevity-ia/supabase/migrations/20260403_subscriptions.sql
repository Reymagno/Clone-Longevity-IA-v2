-- ============================================================================
-- SUBSCRIPTIONS — Sistema de suscripciones con Stripe
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                    TEXT NOT NULL CHECK (role IN ('paciente', 'medico', 'clinica')),

  -- Stripe references
  stripe_customer_id      TEXT NOT NULL,
  stripe_subscription_id  TEXT UNIQUE,
  stripe_price_id         TEXT,

  -- Plan details
  plan_tier               TEXT NOT NULL,
  seat_limit              INTEGER NOT NULL DEFAULT 1,

  -- Status lifecycle (synced from Stripe webhooks)
  status                  TEXT NOT NULL DEFAULT 'trialing'
                          CHECK (status IN ('trialing','active','past_due','canceled','unpaid','paused')),
  trial_ends_at           TIMESTAMPTZ,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN DEFAULT FALSE,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_subscription UNIQUE(user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can write (webhooks use admin client)
CREATE POLICY "Service role manages subscriptions"
  ON subscriptions FOR ALL
  USING (false);

-- Indexes for webhook lookups
CREATE INDEX idx_sub_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_sub_stripe_sub_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_sub_user_id ON subscriptions(user_id);
CREATE INDEX idx_sub_status ON subscriptions(status);

-- ============================================================================
-- SUBSCRIPTION_EVENTS — Audit trail + idempotency for webhooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_event_id   TEXT UNIQUE NOT NULL,
  event_type        TEXT NOT NULL,
  payload           JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON subscription_events FOR ALL USING (false);

CREATE INDEX idx_sub_events_stripe ON subscription_events(stripe_event_id);
CREATE INDEX idx_sub_events_sub ON subscription_events(subscription_id);
CREATE INDEX idx_sub_events_type ON subscription_events(event_type, created_at DESC);
