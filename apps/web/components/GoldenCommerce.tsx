"use client";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Page } from "../../../packages/product/platform";
import type { Journey } from "../../../packages/product/journey";
import { changePart } from "../../../packages/product/journey";
import {
  editorialProducts,
  productMoods,
} from "../../../packages/product/editorial-products";
import { BeautyIcon } from "./BeautyExperience";
type Props = {
  page: "shop" | "product";
  data: Journey;
  setData: Dispatch<SetStateAction<Journey>>;
  selected: number;
  select: (n: number) => void;
  go: (p: Page) => void;
  studio: () => void;
};
export default function GoldenCommerce(p: Props) {
  const [category, setCategory] = useState("All");
  const [mood, setMood] = useState(0);
  const [locationOpen, setLocationOpen] = useState(false);
  const [country, setCountry] = useState(p.data.country);
  const [city, setCity] = useState(p.data.city);
  const [currency, setCurrency] = useState(p.data.currency);
  const dialog = useRef<HTMLDialogElement>(null);
  const locationButton = useRef<HTMLButtonElement>(null);
  const item = editorialProducts[p.selected] || editorialProducts[0];
  useEffect(() => {
    if (locationOpen) dialog.current?.showModal();
    else if (dialog.current?.open) {
      dialog.current.close();
      locationButton.current?.focus();
    }
  }, [locationOpen]);
  const openLocation = () => {
    setCountry(p.data.country);
    setCity(p.data.city);
    setCurrency(p.data.currency);
    setLocationOpen(true);
  };
  const image = (panel: number, extra = "") => (
    <div
      className={"golden-product-art product-study-" + panel + " " + extra}
      role="img"
      aria-label="Original unbranded editorial product study, not a purchasable listing"
    />
  );
  const location = (
    <button
      ref={locationButton}
      className="golden-location"
      onClick={openLocation}
    >
      <span className="golden-location-dot" />
      <span>
        {p.data.city || p.data.country || "Choose shopping destination"}
        <small>{p.data.currency} · Your selection</small>
      </span>
      <BeautyIcon />
    </button>
  );
  return (
    <div className="golden-commerce">
      {p.page === "shop" ? (
        <>
          <header className="golden-shop-heading">
            <div>
              <p className="golden-overline">THE BEAUTY EDIT</p>
              <h1>
                Objects of
                <br />
                <em>everyday beauty.</em>
              </h1>
              <p>
                A little color. A daily ritual. A direction to make your own.
              </p>
            </div>
            {location}
          </header>
          <section className="golden-shop-feature">
            <div className="golden-shop-feature-copy">
              <span className="golden-overline">A STUDY IN EXPRESSION</span>
              <h2>
                A little color.
                <br />A lasting impression.
              </h2>
              <p>Discover the textures and tones behind your next look.</p>
              <button
                onClick={() => {
                  p.select(0);
                  p.go("product");
                }}
                className="golden-dark-button"
              >
                Explore the lip study
                <BeautyIcon />
              </button>
            </div>
            {image(0)}
            <span className="golden-sample-label">
              EDITORIAL STUDY / NOT FOR SALE
            </span>
          </section>
          <div className="golden-collection-header">
            <div>
              <p className="golden-overline">CURATED FOR EXPLORATION</p>
              <h2>
                The small things,
                <br />
                <em>beautifully considered.</em>
              </h2>
            </div>
            <div
              className="golden-collection-tabs"
              role="group"
              aria-label="Product study categories"
            >
              {["All", "Makeup", "Skincare", "Hair"].map((v) => (
                <button
                  aria-pressed={category === v}
                  onClick={() => setCategory(v)}
                  key={v}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="golden-product-grid">
            {editorialProducts.map((v, i) =>
              category === "All" || v.category === category ? (
                <button
                  key={v.id}
                  className="golden-product-card"
                  aria-label={"View " + v.name}
                  onClick={() => {
                    p.select(i);
                    setMood(0);
                    p.go("product");
                  }}
                >
                  <div className="golden-product-picture">
                    {image(v.panel)}
                    <span>
                      <BeautyIcon />
                    </span>
                  </div>
                  <p>{v.category} / Editorial sample</p>
                  <h3>{v.name}</h3>
                  <span>{v.kind} · No verified offer</span>
                </button>
              ) : null,
            )}
          </div>
          <section className="golden-offer-boundary">
            <div>
              <BeautyIcon kind="scan" />
              <h3>Real offers need real evidence.</h3>
              <p>
                Merchant identity, price, variants, stock and delivery will
                appear only with qualified listings.
              </p>
            </div>
            <div>
              <strong>Best Matches</strong>
              <span>No verified catalog connected.</span>
              <strong>Sponsored</strong>
              <span>
                No qualified placements. Sponsorship never replaces suitability.
              </span>
            </div>
            <button
              className="golden-text-button"
              onClick={() => p.go("complete")}
            >
              Open Get This Look <BeautyIcon />
            </button>
          </section>
        </>
      ) : (
        <>
          <div className="golden-product-topline">
            <button className="golden-text-button" onClick={() => p.go("shop")}>
              Back to the beauty edit
            </button>
            <span>EDITORIAL PRODUCT STUDY</span>
          </div>
          <div className="golden-detail-layout">
            <section className="golden-detail-visual">
              {image(item.panel)}
              <span className="golden-sample-label">
                SAMPLE PACKAGING / NOT FOR SALE
              </span>
              <span className="golden-art-index">0{item.panel + 1} / 04</span>
            </section>
            <section className="golden-detail-copy">
              <p className="golden-overline">
                {item.category.toUpperCase()} / A GLAM STUDY
              </p>
              <h1>{item.name}</h1>
              <p className="golden-detail-description">{item.description}</p>
              <div className="golden-price-status">
                <strong>Offer not verified</strong>
                <span>
                  Illustration only. No price, merchant or stock is claimed.
                </span>
              </div>
              <div className="golden-detail-moods">
                <span>Explore a color mood</span>
                <div>
                  {productMoods.map((v, i) => (
                    <button
                      aria-label={v.name + " reference color"}
                      aria-pressed={mood === i}
                      key={v.name}
                      onClick={() => setMood(i)}
                      style={
                        { "--reference-color": v.color } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
                <p>
                  {productMoods[mood].name} · An illustrative reference, not a
                  verified product variant. The product image is unchanged.
                </p>
              </div>
              {location}
              <div className="golden-product-actions">
                <button className="golden-dark-button" onClick={p.studio}>
                  Explore in AI Studio
                  <BeautyIcon kind="spark" />
                </button>
                <button
                  className="golden-outline-button"
                  onClick={() => {
                    if (item.part) {
                      p.setData((s) =>
                        changePart(
                          s,
                          item.part,
                          `${item.name} ${productMoods[mood].name} editorial reference — product unverified`,
                        ),
                      );
                      p.go("builder");
                    } else p.go("guide");
                  }}
                >
                  {item.part
                    ? "Use as a " + item.part.toLowerCase() + " reference"
                    : "Plan my skincare routine"}
                  <BeautyIcon />
                </button>
                <button className="golden-unavailable" disabled>
                  Purchase requires a verified offer
                </button>
              </div>
              <details className="golden-product-disclosure">
                <summary>Merchant, availability & delivered total</summary>
                <p>
                  No merchant or current offer is connected. Stock, sizes, shade
                  variants, shipping, tax and total delivered cost are unknown.
                  A reference color is not evidence of compatibility or an exact
                  match.
                </p>
              </details>
              <details className="golden-product-disclosure">
                <summary>Try-on & privacy</summary>
                <p>
                  Studio preserves your original photo. Personal generation and
                  comparison require a qualified provider. No product is applied
                  to your photo by selecting this editorial study.
                </p>
              </details>
              <details className="golden-product-disclosure">
                <summary>Returns, fit & commission</summary>
                <p>
                  No seller policy or fit guarantee is verified for this sample.
                  The established 10% completed-item-sale commission remains in
                  the central server policy; it is not an added sample price or
                  a service-booking rate.
                </p>
              </details>
            </section>
          </div>
        </>
      )}
      <dialog
        className="golden-location-dialog"
        ref={dialog}
        onCancel={() => setLocationOpen(false)}
        onClose={() => setLocationOpen(false)}
        aria-labelledby="golden-location-title"
      >
        <div className="golden-dialog-heading">
          <h2 id="golden-location-title">Where should your look take you?</h2>
          <button
            autoFocus
            aria-label="Close shopping destination"
            className="golden-text-button"
            onClick={() => setLocationOpen(false)}
          >
            Close
          </button>
        </div>
        <p>
          Choose your shopping destination. No device location is collected or
          guessed.
        </p>
        <label>
          Shopping country
          <input
            value={country}
            maxLength={160}
            onChange={(e) => setCountry(e.target.value)}
          />
        </label>
        <label>
          Shopping city
          <input
            value={city}
            maxLength={160}
            onChange={(e) => setCity(e.target.value)}
          />
        </label>
        <label>
          Shopping currency
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {["ZAR", "USD", "GBP", "EUR"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <p className="golden-caption">
          Currency is your preference, not a conversion or market-availability
          guarantee.
        </p>
        <button
          className="golden-dark-button"
          onClick={() => {
            p.setData((s) => ({
              ...s,
              country: country.trim(),
              city: city.trim(),
              currency,
            }));
            setLocationOpen(false);
          }}
        >
          Use this destination
          <BeautyIcon />
        </button>
      </dialog>
    </div>
  );
}
