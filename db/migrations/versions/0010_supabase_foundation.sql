-- Canonical application continuation from0008. Stripe sandbox0009 stays a sibling.
-- Supabase Auth is required; it is never recreated by this migration.
DO $$ BEGIN
  IF to_regclass('auth.users') IS NULL OR to_regprocedure('auth.uid()') IS NULL
     OR to_regprocedure('auth.jwt()') IS NULL THEN
    RAISE EXCEPTION 'Supabase Auth schema/functions are required';
  END IF;
END $$;

-- Rename existing entities: never create competing organization stores.
ALTER TABLE public.organization RENAME TO organizations;
ALTER TABLE public.organization_member RENAME TO organization_members;
ALTER TABLE public.organizations ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.organization_members ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.organization_members ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.organization_members ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
-- Retain the UUID composite PK referenced by workspace_role; add a stable UUID row ID.
CREATE INDEX organization_members_user ON public.organization_members(user_id, organization_id);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text CHECK (display_name IS NULL OR length(display_name) BETWEEN 1 AND 160),
  avatar_object_key text CHECK (avatar_object_key IS NULL OR length(avatar_object_key)<=512),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  locale text NOT NULL DEFAULT 'en' CHECK(length(locale) BETWEEN 2 AND 35),
  currency text NOT NULL DEFAULT 'USD' CHECK(currency ~ '^[A-Z]{3}$'),
  measurement_system text NOT NULL DEFAULT 'metric' CHECK(measurement_system IN ('metric','imperial')),
  personalization_opt_in boolean NOT NULL DEFAULT false,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.style_passports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_colors text[] NOT NULL DEFAULT '{}',
  preferred_styles text[] NOT NULL DEFAULT '{}',
  coverage_preference text CHECK(coverage_preference IS NULL OR length(coverage_preference)<=240),
  sizing_notes text CHECK(sizing_notes IS NULL OR length(sizing_notes)<=1000),
  revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(cardinality(preferred_colors)<=30 AND cardinality(preferred_styles)<=30)
);
CREATE TABLE public.merchant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id),
  display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 160),
  verification_status text NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending','verified','rejected','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id, organization_id)
);
CREATE TABLE public.professional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id),
  display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 160),
  bio text CHECK(bio IS NULL OR length(bio)<=4000),
  verification_status text NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending','verified','rejected','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.product_categories(id),
  slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 160),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(parent_id IS NULL OR parent_id<>id)
);
CREATE INDEX product_categories_parent ON public.product_categories(parent_id);
CREATE TABLE public.products (
  -- One product detail per existing canonical listing, not a duplicate catalog authority.
  id uuid PRIMARY KEY REFERENCES public.catalog_listing(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  merchant_profile_id uuid NOT NULL,
  category_id uuid REFERENCES public.product_categories(id),
  title text NOT NULL CHECK(length(title) BETWEEN 1 AND 240),
  description text CHECK(description IS NULL OR length(description)<=10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,organization_id),
  FOREIGN KEY(id,organization_id) REFERENCES public.catalog_listing(id,organization_id),
  FOREIGN KEY(merchant_profile_id,organization_id) REFERENCES public.merchant_profiles(id,organization_id)
);
CREATE INDEX products_org ON public.products(organization_id);
CREATE INDEX products_merchant ON public.products(merchant_profile_id);
CREATE INDEX products_category ON public.products(category_id);
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  sku text NOT NULL CHECK(length(sku) BETWEEN 1 AND 160),
  shade text CHECK(shade IS NULL OR length(shade)<=160),
  size_label text CHECK(size_label IS NULL OR length(size_label)<=100),
  currency text CHECK(currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  unit_price_minor bigint CHECK(unit_price_minor IS NULL OR unit_price_minor>=0),
  stock_on_hand integer CHECK(stock_on_hand IS NULL OR stock_on_hand>=0),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,sku),
  FOREIGN KEY(product_id,organization_id) REFERENCES public.products(id,organization_id),
  CHECK((unit_price_minor IS NULL)=(currency IS NULL))
);
CREATE INDEX product_variants_product ON public.product_variants(product_id,organization_id);
CREATE INDEX product_variants_org ON public.product_variants(organization_id);

