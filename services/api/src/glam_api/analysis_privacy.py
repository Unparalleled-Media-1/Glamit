"""Erase private correction values and unlink only the affected canonical analysis selection."""

from sqlalchemy import text


def redact_analysis_dependents(db, job_id):
    # The preceding deployed schema can still run while candidate0017 is pending.
    if db.scalar(text("SELECT to_regclass('public.analysis_correction')")) is not None:
        db.execute(
            text(
                """
UPDATE analysis_correction SET corrections=NULL,redacted_at=clock_timestamp() WHERE
job_id=:id AND redacted_at IS NULL
"""
            ),
            {"id": job_id},
        )
    if db.scalar(text("SELECT to_regclass('public.style_passport_analysis')")) is not None:
        passports = db.scalars(
            text("DELETE FROM style_passport_analysis WHERE job_id=:id RETURNING passport_id"),
            {"id": job_id},
        ).all()
        for passport_id in passports:
            db.execute(
                text(
                    "UPDATE style_passports SET revision=revision+1,updated_at=clock_timestamp() "
                    "WHERE id=:id"
                ),
                {"id": passport_id},
            )
