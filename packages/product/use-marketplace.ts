import { useEffect, useRef, useState } from "react";
import type {
  CompanionConnection,
  CartItem,
  CheckoutQuote,
  OrderReceipt,
  VerifiedOffer,
} from "./companion";
import { eligibleOffer, validQuote, validReceipt } from "./companion";
import type { RecommendationMatch, RequirementDraft } from "./catalog";
export function useMarketplace(
  connection: CompanionConnection | undefined,
  destination: { country: string; city: string; currency: string },
) {
  const [items, setItems] = useState<CartItem[]>([]),
    [review, setReview] = useState<VerifiedOffer | null>(null),
    [quote, setQuote] = useState<CheckoutQuote | null>(null),
    [receipt, setReceipt] = useState<OrderReceipt | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [, setClock] = useState(0);
  const scope = useRef(connection);
  const ticket = useRef(0),
    abort = useRef<AbortController | null>(null),
    previousDestination = useRef(
      JSON.stringify([
        destination.country,
        destination.city,
        destination.currency,
      ]),
    );
  const destinationKey = JSON.stringify([
    destination.country,
    destination.city,
    destination.currency,
  ]);
  const currentScope =
    scope.current === connection &&
    previousDestination.current === destinationKey;
  function cancel() {
    ticket.current++;
    abort.current?.abort();
    setBusy(false);
  }
  useEffect(() => {
    scope.current = connection;
    cancel();
    setItems([]);
    setReview(null);
    setQuote(null);
    setReceipt(null);
    setMessage("");
    return () => {
      ticket.current++;
      abort.current?.abort();
    };
  }, [connection]);
  useEffect(() => {
    const key = destinationKey;
    if (key !== previousDestination.current) {
      previousDestination.current = key;
      cancel();
      setItems([]);
      setReview(null);
      setQuote(null);
      setReceipt(null);
      setMessage(
        "Destination changed. Revalidate offers for your new delivery location.",
      );
    }
  }, [destination.country, destination.city, destination.currency]);
  async function request(
    kind: "offer" | "quote" | "order",
    match?: RecommendationMatch,
    requirement?: RequirementDraft,
  ) {
    if (!connection || busy) return;
    const controller = new AbortController();
    abort.current = controller;
    const id = ++ticket.current;
    setBusy(true);
    setMessage("");
    try {
      if (kind === "offer") {
        if (!connection.offer || !match || !requirement) throw Error();
        const result = await connection.offer(
          match.listing_id,
          requirement,
          controller.signal,
        );
        if (id !== ticket.current) return;
        if (
          result.listing_id !== match.listing_id ||
          !eligibleOffer(result, destination.country)
        )
          throw Error();
        setReview(result);
      } else if (kind === "quote") {
        if (
          !connection.quote ||
          !items.length ||
          items.some(
            (i) =>
              !eligibleOffer(i.offer, destination.country) ||
              i.quantity > i.offer.quantity_available,
          )
        )
          throw Error();
        const result = await connection.quote(
          items.map((i) => ({
            listingId: i.offer.listing_id,
            variantId: i.offer.variant_id,
            quantity: i.quantity,
          })),
          {
            country: destination.country,
            city: destination.city,
            currency: destination.currency,
          },
          controller.signal,
        );
        if (id !== ticket.current) return;
        if (!validQuote(result, connection, items, destination.currency))
          throw Error();
        setQuote(result);
        setReceipt(null);
      } else {
        if (!connection.order || !quote) throw Error();
        const result = await connection.order(quote.id, controller.signal);
        if (id !== ticket.current) return;
        if (!validReceipt(result, quote, connection.subject)) throw Error();
        setReceipt(result);
      }
    } catch {
      if (id === ticket.current)
        setMessage(
          "The service could not verify this operation. No purchase or booking is confirmed. Retry after checking the connection.",
        );
    } finally {
      if (id === ticket.current) setBusy(false);
    }
  }
  function add() {
    if (!review || !eligibleOffer(review, destination.country)) return;
    cancel();
    setItems((s) =>
      s.some(
        (i) =>
          i.offer.listing_id === review.listing_id &&
          i.offer.variant_id === review.variant_id,
      )
        ? s
        : [...s, { offer: review, quantity: 1 }],
    );
    setQuote(null);
    setReceipt(null);
    setReview(null);
  }
  function remove(id: string, variant: string) {
    cancel();
    setItems((s) =>
      s.filter(
        (i) => i.offer.listing_id !== id || i.offer.variant_id !== variant,
      ),
    );
    setQuote(null);
    setReceipt(null);
  }
  useEffect(() => {
    if (!quote) return;
    const timer = setTimeout(
      () => setClock((n) => n + 1),
      Math.max(
        0,
        Math.min(2147483647, Date.parse(quote.expiresAt) - Date.now()),
      ),
    );
    return () => clearTimeout(timer);
  }, [quote]);
  return {
    items: currentScope ? items : [],
    review: currentScope ? review : null,
    quote:
      currentScope && quote && Date.parse(quote.expiresAt) > Date.now()
        ? quote
        : null,
    receipt: currentScope ? receipt : null,
    canCheckOrder: currentScope && !!quote,
    busy,
    message,
    request,
    add,
    remove,
    cancel,
  };
}
export type MarketplaceState = ReturnType<typeof useMarketplace>;
