-- Create missing client profile for the user from logs
INSERT INTO client_profiles (
  keycloak_user_id,
  email,
  first_name,
  last_name,
  user_id
) VALUES (
  'b80e187e-336f-41f9-be80-3bc5292076e4',
  'fmeleard+client@gmail.com',
  'Client',
  'Test',
  'b80e187e-336f-41f9-be80-3bc5292076e4'
);