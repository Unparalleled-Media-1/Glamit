"""Catalog facts are reviewed merchant assertions, never image-model guesses."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, HttpUrl, model_validator

from glam_api.workspaces import Strict

Category = Literal[
    "cosmetics", "hair", "skincare", "clothing", "footwear", "accessories", "tool", "service"
]
Currency = Literal["ZAR", "USD", "EUR", "GBP"]
Tag = Annotated[str, Field(pattern=r"^[a-z0-9][a-z0-9-]{0,47}$")]
Country = Annotated[str, Field(pattern=r"^[A-Z]{2}$")]
Minor = Annotated[int, Field(strict=True, ge=0, le=100000000000)]


class ListingFacts(Strict):
    title: str = Field(min_length=1, max_length=160, pattern=r".*\S.*")
    description: str = Field(default="", max_length=3000)
    category: Category
    tags: list[Tag] = Field(min_length=1, max_length=20)
    source_sku: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$")
    source_ref: str = Field(min_length=1, max_length=160, pattern=r".*\S.*")
    currency: Currency
    price_minor: Annotated[int, Field(strict=True, gt=0, le=100000000000)]
    shipping_minor: Minor | None = None
    tax_minor: Minor | None = None
    other_costs_minor: Minor | None = None
    stock_quantity: Annotated[int, Field(strict=True, ge=0, le=1000000000)] = 0
    accepting_requests: bool = False
    countries: list[Country] = Field(min_length=1, max_length=100)
    offer_expires_at: AwareDatetime
    purchase_url: HttpUrl
    condition: Literal["new", "used", "refurbished", "rental"] = "new"

    @model_validator(mode="after")
    def safe_facts(self):
        if (
            self.purchase_url.scheme != "https"
            or self.purchase_url.username
            or self.purchase_url.password
        ):
            raise ValueError("Use a reviewed HTTPS destination without embedded credentials")
        if len(set(self.tags)) != len(self.tags) or len(set(self.countries)) != len(self.countries):
            raise ValueError("Tags and countries must be unique")
        return self


class NewListing(Strict):
    facts: ListingFacts


class BulkListings(Strict):
    listings: list[NewListing] = Field(min_length=1, max_length=50)


class BulkPublicationItem(Strict):
    listing_id: UUID
    revision: int = Field(ge=1)


class BulkPublication(Strict):
    listings: list[BulkPublicationItem] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def distinct(self):
        if len({item.listing_id for item in self.listings}) != len(self.listings):
            raise ValueError("Bulk publication listing IDs must be unique")
        return self


class RevisionChoice(NewListing):
    expected_revision: int = Field(ge=1)
    merchant_reviewed: Literal[True]


class ReviewChoice(Strict):
    decision: Literal["approved", "rejected"]
    identifier_verified: bool = False


class ListingRead(Strict):
    id: UUID
    organization_id: UUID
    current_revision: int
    published_revision: int | None
    state: Literal["draft", "published", "withdrawn"]
    facts: ListingFacts
    merchant_reviewed: bool
    decision: str | None


class PublishChoice(Strict):
    revision: int = Field(ge=1)


class Requirement(Strict):
    context: Literal[
        "face", "hair", "skin", "body-fit", "color", "makeup-match", "makeover", "routine"
    ]
    category: Category
    tags: list[Tag] = Field(min_length=1, max_length=20)
    country: Country
    currency: Currency
    source_sku: str | None = Field(default=None, min_length=1, max_length=80)
    source_organization_id: UUID | None = None
    budget_minor: Minor | None = None

    @model_validator(mode="after")
    def distinct_tags(self):
        if len(set(self.tags)) != len(self.tags):
            raise ValueError("Tags must be unique")
        return self


class Match(Strict):
    listing_id: UUID
    revision: int
    title: str
    merchant: str
    category: Category
    match_type: Literal["Exact", "Similar"]
    condition: Literal["new", "used", "refurbished"] | None
    source: Literal["reviewed_merchant_assertion"] = "reviewed_merchant_assertion"
    currency: Currency
    price_minor: int
    delivered_total_minor: int | None
    purchase_url: HttpUrl
    offer_expires_at: datetime
    service_quote_required: bool


class MatchResult(Strict):
    organic: list[Match]
    sponsored: list[Match]
    message: str


class SavedRead(Strict):
    id: UUID
    requirement: Requirement


Feature = Literal[
    "background", "lighting", "description", "tags", "ocr", "translation", "advertising"
]


class EnhancementRequest(Strict):
    expected_revision: int = Field(ge=1)
    features: list[
        Literal[
            "background", "lighting", "description", "tags", "ocr", "translation", "advertising"
        ]
    ] = Field(min_length=1, max_length=7)


class Derivative(Strict):
    original_id: UUID
    storage_ref: str = Field(min_length=1, max_length=300)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    advertising: bool = False


class Suggestions(Strict):
    completed_features: list[Feature] = Field(min_length=1, max_length=7)
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(max_length=3000)
    tags: list[Tag] = Field(max_length=20)
    warnings: list[str] = Field(min_length=1, max_length=20)
    derivatives: list[Derivative] = Field(default_factory=list, max_length=12)


class JobRead(Strict):
    id: UUID
    state: Literal["queued", "processing", "review_ready", "failed", "cancelled"]
    suggestions: Suggestions | None = None
