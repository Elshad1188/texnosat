import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

Deno.serve(async (req) => {
  // This endpoint is called by Epoint servers - no CORS needed for server-to-server
  // But we allow GET for health checks
  if (req.method === "GET") {
    return new Response("OK", { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const EPOINT_PRIVATE_KEY = Deno.env.get("EPOINT_PRIVATE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!EPOINT_PRIVATE_KEY) {
      throw new Error("EPOINT_PRIVATE_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse form data from Epoint
    const formData = await req.formData();
    const data = formData.get("data") as string;
    const receivedSignature = formData.get("signature") as string;

    if (!data || !receivedSignature) {
      return new Response("Missing data or signature", { status: 400 });
    }

    // Verify signature
    const sgnString = EPOINT_PRIVATE_KEY + data + EPOINT_PRIVATE_KEY;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-1", encoder.encode(sgnString));
    const expectedSignature = base64Encode(new Uint8Array(hashBuffer));

    if (expectedSignature !== receivedSignature) {
      console.error("Signature mismatch!", { expected: expectedSignature, received: receivedSignature });
      return new Response("Invalid signature", { status: 403 });
    }

    // Decode data
    const decoded = JSON.parse(atob(data));
    console.log("Epoint callback data:", JSON.stringify(decoded));

    const { order_id, status, transaction, amount, code, message } = decoded;

    if (!order_id) {
      return new Response("Missing order_id", { status: 400 });
    }

    if (status === "success") {
      // Update order as paid
      const { error } = await supabase.from("orders").update({
        status: "confirmed",
        paid_at: new Date().toISOString(),
      }).eq("id", order_id).eq("status", "pending");

      if (error) {
        console.error("Failed to update order:", error);
      }

      // Notify buyer
      const { data: order } = await supabase.from("orders").select("buyer_id, total_amount").eq("id", order_id).single();
      if (order) {
        await supabase.from("notifications").insert({
          user_id: order.buyer_id,
          title: "Ödəniş uğurlu! ✅",
          message: `${order.total_amount} ₼ məbləğində ödənişiniz qəbul edildi.`,
          type: "payment",
          link: "/orders",
        });
      }
    } else {
      // Payment failed
      await supabase.from("orders").update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      }).eq("id", order_id).eq("status", "pending");

      const { data: order } = await supabase.from("orders").select("buyer_id").eq("id", order_id).single();
      if (order) {
        await supabase.from("notifications").insert({
          user_id: order.buyer_id,
          title: "Ödəniş uğursuz oldu ❌",
          message: message || "Kart ödənişi uğursuz oldu. Yenidən cəhd edin.",
          type: "payment",
          link: "/orders",
        });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Epoint callback error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
