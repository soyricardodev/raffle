-- Keep purchase capabilities the administrator selected, but revoke access
-- to every other module from the built-in operator role on existing installs.
UPDATE staff_roles
SET permissions = (
  SELECT coalesce(json_group_array(value), '[]')
  FROM json_each(staff_roles.permissions)
  WHERE value LIKE 'purchases.%'
)
WHERE id = 'operator';
