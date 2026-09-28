-- Existing verifier accounts inherit the expanded role without touching users or grants.
-- Preserve permissions administrators have already assigned to the role.
UPDATE staff_roles
SET permissions = (
  SELECT json_group_array(permission)
  FROM (
    SELECT value AS permission FROM json_each(staff_roles.permissions)
    UNION
    SELECT 'purchases.approve'
    UNION
    SELECT 'purchases.tickets.add'
    UNION
    SELECT 'purchases.tickets.remove'
  )
)
WHERE id = 'verifier';
