-- Script pour créer un compte admin
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. D'abord, inscrivez-vous normalement avec fmeleard@gmail.com / R@ymonde7510
-- 2. Puis exécutez ce script pour changer le rôle en admin

-- Mettre à jour le profil pour être admin (remplacez l'email par le bon)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'fmeleard@gmail.com';

-- Vérifier que le changement a été effectué
SELECT email, role, first_name, last_name 
FROM profiles 
WHERE email = 'fmeleard@gmail.com';