from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Component(Contract):
    key: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9_-]+$")
    category: str = Field(min_length=1, max_length=80)
    role: Literal["product", "service", "tool", "accessory"]
    required: bool = True
    quantity_min: Decimal = Field(gt=0, max_digits=10, decimal_places=3)
    quantity_max: Decimal = Field(gt=0, max_digits=10, decimal_places=3)
    unit: Literal["item", "pack", "ml", "g", "appointment"]
    provenance: Literal["user_confirmed"] = "user_confirmed"

    @model_validator(mode="after")
    def quantity_range(self):
        if self.quantity_max < self.quantity_min:
            raise ValueError("quantity_max must be at least quantity_min")
        return self


class NewLook(Contract):
    title: str = Field(min_length=1, max_length=160)
    source_type: Literal["user_authored"] = "user_authored"


class NewRevision(Contract):
    base_revision: int = Field(ge=0)
    components: list[Component] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def unique_components(self):
        keys = [c.key for c in self.components]
        if len(keys) != len(set(keys)):
            raise ValueError("Component keys must be unique")
        return self


class NewOrganization(Contract):
    name: str = Field(min_length=1, max_length=160)


class ConsentChoice(Contract):
    action: Literal["granted", "withdrawn"]


class UserResult(Contract):
    id: UUID


class CreditBalance(Contract):
    available: int = Field(ge=0)
    held: int = Field(ge=0)


class LookResult(NewLook):
    id: UUID


class RevisionResult(Contract):
    id: UUID
    revision_no: int = Field(gt=0)
    content_hash: str = Field(pattern=r"^[0-9a-f]{64}$")


class RevisionRead(RevisionResult):
    components: list[Component]


class OrganizationResult(Contract):
    id: UUID
    name: str


class OrganizationRead(OrganizationResult):
    role: Literal["owner", "catalog_manager", "analyst"]


class ConsentResult(ConsentChoice):
    id: UUID


class PolicyRead(Contract):
    id: UUID
    purpose: str
    version: str
    content: str