CREATE SCHEMA glam_private;
REVOKE ALL ON SCHEMA glam_private FROM PUBLIC;
GRANT USAGE ON SCHEMA glam_private TO authenticated;
CREATE FUNCTION glam_private.current_app_user_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT u.id FROM public.app_user u
      WHERE u.subject=auth.uid()::text AND u.issuer=auth.jwt()->>'iss' $$;
CREATE FUNCTION glam_private.is_org_member(org_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
  WHERE m.organization_id=org_id AND m.user_id=glam_private.current_app_user_id()
    AND m.active AND NOT o.suspended
) $$;
REVOKE ALL ON FUNCTION glam_private.current_app_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION glam_private.is_org_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION glam_private.current_app_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION glam_private.is_org_member(uuid) TO authenticated;

CREATE FUNCTION glam_private.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION glam_private.touch_updated_at() FROM PUBLIC;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','organizations','organization_members','user_preferences',
    'style_passports','merchant_profiles','professional_profiles','product_categories','products','product_variants']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon,authenticated',t);
    EXECUTE format('CREATE TRIGGER touch_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION glam_private.touch_updated_at()',t);
  END LOOP;
END $$;

GRANT SELECT,INSERT ON public.profiles TO authenticated;
GRANT UPDATE(display_name,avatar_object_key) ON public.profiles TO authenticated;
CREATE POLICY profiles_select_self ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid());
CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK(id=auth.uid());
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());

GRANT SELECT,INSERT,DELETE ON public.user_preferences,public.style_passports TO authenticated;
GRANT UPDATE(locale,currency,measurement_system,personalization_opt_in,marketing_opt_in) ON public.user_preferences TO authenticated;
GRANT UPDATE(preferred_colors,preferred_styles,coverage_preference,sizing_notes,revision) ON public.style_passports TO authenticated;
CREATE POLICY preferences_select_self ON public.user_preferences FOR SELECT TO authenticated USING(profile_id=auth.uid());
CREATE POLICY preferences_insert_self ON public.user_preferences FOR INSERT TO authenticated WITH CHECK(profile_id=auth.uid());
CREATE POLICY preferences_update_self ON public.user_preferences FOR UPDATE TO authenticated USING(profile_id=auth.uid()) WITH CHECK(profile_id=auth.uid());
CREATE POLICY preferences_delete_self ON public.user_preferences FOR DELETE TO authenticated USING(profile_id=auth.uid());
CREATE POLICY passports_select_self ON public.style_passports FOR SELECT TO authenticated USING(profile_id=auth.uid());
CREATE POLICY passports_insert_self ON public.style_passports FOR INSERT TO authenticated WITH CHECK(profile_id=auth.uid());
CREATE POLICY passports_update_self ON public.style_passports FOR UPDATE TO authenticated USING(profile_id=auth.uid()) WITH CHECK(profile_id=auth.uid());
CREATE POLICY passports_delete_self ON public.style_passports FOR DELETE TO authenticated USING(profile_id=auth.uid());

-- Organization, catalog publication and verification writes stay behind existing authorized APIs.
GRANT SELECT ON public.organizations,public.organization_members,public.merchant_profiles,
 public.professional_profiles,public.products,public.product_variants TO authenticated;
CREATE POLICY organizations_read_member ON public.organizations FOR SELECT TO authenticated USING(glam_private.is_org_member(id));
CREATE POLICY members_read_org ON public.organization_members FOR SELECT TO authenticated USING(glam_private.is_org_member(organization_id));
CREATE POLICY merchants_read_org ON public.merchant_profiles FOR SELECT TO authenticated USING(glam_private.is_org_member(organization_id));
CREATE POLICY professionals_read_org ON public.professional_profiles FOR SELECT TO authenticated USING(glam_private.is_org_member(organization_id));
CREATE POLICY products_read_org ON public.products FOR SELECT TO authenticated USING(glam_private.is_org_member(organization_id));
CREATE POLICY variants_read_org ON public.product_variants FOR SELECT TO authenticated USING(glam_private.is_org_member(organization_id));
GRANT SELECT ON public.product_categories TO anon,authenticated;
CREATE POLICY categories_read_active ON public.product_categories FOR SELECT TO anon,authenticated USING(is_active);
