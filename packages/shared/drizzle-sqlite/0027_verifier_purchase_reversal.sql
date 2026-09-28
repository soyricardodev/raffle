-- Rejection was already part of verifier defaults; also grant reversal to
-- every existing verifier without replacing administrator-added permissions.
UPDATE staff_roles
SET permissions = (
  SELECT json_group_array(permission)
  FROM (
    SELECT value AS permission FROM json_each(staff_roles.permissions)
    UNION
    SELECT 'purchases.reject'
    UNION
    SELECT 'purchases.reverse'
  )
)
WHERE id = 'verifier';
