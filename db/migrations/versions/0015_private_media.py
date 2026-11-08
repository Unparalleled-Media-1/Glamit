"""Private photo intents and a server-mediated private Storage bucket (approval required)."""

from pathlib import Path

from alembic import op

revision = "0015_private_media"
down_revision = "0014_creator_studio"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(Path(__file__).with_suffix(".sql").read_text())


def downgrade():
    # Never remove valuable bytes or metadata as an automatic rollback side effect.
    op.execute("""
      LOCK TABLE public.private_media IN ACCESS EXCLUSIVE MODE;
      SELECT id FROM storage.buckets WHERE id='glam-private-media' FOR UPDATE;
      DO $$ BEGIN
        IF EXISTS(SELECT 1 FROM public.private_media) OR
           EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='glam-private-media') THEN
          RAISE EXCEPTION 'Private media rollback requires an empty registry and bucket';
        END IF;
        IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='glam-private-media') THEN
          RAISE EXCEPTION 'Remove the empty bucket through the Storage API before rollback';
        END IF;
      END $$;
      DROP TABLE public.private_media;
      DROP POLICY glam_private_media_server_only ON storage.objects;
    """)
