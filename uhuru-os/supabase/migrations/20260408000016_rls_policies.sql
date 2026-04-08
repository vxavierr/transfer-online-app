-- Migration: 20260408000016_rls_policies
-- Description: Row Level Security policies for all tables
-- Depends on: 20260408000001 through 20260408000015
-- Model: Single-tenant, role-based (owner/member). auth.uid() = current user.

-- ============================================================
-- HELPER FUNCTION: get_user_role()
-- ============================================================
-- Returns the role of the currently authenticated user.
-- STABLE: result cached within a single statement for performance.
-- SECURITY DEFINER: reads profiles table bypassing RLS on profiles itself.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- TABLE: profiles
-- ============================================================
-- SELECT: own row always; owner sees all profiles
-- INSERT: handled by trigger (handle_new_user), not by users
-- UPDATE: own row only
-- DELETE: not allowed

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR public.get_user_role() = 'owner'
  );

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- TABLE: clients
-- ============================================================
-- Owner: full CRUD on all clients
-- Member: SELECT if created_by = uid OR has an assigned task on this client
--         INSERT: any authenticated user
--         UPDATE: only if created_by = uid
--         DELETE: owner only

CREATE POLICY clients_select ON public.clients
  FOR SELECT USING (
    public.get_user_role() = 'owner'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.client_id = clients.id
        AND tasks.assigned_to = auth.uid()
    )
  );

CREATE POLICY clients_insert ON public.clients
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY clients_update ON public.clients
  FOR UPDATE USING (
    public.get_user_role() = 'owner'
    OR created_by = auth.uid()
  );

CREATE POLICY clients_delete ON public.clients
  FOR DELETE USING (public.get_user_role() = 'owner');

-- ============================================================
-- TABLE: client_documents
-- ============================================================
-- Same access as parent client for SELECT
-- INSERT: authenticated with client access
-- DELETE: owner OR uploaded_by = uid

CREATE POLICY client_documents_select ON public.client_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_documents.client_id
        AND (
          public.get_user_role() = 'owner'
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.client_id = c.id AND t.assigned_to = auth.uid()
          )
        )
    )
  );

CREATE POLICY client_documents_insert ON public.client_documents
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_documents.client_id
        AND (
          public.get_user_role() = 'owner'
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.client_id = c.id AND t.assigned_to = auth.uid()
          )
        )
    )
  );

CREATE POLICY client_documents_delete ON public.client_documents
  FOR DELETE USING (
    public.get_user_role() = 'owner'
    OR uploaded_by = auth.uid()
  );

-- ============================================================
-- TABLE: ad_platform_tokens
-- ============================================================
-- Owner only: all operations (tokens are sensitive)

CREATE POLICY ad_platform_tokens_owner ON public.ad_platform_tokens
  FOR ALL USING (public.get_user_role() = 'owner');

-- ============================================================
-- TABLE: campaign_metrics_cache
-- ============================================================
-- SELECT: same as parent client
-- INSERT/UPDATE/DELETE: service only (via upsert_campaign_metrics SECURITY DEFINER)
-- No user-level INSERT/UPDATE/DELETE policies — service function bypasses RLS

CREATE POLICY campaign_metrics_cache_select ON public.campaign_metrics_cache
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = campaign_metrics_cache.client_id
        AND (
          public.get_user_role() = 'owner'
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.client_id = c.id AND t.assigned_to = auth.uid()
          )
        )
    )
  );

-- ============================================================
-- TABLE: alert_rules
-- ============================================================
-- SELECT/INSERT: same as parent client
-- UPDATE/DELETE: creator OR owner

CREATE POLICY alert_rules_select ON public.alert_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = alert_rules.client_id
        AND (
          public.get_user_role() = 'owner'
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.client_id = c.id AND t.assigned_to = auth.uid()
          )
        )
    )
  );

CREATE POLICY alert_rules_insert ON public.alert_rules
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = alert_rules.client_id
        AND (
          public.get_user_role() = 'owner'
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.client_id = c.id AND t.assigned_to = auth.uid()
          )
        )
    )
  );

CREATE POLICY alert_rules_update ON public.alert_rules
  FOR UPDATE USING (
    created_by = auth.uid()
    OR public.get_user_role() = 'owner'
  );

CREATE POLICY alert_rules_delete ON public.alert_rules
  FOR DELETE USING (
    created_by = auth.uid()
    OR public.get_user_role() = 'owner'
  );

-- ============================================================
-- TABLE: alerts
-- ============================================================
-- SELECT: same as parent alert_rule (resolved via client)
-- INSERT: service only (via insert_alert SECURITY DEFINER)
-- UPDATE: authenticated (to acknowledge)
-- DELETE: owner only

CREATE POLICY alerts_select ON public.alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.alert_rules ar
      JOIN public.clients c ON c.id = ar.client_id
      WHERE ar.id = alerts.alert_rule_id
        AND (
          public.get_user_role() = 'owner'
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.client_id = c.id AND t.assigned_to = auth.uid()
          )
        )
    )
  );

