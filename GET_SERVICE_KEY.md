# Comment obtenir la bonne clé service_role

## Option 1 : Webhook Edge Function Direct (Recommandé)

1. Dans la configuration du webhook, changez le type de :
   - **HTTP Request** → **Supabase Edge Functions**
2. Sélectionnez `handle-new-user`
3. Sauvegardez

## Option 2 : Obtenir la vraie clé service_role

1. Allez sur : https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/settings/api
2. Dans la section **Service role key**, copiez la clé complète
3. Dans le webhook, mettez :
   - Header name : `Authorization`
   - Header value : `Bearer [LA_CLÉ_COPIÉE]`

## Option 3 : Alternative sans webhook

Si le webhook continue à ne pas fonctionner, nous pouvons utiliser une autre approche :

### Utiliser un Database Function au lieu d'un webhook

Créez cette fonction dans le SQL Editor de Supabase :

```sql
-- Fonction qui sera appelée après chaque INSERT sur auth.users
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user RECORD;
BEGIN
  -- Récupérer le dernier utilisateur créé
  SELECT * INTO new_user 
  FROM auth.users 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF new_user.id IS NOT NULL THEN
    -- Créer le profil général
    INSERT INTO public.profiles (
      id, email, role, first_name, last_name
    ) VALUES (
      new_user.id,
      new_user.email,
      COALESCE(new_user.raw_user_meta_data->>'role', 'candidate')::app_role,
      COALESCE(new_user.raw_user_meta_data->>'first_name', ''),
      COALESCE(new_user.raw_user_meta_data->>'last_name', '')
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Si candidat, créer le profil candidat
    IF COALESCE(new_user.raw_user_meta_data->>'role', 'candidate') = 'candidate' THEN
      INSERT INTO public.candidate_profiles (
        id, email, first_name, last_name, status, qualification_status, seniority, daily_rate, password_hash
      ) VALUES (
        new_user.id,
        new_user.email,
        COALESCE(new_user.raw_user_meta_data->>'first_name', ''),
        COALESCE(new_user.raw_user_meta_data->>'last_name', ''),
        'disponible',
        'pending',
        'junior',
        0,
        ''
      ) ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;
END;
$$;
```

Puis créez un webhook qui appelle cette fonction RPC au lieu de l'Edge Function.