/** No credential or provider configuration is exposed. Activation requires reviewed adapters. */
export async function GET() {
  return Response.json(
    {
      identity: false,
      analysis: false,
      privateStorage: false,
      makeover: false,
      advisor: false,
      catalog: false,
      booking: false,
      billing: false,
      reason:
        "External connections are deferred; no private processing or commercial execution is enabled.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
