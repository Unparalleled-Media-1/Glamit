"use client";
import { useState } from "react";
import type { Page } from "../../../packages/product/platform";
import type { CompanionConnection } from "../../../packages/product/companion";
import type { ReturnTypeDestination } from "./DestinationStylistTypes";
export default function DestinationStylist({
  trip,
  connection,
  go,
}: {
  trip: ReturnTypeDestination;
  connection?: CompanionConnection;
  go: (p: Page) => void;
}) {
  const [item, setItem] = useState("");
  const p = trip.plan,
    w = trip.weather;
  return (
    <div className="destination-stylist">
      <header className="page-heading">
        <p className="eyebrow">YOUR DESTINATION & WEATHER STYLIST</p>
        <h1>Away, in your own style.</h1>
        <p>One journey. Your dates, your plans, your expression.</p>
      </header>
      <nav className="companion-link-row" aria-label="Styling experiences">
        <button className="button secondary" onClick={() => go("advisor")}>
          AI Personal Stylist
        </button>
        <button className="button secondary" onClick={() => go("event")}>
          Event Stylist
        </button>
      </nav>
      <div className="destination-board">
        <section className="panel">
          <h2>The place sets the scene.</h2>
          <label>
            Destination city or region
            <input
              maxLength={160}
              value={p.destination}
              onChange={(e) => trip.edit("destination", e.target.value)}
            />
          </label>
          <label>
            Destination country code
            <input
              maxLength={2}
              value={p.country}
              onChange={(e) =>
                trip.edit("country", e.target.value.toUpperCase())
              }
              placeholder="ZA"
            />
          </label>
          <div className="form-grid">
            <label>
              Arrival date
              <input
                type="date"
                value={p.start}
                onChange={(e) => trip.edit("start", e.target.value)}
              />
            </label>
            <label>
              Departure date
              <input
                type="date"
                value={p.end}
                onChange={(e) => trip.edit("end", e.target.value)}
              />
            </label>
          </div>
          <label>
            Activities and occasions
            <textarea
              value={p.activities}
              maxLength={1000}
              onChange={(e) => trip.edit("activities", e.target.value)}
              placeholder="Dinner by the sea, a city walk, a wedding…"
            />
          </label>
          <label>
            Comfort, fabric and coverage preferences
            <textarea
              value={p.preferences}
              maxLength={1000}
              onChange={(e) => trip.edit("preferences", e.target.value)}
            />
          </label>
          <label>
            Where should I source my look?
            <select
              value={p.sourcing}
              onChange={(e) =>
                trip.edit("sourcing", e.target.value as typeof p.sourcing)
              }
            >
              <option value="before-departure">Buy before departure</option>
              <option value="at-destination">
                Find products at my destination
              </option>
            </select>
          </label>
          <button className="button" disabled={trip.busy} onClick={trip.check}>
            {trip.busy ? "Checking weather…" : "Check weather availability"}
          </button>
          {trip.busy && (
            <button className="text-button" onClick={trip.cancel}>
              Cancel weather request
            </button>
          )}
          {trip.message && <p role="status">{trip.message}</p>}
          <p className="fine">
            Trip notes stay in this session. No precise device location or
            sensitive identity is inferred.
          </p>
        </section>
        <section>
          <div className="panel">
            <p className="eyebrow">WEATHER EVIDENCE</p>
            <h2>
              {w
                ? "Plan around the actual outlook."
                : "Leave room for the unknown."}
            </h2>
            {w ? (
              <>
                <p>
                  {w.provider} · {w.timezone}
                  <br />
                  Retrieved {new Date(w.retrievedAt).toLocaleString()} · expires{" "}
                  {new Date(w.expiresAt).toLocaleString()}
                </p>
                {w.days.map((d) => (
                  <article key={d.date}>
                    <h3>{d.date}</h3>
                    <span className="badge">
                      {d.status === "seasonal_estimate"
                        ? "Seasonal estimate — not a forecast"
                        : d.status === "forecast"
                          ? "Forecast"
                          : "Unavailable"}
                    </span>
                    <p>
                      {d.lowC === null ? "Low unknown" : d.lowC + "°C low"} /{" "}
                      {d.highC === null ? "high unknown" : d.highC + "°C high"}{" "}
                      ·{" "}
                      {d.rainChance === null
                        ? "Rain probability unknown"
                        : d.rainChance + "% rain probability"}
                    </p>
                    <p>{d.note}</p>
                  </article>
                ))}
              </>
            ) : (
              <>
                <span className="badge">Weather unavailable</span>
                <p>
                  {connection?.weather
                    ? "Choose a destination and valid dates to request weather."
                    : "No weather provider is connected. We will not invent a forecast or relabel missing data as a seasonal estimate."}
                </p>
              </>
            )}
            <p>
              No weather-based AI outfit has been generated. Your location and
              notes do not establish inventory or delivery before departure.
            </p>
          </div>
          <section className="panel">
            <p className="eyebrow">YOUR PACKING CHECKLIST</p>
            <h2>Pack what matters.</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!item.trim()) return;
                trip.setPacking((s) => [
                  ...s,
                  { id: crypto.randomUUID(), name: item.trim(), packed: false },
                ]);
                setItem("");
              }}
            >
              <label>
                Add a packing item
                <input
                  value={item}
                  maxLength={160}
                  onChange={(e) => setItem(e.target.value)}
                />
              </label>
              <button className="button secondary" disabled={!item.trim()}>
                Add to packing list
              </button>
            </form>
            <div className="travel-packing">
              {trip.packing.map((i) => (
                <div key={i.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={i.packed}
                      onChange={() =>
                        trip.setPacking((s) =>
                          s.map((v) =>
                            v.id === i.id ? { ...v, packed: !v.packed } : v,
                          ),
                        )
                      }
                    />
                    {i.name}
                  </label>
                  <button
                    className="text-button"
                    aria-label={"Remove " + i.name}
                    onClick={() =>
                      trip.setPacking((s) => s.filter((v) => v.id !== i.id))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <p className="fine">
              Your own checklist, not AI recommendations. Editing trip details
              preserves your packed items.
            </p>
          </section>
          <button className="button" onClick={() => go("builder")}>
            Shape my travel look
          </button>
          <button className="button secondary" onClick={() => go("complete")}>
            Find products & professionals
          </button>
        </section>
      </div>
    </div>
  );
}
