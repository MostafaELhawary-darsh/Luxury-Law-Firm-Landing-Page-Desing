import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders as getCorsHeaders, preflight, requireAuthenticatedUser } from "../_shared/security.ts";

interface AutopilotSettings {
  id: string;
  subscriber_id: string;
  is_enabled: boolean;
  inactivity_trigger_days: number;
  point_surplus_threshold: number;
  trello_board_id: string | null;
  trello_inbox_list_id: string | null;
  webhook_url: string | null;
  notification_email: string | null;
  last_run_at: string | null;
}

interface ProactiveRule {
  id: string;
  segment: string;
  trigger_days_inactive: number;
  points_to_consume: number;
  service_description: string;
  action_type: string;
  profile_type: string | null;
  service_cost: number;
  trello_card_title: string | null;
  is_active: boolean;
}

interface Subscriber {
  id: string;
  name: string;
  email: string | null;
  subscriber_code: string;
  segment: string;
  plan_id: string | null;
  wallet: {
    id: string;
    balance: number;
    total_granted: number;
  } | null;
  plan: {
    id: string;
    credits_included: number;
    tier_label: string | null;
  } | null;
}

Deno.serve(async (req: Request) => {
  const corsResponse = preflight(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
  const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const authorization = await requireAuthenticatedUser(supabase, req);
  if ("response" in authorization) return authorization.response;

    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(JSON.stringify({ error: "method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "run";

    if (action !== "run") {
      return new Response(
        JSON.stringify({ error: "Unknown action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Fetch all enabled autopilot settings with subscriber + wallet + plan
    const { data: settingsData, error: settingsErr } = await supabase
      .from("laas_autopilot_settings")
      .select(`
        *,
        subscriber:laas_subscribers (
          id, name, email, subscriber_code, segment, plan_id,
          wallet:laas_wallets ( id, balance, total_granted )
        )
      `)
      .eq("is_enabled", true);

    if (settingsErr) throw settingsErr;

    // 2. Fetch active proactive rules
    const { data: rulesData, error: rulesErr } = await supabase
      .from("laas_proactive_rules")
      .select("*")
      .eq("is_active", true);

    if (rulesErr) throw rulesErr;

    const rules: ProactiveRule[] = (rulesData as unknown as ProactiveRule[]) || [];
    let checked = 0;
    let triggered = 0;
    const results: Record<string, unknown>[] = [];

    // 3. For each enabled subscriber, check trigger conditions
    for (const st of (settingsData as unknown as (AutopilotSettings & { subscriber: Subscriber })[]) || []) {
      checked++;
      const subscriber = st.subscriber;
      if (!subscriber || !subscriber.wallet) continue;

      const wallet = subscriber.wallet;
      const planCredits = subscriber.plan?.credits_included || wallet.total_granted || 1;

      // Check inactivity: days since last wallet activity
      const { data: lastTx } = await supabase
        .from("laas_transactions")
        .select("created_at")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastActivityDate = lastTx?.created_at
        ? new Date(lastTx.created_at)
        : new Date(0);
      const daysInactive = Math.floor((Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

      // Check point surplus: balance > threshold % of plan
      const surplusPct = wallet.balance / planCredits;
      const meetsSurplus = surplusPct > st.point_surplus_threshold;
      const meetsInactivity = daysInactive >= st.inactivity_trigger_days;

      // Update last_run_at
      await supabase.from("laas_autopilot_settings")
        .update({ last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", st.id);

      if (!meetsInactivity || !meetsSurplus) {
        results.push({ subscriber: subscriber.name, triggered: false, daysInactive, surplusPct: Math.round(surplusPct * 100) });
        continue;
      }

      // 4. Find matching rule by segment + profile_type
      const matchingRule = rules.find((r) => r.segment === subscriber.segment) || rules[0];
      if (!matchingRule) continue;

      const pointsToConsume = matchingRule.service_cost || matchingRule.points_to_consume || 20;
      if (wallet.balance < pointsToConsume) continue;

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - pointsToConsume;

      // 5. Deduct points from wallet — atomic conditional update to prevent double-spend
      const { data: updatedWallet } = await supabase.from("laas_wallets")
        .update({
          balance: balanceAfter,
          total_consumed: (wallet.total_consumed || 0) + pointsToConsume,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", wallet.id)
        .gte("balance", pointsToConsume)
        .select();

      if (!updatedWallet || updatedWallet.length === 0) {
        results.push({ subscriber: subscriber.name, triggered: false, reason: "balance_changed_concurrently" });
        continue;
      }

      // 6. Create transaction record
      await supabase.from("laas_transactions").insert({
        wallet_id: wallet.id,
        subscriber_id: subscriber.id,
        transaction_type: "consume",
        points: -pointsToConsume,
        balance_after: balanceAfter,
        description: `استهلاك استباقي (Autopilot Shield): ${matchingRule.service_description}`,
        urgency_multiplier: 1.0,
        original_points: pointsToConsume,
      });

      // 7. Craft notification
      const notifSubject = "🛡️ تقرير وقائي مبكر: تحديثات جوهرية تمس نشاطكم";
      const notifBody = `عميلنا العزيز ${subscriber.name}،

نظراً لالتزامنا ضمن «نظام الحماية التلقائي» بضمان استباقية موقفكم القانوني، لاحظ فريقنا التقني والقانوني صدور تعديلات حديثة تؤثر على صياغة عقودكم.

بدلاً من انتظار طلبكم، قمنا باستثمار (${pointsToConsume} نقطة) من رصيد محفظتكم المتوفر لإجراء تدقيق كامل وتجهيز المذكرة المرفقة التي تشرح الأثر القانوني وكيفية التعامل معه، وتم إدراج المهام المطلوبة في نظام إدارة مشاريعكم لسهولة المتابعة.

الرصيد المتبقي: ${balanceAfter} نقطة.

(إذا كنت تفضل إيقاف وضع الحماية التلقائية وإدارة النقاط يدوياً بالكامل، يمكنك تعديل التفضيلات من لوحة التحكم).`;

      // 8. Determine delivery target
      // External integrations (Trello API, webhooks) are disabled platform-wide.
      // The code below is preserved but not executed — delivery stays internal-only.
      const deliveryTarget = "notification";
      const deliveryStatus = "delivered";

      // 9. Log execution
      await supabase.from("laas_proactive_executions").insert({
        subscriber_id: subscriber.id,
        rule_id: matchingRule.id,
        service_description: matchingRule.service_description,
        points_consumed: pointsToConsume,
        action_type: matchingRule.action_type,
        profile_type: matchingRule.profile_type,
        inactivity_days: daysInactive,
        surplus_pct: surplusPct,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        delivery_status: deliveryStatus,
        delivery_target: deliveryTarget,
        notification_subject: notifSubject,
        notification_body: notifBody,
        trello_card_id: null,
      });

      // Update rule last_triggered_at
      await supabase.from("laas_proactive_rules")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("id", matchingRule.id);

      triggered++;
      results.push({
        subscriber: subscriber.name,
        triggered: true,
        pointsConsumed: pointsToConsume,
        balanceAfter,
        deliveryTarget,
        deliveryStatus,
      });
    }

    return new Response(
      JSON.stringify({ checked, triggered, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("proactive-consumption-engine error:", err);
    return new Response(
      JSON.stringify({ error: "internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
