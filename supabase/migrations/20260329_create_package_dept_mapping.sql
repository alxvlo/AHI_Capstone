-- Migration: Create PACKAGE_DEPT_MAPPING table and seed basic workflows
-- Purpose: Unblock Iteration 2 automated visit creation by defining package queues

-- 1. Create junction table
CREATE TABLE IF NOT EXISTS public.package_department (
  packageid bigint not null,
  departmentid bigint not null,
  isactive boolean not null default true,
  createdat timestamp with time zone not null default now(),
  CONSTRAINT package_department_pkey PRIMARY KEY (packageid, departmentid),
  CONSTRAINT package_department_packageid_fkey FOREIGN KEY (packageid) REFERENCES public.package (packageid) ON DELETE CASCADE,
  CONSTRAINT package_department_departmentid_fkey FOREIGN KEY (departmentid) REFERENCES public.department (departmentid) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 2. Enable RLS
ALTER TABLE public.package_department ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Enable read access for all users" ON public.package_department FOR SELECT USING (true);

CREATE POLICY "Enable write access for system roles" ON public.package_department FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_account ua
    JOIN public.role r ON ua.roleid = r.roleid
    WHERE ua.userid = auth.uid() AND r.issystemrole = true
  )
);

-- 4. Seed baseline packages
INSERT INTO public.package (packagename, category, description, isactive)
SELECT 'Basic PEME (Local)', 'Pre-Employment', 'Standard physical, lab, and X-ray for local employment.', true
WHERE NOT EXISTS (SELECT 1 FROM public.package WHERE packagename = 'Basic PEME (Local)');

INSERT INTO public.package (packagename, category, description, isactive)
SELECT 'Comprehensive Seafarer', 'Sea-based', 'Complete maritime medical checkup including audiometry and PFT.', true
WHERE NOT EXISTS (SELECT 1 FROM public.package WHERE packagename = 'Comprehensive Seafarer');

INSERT INTO public.package (packagename, category, description, isactive)
SELECT 'Food Handler Package', 'Specialized', 'Focused on lab and physical exam for food handling compliance.', true
WHERE NOT EXISTS (SELECT 1 FROM public.package WHERE packagename = 'Food Handler Package');

-- 5. Seed package department mappings (Routing logic)
-- Map Basic PEME (Local) -> Reception, Billing, Lab, XRay, Phys Exam
WITH pkg AS (SELECT packageid FROM public.package WHERE packagename = 'Basic PEME (Local)')
INSERT INTO public.package_department (packageid, departmentid)
SELECT pkg.packageid, d.departmentid
FROM pkg, public.department d
WHERE d.code IN ('RECEPTION', 'BILLING', 'LAB', 'XRAY', 'PHYS_EXAM')
ON CONFLICT DO NOTHING;

-- Map Comprehensive Seafarer -> All standard + AUD + PFT + ECG + Dental
WITH pkg AS (SELECT packageid FROM public.package WHERE packagename = 'Comprehensive Seafarer')
INSERT INTO public.package_department (packageid, departmentid)
SELECT pkg.packageid, d.departmentid
FROM pkg, public.department d
WHERE d.code IN ('RECEPTION', 'BILLING', 'LAB', 'XRAY', 'AUD', 'PFT', 'ECG', 'DENTAL', 'PHYS_EXAM')
ON CONFLICT DO NOTHING;

-- Map Food Handler Package -> Reception, Billing, Lab, Phys Exam
WITH pkg AS (SELECT packageid FROM public.package WHERE packagename = 'Food Handler Package')
INSERT INTO public.package_department (packageid, departmentid)
SELECT pkg.packageid, d.departmentid
FROM pkg, public.department d
WHERE d.code IN ('RECEPTION', 'BILLING', 'LAB', 'PHYS_EXAM')
ON CONFLICT DO NOTHING;
