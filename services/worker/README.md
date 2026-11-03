# Worker boundary

The initial privacy worker is packaged with the domain code to share the transaction and policy definitions: `uv run python -m glam_api.worker` from the repository root.

It handles `privacy.consent_withdrawn.v1` for the implemented private manual-look store, using PostgreSQL row locks/SKIP LOCKED and the same deletion transaction as acknowledgement. Unknown event types remain pending. This is not a provider dispatcher, general broker or complete media deletion service. External object storage, AI adapters, dead-letter handling and downstream credit event consumers remain gated backlog work. No live process is assumed to survive a new cloud task.
