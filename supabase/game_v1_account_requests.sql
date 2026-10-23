-- V1 : demande traçable de suppression de compte, sans destruction immédiate.
-- L'utilisateur contrôle uniquement sa demande ; la suppression Auth nécessite
-- une procédure admin et la clôture des transactions associées.
CREATE TABLE IF NOT EXISTS public.account_deletion_requests(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 requested_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'pending'
  CHECK(status IN ('pending','in_review','completed','cancelled')),
 resolved_at timestamptz
);
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_requests FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.my_account_deletion_request()
RETURNS TABLE(status text,requested_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
 SELECT r.status,r.requested_at FROM public.account_deletion_requests r
 WHERE r.user_id=auth.uid() AND auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.my_account_deletion_request() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_account_deletion_request() TO authenticated;

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();created timestamptz;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid)
 THEN RAISE EXCEPTION 'Compte connecté requis';END IF;
 INSERT INTO public.account_deletion_requests(user_id,requested_at,status,resolved_at)
 VALUES(uid,now(),'pending',NULL)
 ON CONFLICT(user_id) DO UPDATE
 SET status=CASE WHEN account_deletion_requests.status='completed'
                THEN account_deletion_requests.status ELSE 'pending' END,
     requested_at=CASE WHEN account_deletion_requests.status='completed'
                  THEN account_deletion_requests.requested_at ELSE now() END,
     resolved_at=CASE WHEN account_deletion_requests.status='completed'
                THEN account_deletion_requests.resolved_at ELSE NULL END
 RETURNING requested_at INTO created;
 RETURN created;
END $$;
REVOKE ALL ON FUNCTION public.request_account_deletion() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

-- Un administrateur habilité contrôle les demandes et purge dans un processus
-- séparé, après traitement des annonces/échanges en cours.