CREATE POLICY alerts_update ON public.alerts
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (
    -- Only allow setting acknowledged_at and acknowledged_by
    acknowledged_at IS NOT NULL
    AND acknowledged_by = auth.uid()
  );

CREATE POLICY alerts_delete ON public.alerts
  FOR DELETE USING (public.get_user_role() = 'owner');

-- ============================================================
-- TABLE: tasks
-- ============================================================
-- Owner: all tasks
-- Member: created_by = uid OR assigned_to = uid

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT USING (
    public.get_user_role() = 'owner'
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
  );

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE USING (
    public.get_user_role() = 'owner'
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
  );

CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE USING (
    public.get_user_role() = 'owner'
    OR created_by = auth.uid()
  );

-- ============================================================
-- TABLE: task_comments
-- ============================================================
-- SELECT: same as parent task
-- INSERT: authenticated with task access
-- UPDATE: author only
-- DELETE: author OR owner

CREATE POLICY task_comments_select ON public.task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_comments.task_id
        AND (
          public.get_user_role() = 'owner'
          OR t.created_by = auth.uid()
          OR t.assigned_to = auth.uid()
        )
    )
  );

CREATE POLICY task_comments_insert ON public.task_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_comments.task_id
        AND (
          public.get_user_role() = 'owner'
          OR t.created_by = auth.uid()
          OR t.assigned_to = auth.uid()
        )
    )
  );

CREATE POLICY task_comments_update ON public.task_comments
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY task_comments_delete ON public.task_comments
  FOR DELETE USING (
    author_id = auth.uid()
    OR public.get_user_role() = 'owner'
  );

-- ============================================================
-- TABLE: automation_triggers
-- ============================================================
-- Owner: full CRUD
-- Member: SELECT only

CREATE POLICY automation_triggers_select ON public.automation_triggers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY automation_triggers_insert ON public.automation_triggers
  FOR INSERT WITH CHECK (public.get_user_role() = 'owner');

CREATE POLICY automation_triggers_update ON public.automation_triggers
  FOR UPDATE USING (public.get_user_role() = 'owner');

CREATE POLICY automation_triggers_delete ON public.automation_triggers
  FOR DELETE USING (public.get_user_role() = 'owner');

-- ============================================================
-- TABLE: automation_trigger_logs
-- ============================================================
-- SELECT: same as parent trigger (all authenticated)
-- INSERT: service only (application layer, no user policy)
-- UPDATE/DELETE: owner only (DELETE) / no UPDATE policy (append-only)

CREATE POLICY automation_trigger_logs_select ON public.automation_trigger_logs
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.automation_triggers at_
      WHERE at_.id = automation_trigger_logs.trigger_id
    )
  );

CREATE POLICY automation_trigger_logs_delete ON public.automation_trigger_logs
  FOR DELETE USING (public.get_user_role() = 'owner');

-- ============================================================
-- TABLE: api_connectors
-- ============================================================
-- Owner: full CRUD
-- Member: SELECT if is_active = true

CREATE POLICY api_connectors_select ON public.api_connectors
  FOR SELECT USING (
    public.get_user_role() = 'owner'
    OR (auth.uid() IS NOT NULL AND is_active = true)
  );

CREATE POLICY api_connectors_insert ON public.api_connectors
  FOR INSERT WITH CHECK (public.get_user_role() = 'owner');

CREATE POLICY api_connectors_update ON public.api_connectors
  FOR UPDATE USING (public.get_user_role() = 'owner');

CREATE POLICY api_connectors_delete ON public.api_connectors
  FOR DELETE USING (public.get_user_role() = 'owner');

-- ============================================================
-- TABLE: import_jobs
-- ============================================================
-- SELECT: creator OR owner
-- INSERT: authenticated
-- UPDATE: creator only (status field)
-- DELETE: owner only

CREATE POLICY import_jobs_select ON public.import_jobs
  FOR SELECT USING (
    public.get_user_role() = 'owner'
    OR created_by = auth.uid()
  );

CREATE POLICY import_jobs_insert ON public.import_jobs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY import_jobs_update ON public.import_jobs
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY import_jobs_delete ON public.import_jobs
  FOR DELETE USING (public.get_user_role() = 'owner');

-- ============================================================
-- TABLE: agent_sessions
-- ============================================================
-- Own sessions only (all operations)

CREATE POLICY agent_sessions_all ON public.agent_sessions
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- TABLE: agent_audit_logs
-- ============================================================
-- SELECT: owner sees all; member sees own logs
-- INSERT: service only (via insert_agent_audit_log SECURITY DEFINER)
-- UPDATE: no UPDATE policy (append-only)
-- DELETE: no DELETE policy (retention enforced by cleanup function)

CREATE POLICY agent_audit_logs_select ON public.agent_audit_logs
  FOR SELECT USING (
    public.get_user_role() = 'owner'
    OR user_id = auth.uid()
  );
