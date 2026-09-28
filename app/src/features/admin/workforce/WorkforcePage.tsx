import { Activity, ArrowUpRight, Copy, Monitor, Plus, ShieldCheck, Smartphone } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PERMISSIONS, type Permission, permissionAllowedForRole } from "@/lib/workforce-policy"

type Grant = { id?: string; permission: string; raffleId: number | null }
type Session = {
  id: string
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
  lastSeenAt: string | null
  expiresAt: string
}
type Person = {
  id: string
  name: string
  email: string
  role: string
  status: string
  lastLoginAt: string | null
  grants: Grant[]
  sessions: Session[]
}
type Role = { id: string; name: string; permissions: string[] }
type Workforce = { people: Person[]; roles: Role[]; raffles: Raffle[] }
type Raffle = { id: number; name: string }
type Score = {
  id: string
  name: string
  totalActions: number
  approved: number
  rejected: number
  reversed: number
  ticketsAdded: number
  ticketsRemoved: number
  activeSeconds: number
  activeDays: number
  averageDailyHours: number
  dailyActivity: { day: string; activeSeconds: number }[]
}
type Event = {
  id: number
  actorName: string | null
  action: string
  raffleId: number | null
  purchaseId: number | null
  createdAt: string
}
const labels: Record<Permission, string> = {
  "dashboard.read": "Ver inicio",
  "raffles.read": "Ver rifas",
  "raffles.create": "Crear rifas",
  "raffles.edit": "Editar rifas",
  "raffles.lifecycle": "Pausar y publicar rifas",
  "purchases.read": "Ver compras",
  "purchases.approve": "Aprobar compras",
  "purchases.reject": "Rechazar compras",
  "purchases.reverse": "Revertir estado",
  "purchases.tickets.add": "Agregar boletos",
  "purchases.tickets.remove": "Quitar boletos",
  "purchases.tickets.reassign": "Reasignar boletos",
  "purchases.customer.edit": "Editar cliente",
  "payments.read": "Ver cuentas de pago",
  "payments.manage": "Gestionar cuentas de pago",
  "analytics.read": "Ver análisis",
  "emails.read": "Ver correos",
  "emails.manage": "Gestionar correos",
  "settings.read": "Ver configuración",
  "settings.manage": "Editar configuración",
  "push.read": "Ver avisos",
  "push.manage": "Gestionar avisos",
  "workforce.read": "Ver equipo y desempeño",
  "workforce.manage": "Gestionar equipo y accesos",
}
const actionLabels: Record<string, string> = {
  "purchases.approved": "Aprobó una compra",
  "purchases.rejected": "Rechazó una compra",
  "purchases.reversed": "Revirtió una compra",
  "purchases.tickets_added": "Agregó boletos",
  "purchases.tickets_removed": "Quitó boletos",
  "purchases.tickets_reassigned": "Reasignó boletos",
  "purchases.customer_updated": "Actualizó un cliente",
  "workforce.invited": "Invitó a una persona",
  "workforce.disabled": "Desactivó una cuenta",
  "workforce.access_updated": "Cambió accesos",
  "workforce.session_revoked": "Cerró una sesión",
}
const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "short" })
    : "Sin actividad"
const hours = (seconds: number) => `${(seconds / 3600).toFixed(1)} h`
const online = (sessions: Session[]) =>
  sessions.some(
    (session) =>
      session.lastSeenAt && Date.now() - new Date(session.lastSeenAt).getTime() < 120_000,
  )
function device(agent: string | null) {
  if (!agent) return "Dispositivo desconocido"
  const platform = /iPhone/i.test(agent)
    ? "iPhone"
    : /iPad/i.test(agent)
      ? "iPad"
      : /Android/i.test(agent)
        ? "Android"
        : /Windows/i.test(agent)
          ? "Windows"
          : /Macintosh/i.test(agent)
            ? "Mac"
            : /Linux/i.test(agent)
              ? "Linux"
              : "Computadora"
  const browser = /Edg\//i.test(agent)
    ? "Edge"
    : /Firefox\//i.test(agent)
      ? "Firefox"
      : /Chrome\//i.test(agent)
        ? "Chrome"
        : /Safari\//i.test(agent)
          ? "Safari"
          : "Navegador"
  return `${platform} · ${browser}`
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(data?.error?.message ?? data?.message ?? "No se pudo completar la operación")
  return data as T
}
function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{title}</Label>
      {children}
    </div>
  )
}
function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="min-w-0 rounded-3xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="font-heading text-xl font-semibold">{title}</h2>
        {subtitle ? <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}
function NativeSelect({
  value,
  onChange,
  children,
  label,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  label: string
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="border-input bg-background min-h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </select>
  )
}

function GrantEditor({
  grants,
  onChange,
  raffles,
  allowedPermissions,
}: {
  grants: Grant[]
  onChange: (value: Grant[]) => void
  raffles: Raffle[]
  allowedPermissions: readonly Permission[]
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Permisos adicionales</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...grants,
              { id: crypto.randomUUID(), permission: "purchases.approve", raffleId: null },
            ])
          }
        >
          <Plus className="size-4" /> Agregar
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        El rol da permisos generales. Aquí puedes sumar acciones para todas las rifas o una sola.
      </p>
      {grants.map((grant, index) => (
        <div
          key={grant.id}
          className="grid gap-2 rounded-2xl border p-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <NativeSelect
            label="Permiso"
            value={grant.permission}
            onChange={(permission) =>
              onChange(grants.map((g, i) => (i === index ? { ...g, permission } : g)))
            }
          >
            {allowedPermissions.map((permission) => (
              <option key={permission} value={permission}>
                {labels[permission]}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            label="Alcance de rifa"
            value={grant.raffleId?.toString() ?? "all"}
            onChange={(id) =>
              onChange(
                grants.map((g, i) =>
                  i === index ? { ...g, raffleId: id === "all" ? null : Number(id) } : g,
                ),
              )
            }
          >
            <option value="all">Todas las rifas</option>
            {raffles.map((raffle) => (
              <option key={raffle.id} value={raffle.id}>
                {raffle.name}
              </option>
            ))}
          </NativeSelect>
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            onClick={() => onChange(grants.filter((_, i) => i !== index))}
          >
            Quitar
          </Button>
        </div>
      ))}
    </div>
  )
}

export function WorkforcePage() {
  const [tab, setTab] = useState("people")
  const [data, setData] = useState<Workforce | null>(null)
  const [raffles, setRaffles] = useState<Raffle[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("")
  const [inviteGrants, setInviteGrants] = useState<Grant[]>([])
  const [invitationUrl, setInvitationUrl] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [editRole, setEditRole] = useState("")
  const [editStatus, setEditStatus] = useState<"active" | "disabled" | "invited">("active")
  const [editGrants, setEditGrants] = useState<Grant[]>([])
  const [roleName, setRoleName] = useState("")
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [selectedRaffles, setSelectedRaffles] = useState<number[]>([])
  const [days, setDays] = useState("30")
  const [auditPerson, setAuditPerson] = useState("")
  const [auditRaffle, setAuditRaffle] = useState("")
  const [auditHasMore, setAuditHasMore] = useState(false)
  const activeCount = useMemo(
    () => data?.people.filter((person) => online(person.sessions)).length ?? 0,
    [data],
  )

  const refresh = useCallback(async () => {
    const workforce = await api<Workforce>("/api/admin/workforce/")
    setData(workforce)
    setRaffles(workforce.raffles)
    setInviteRole((current) => current || workforce.roles[0]?.id || "")
  }, [])
  useEffect(() => {
    void refresh()
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [refresh])
  useEffect(() => {
    if (tab !== "performance") return
    const params = new URLSearchParams({ days })
    selectedRaffles.forEach((id) => {
      params.append("raffleId", String(id))
    })
    void api<Score[]>(`/api/admin/workforce/performance?${params}`)
      .then(setScores)
      .catch((error) => toast.error(error.message))
  }, [tab, days, selectedRaffles])
  useEffect(() => {
    if (tab !== "audit") return
    const params = new URLSearchParams()
    if (auditPerson) params.set("userId", auditPerson)
    if (auditRaffle) params.set("raffleId", auditRaffle)
    void api<Event[]>(`/api/admin/workforce/audit?${params}`)
      .then((rows) => {
        setEvents(rows)
        setAuditHasMore(rows.length === 100)
      })
      .catch((error) => toast.error(error.message))
  }, [tab, auditPerson, auditRaffle])
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    try {
      await action()
      await refresh()
      toast.success(success)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error")
    } finally {
      setBusy(false)
    }
  }
  function startEdit(person: Person) {
    setEditing(person.id)
    setEditRole(person.role)
    setEditStatus(person.status as "active" | "disabled" | "invited")
    setEditGrants(
      person.grants
        .filter((grant) => permissionAllowedForRole(person.role, grant.permission))
        .map((grant) => ({ permission: grant.permission, raffleId: grant.raffleId })),
    )
  }
  function startRole(role: Role) {
    setEditingRole(role.id)
    setRoleName(role.name)
    setRolePermissions(
      role.permissions.filter((permission) => permissionAllowedForRole(role.id, permission)),
    )
  }
  if (loading)
    return <div className="text-muted-foreground py-16 text-center">Cargando equipo…</div>
  if (!data)
    return (
      <div className="rounded-2xl border p-6">
        No se pudo cargar el equipo. Comprueba tus permisos.
      </div>
    )
  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-5 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-primary mb-1 text-xs font-semibold tracking-[.16em] uppercase">
            Administración · Personas
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Equipo y actividad</h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">
            Cada cuenta tiene sus propios accesos, sesiones y acciones registradas.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
          <span className="relative flex size-2.5">
            <span className="bg-emerald-500 absolute inline-flex size-full animate-ping rounded-full opacity-25" />
            <span className="bg-emerald-500 relative inline-flex size-2.5 rounded-full" />
          </span>
          <span className="text-sm font-medium">{activeCount} en línea</span>
          <span className="text-muted-foreground text-xs">de {data.people.length} personas</span>
        </div>
      </div>
      <NativeSelect label="Sección del equipo" value={tab} onChange={setTab}>
        <option value="people">Personas y sesiones</option>
        <option value="roles">Roles y permisos</option>
        <option value="performance">Rendimiento</option>
        <option value="audit">Registro de actividad</option>
      </NativeSelect>
      {tab === "people" ? (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-3">
            {data.people.map((person) => (
              <div
                key={person.id}
                className="min-w-0 rounded-3xl border bg-card p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-2xl font-heading font-bold">
                    {person.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{person.name}</h2>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${online(person.sessions) ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}
                      >
                        {person.status === "disabled"
                          ? "Desactivado"
                          : person.status === "invited"
                            ? "Invitado"
                            : online(person.sessions)
                              ? "En línea"
                              : "Sin conexión"}
                      </span>
                    </div>
                    <p className="text-muted-foreground truncate text-sm">{person.email}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Último acceso: {formatDate(person.lastLoginAt)}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {data.roles.find((role) => role.id === person.role)?.name ??
                        (person.role === "super_admin" ? "Acceso total" : person.role)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={person.role === "super_admin"}
                    onClick={() => (editing === person.id ? setEditing(null) : startEdit(person))}
                  >
                    Acceso
                  </Button>
                </div>
                <div className="mt-4 border-t pt-3">
                  <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-medium">
                    <Monitor className="size-4" /> Sesiones ({person.sessions.length})
                  </div>
                  {person.sessions.length ? (
                    person.sessions.map((session) => (
                      <div key={session.id} className="flex items-center gap-2 py-1.5 text-xs">
                        {/iPhone|Android|iPad|Mobile|Tablet/i.test(session.userAgent ?? "") ? (
                          <Smartphone className="text-muted-foreground size-4 shrink-0" />
                        ) : (
                          <Monitor className="text-muted-foreground size-4 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {device(session.userAgent)} ·{" "}
                          {formatDate(session.lastSeenAt ?? session.createdAt)}
                          {session.lastSeenAt &&
                          Date.now() - new Date(session.lastSeenAt).getTime() < 120_000
                            ? " · Activo"
                            : ""}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          className="text-destructive min-h-10 px-2 font-medium"
                          onClick={() =>
                            void run(
                              () =>
                                api(`/api/admin/workforce/sessions/${session.id}`, {
                                  method: "DELETE",
                                }),
                              "Sesión cerrada",
                            )
                          }
                        >
                          Cerrar
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      No hay dispositivos con sesión abierta.
                    </p>
                  )}
                </div>
                {person.status === "invited" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const result = await api<{ invitationUrl: string }>(
                          `/api/admin/workforce/${person.id}/invitation`,
                          { method: "POST" },
                        )
                        setInvitationUrl(result.invitationUrl)
                        await navigator.clipboard.writeText(result.invitationUrl)
                        toast.success("Nuevo enlace copiado")
                      }, "Invitación renovada")
                    }
                  >
                    Renovar enlace
                  </Button>
                ) : null}
                {editing === person.id ? (
                  <div className="mt-4 space-y-4 rounded-2xl bg-muted/40 p-4">
                    <Field title="Rol">
                      <NativeSelect
                        label="Rol de la persona"
                        value={editRole}
                        onChange={(role) => {
                          setEditRole(role)
                          setEditGrants((grants) =>
                            grants.filter((grant) =>
                              permissionAllowedForRole(role, grant.permission),
                            ),
                          )
                        }}
                      >
                        {data.roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field title="Estado">
                      <NativeSelect
                        label="Estado de la cuenta"
                        value={editStatus}
                        onChange={(value) =>
                          setEditStatus(value as "active" | "disabled" | "invited")
                        }
                      >
                        {person.status !== "invited" ? (
                          <option value="active">Activa</option>
                        ) : (
                          <option value="invited">Invitación pendiente</option>
                        )}
                        <option value="disabled">Desactivada, cerrar todas las sesiones</option>
                      </NativeSelect>
                    </Field>
                    <GrantEditor
                      grants={editGrants}
                      onChange={setEditGrants}
                      raffles={raffles}
                      allowedPermissions={PERMISSIONS.filter((permission) =>
                        permissionAllowedForRole(editRole, permission),
                      )}
                    />
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await api(`/api/admin/workforce/${person.id}`, {
                            method: "PUT",
                            body: JSON.stringify({
                              role: editRole,
                              status: editStatus,
                              grants: editGrants,
                            }),
                          })
                          setEditing(null)
                        }, "Acceso actualizado")
                      }
                    >
                      Guardar acceso
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <Section
            title="Invitar a alguien"
            subtitle="Prepara su cuenta y comparte el enlace por el canal que prefieras. No se enviará un correo automático."
          >
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void run(async () => {
                  const result = await api<{ invitationUrl: string }>("/api/admin/workforce/", {
                    method: "POST",
                    body: JSON.stringify({
                      name: inviteName,
                      email: inviteEmail,
                      role: inviteRole,
                      grants: inviteGrants,
                    }),
                  })
                  setInvitationUrl(result.invitationUrl)
                  setInviteName("")
                  setInviteEmail("")
                  setInviteGrants([])
                }, "Invitación creada")
              }}
            >
              <Field title="Nombre">
                <Input
                  required
                  value={inviteName}
                  onChange={(event) => setInviteName(event.target.value)}
                  placeholder="Nombre y apellido"
                />
              </Field>
              <Field title="Correo">
                <Input
                  required
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="persona@empresa.com"
                />
              </Field>
              <Field title="Rol">
                <NativeSelect
                  label="Rol inicial"
                  value={inviteRole}
                  onChange={(role) => {
                    setInviteRole(role)
                    setInviteGrants((grants) =>
                      grants.filter((grant) => permissionAllowedForRole(role, grant.permission)),
                    )
                  }}
                >
                  {data.roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <GrantEditor
                grants={inviteGrants}
                onChange={setInviteGrants}
                raffles={raffles}
                allowedPermissions={PERMISSIONS.filter((permission) =>
                  permissionAllowedForRole(inviteRole, permission),
                )}
              />
              <Button type="submit" disabled={busy || !inviteRole} className="w-full">
                <Plus className="size-4" /> Crear invitación
              </Button>
            </form>
            {invitationUrl ? (
              <div className="bg-primary/5 mt-5 space-y-2 rounded-2xl p-4">
                <p className="text-sm font-medium">Enlace listo · vence en 7 días</p>
                <p className="text-muted-foreground break-all text-xs">{invitationUrl}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(invitationUrl)
                      .then(() => toast.success("Enlace copiado"))
                  }
                >
                  <Copy className="size-4" /> Copiar enlace
                </Button>
              </div>
            ) : null}
          </Section>
        </div>
      ) : null}
      {tab === "roles" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-3">
            {data.roles.map((role) => (
              <div key={role.id} className="flex items-start gap-3 rounded-3xl border bg-card p-4">
                <ShieldCheck className="text-primary mt-1 size-5" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{role.name}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {role.permissions.length} permisos ·{" "}
                    {data.people.filter((person) => person.role === role.id).length} personas
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                    {role.permissions.map((p) => labels[p as Permission] ?? p).join(" · ") ||
                      "Sin permisos base"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => startRole(role)}>
                  Editar
                </Button>
              </div>
            ))}
          </div>
          <Section
            title={editingRole ? "Editar rol" : "Nuevo rol"}
            subtitle="Los cambios del rol aplican a todas las personas que lo usan."
          >
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void run(async () => {
                  await api(
                    editingRole
                      ? `/api/admin/workforce/roles/${editingRole}`
                      : "/api/admin/workforce/roles",
                    {
                      method: editingRole ? "PUT" : "POST",
                      body: JSON.stringify({ name: roleName, permissions: rolePermissions }),
                    },
                  )
                  setEditingRole(null)
                  setRoleName("")
                  setRolePermissions([])
                }, "Rol guardado")
              }}
            >
              <Field title="Nombre">
                <Input
                  required
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  placeholder="Ej. Verificador de pagos"
                />
              </Field>
              <div className="max-h-80 space-y-1 overflow-auto rounded-2xl border p-2">
                {editingRole === "operator" ? (
                  <p className="text-muted-foreground px-3 py-2 text-xs">
                    Este rol solo puede usar Compras y Buscar boleto. Para otras secciones, crea
                    otro rol.
                  </p>
                ) : null}
                {PERMISSIONS.filter((permission) =>
                  permissionAllowedForRole(editingRole, permission),
                ).map((permission) => (
                  <label
                    key={permission}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={rolePermissions.includes(permission)}
                      onChange={(event) =>
                        setRolePermissions(
                          event.target.checked
                            ? [...rolePermissions, permission]
                            : rolePermissions.filter((p) => p !== permission),
                        )
                      }
                      className="size-4 accent-primary"
                    />
                    <span>{labels[permission]}</span>
                  </label>
                ))}
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {editingRole ? "Guardar rol" : "Crear rol"}
              </Button>
              {editingRole ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setEditingRole(null)
                    setRoleName("")
                    setRolePermissions([])
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
            </form>
          </Section>
        </div>
      ) : null}
      {tab === "performance" ? (
        <div className="space-y-5">
          <Section
            title="Comparar rendimiento"
            subtitle="Acciones registradas en compras y tiempo activo estimado por latidos de la sesión. Una pestaña inactiva no suma horas."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field title="Período">
                <NativeSelect label="Período" value={days} onChange={setDays}>
                  <option value="7">Últimos 7 días</option>
                  <option value="30">Últimos 30 días</option>
                  <option value="90">Últimos 90 días</option>
                  <option value="365">Último año</option>
                </NativeSelect>
              </Field>
              <Field title="Rifas">
                <details className="relative">
                  <summary className="border-input flex min-h-11 cursor-pointer items-center rounded-xl border px-3 text-sm">
                    {selectedRaffles.length
                      ? `${selectedRaffles.length} rifas seleccionadas`
                      : "Todas las rifas"}
                  </summary>
                  <div className="bg-popover absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border p-2 shadow-xl">
                    <button
                      type="button"
                      className="min-h-10 w-full text-left text-sm"
                      onClick={() => setSelectedRaffles([])}
                    >
                      Todas las rifas
                    </button>
                    {raffles.map((raffle) => (
                      <label key={raffle.id} className="flex min-h-10 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedRaffles.includes(raffle.id)}
                          onChange={(event) =>
                            setSelectedRaffles(
                              event.target.checked
                                ? [...selectedRaffles, raffle.id]
                                : selectedRaffles.filter((id) => id !== raffle.id),
                            )
                          }
                        />
                        {raffle.name}
                      </label>
                    ))}
                  </div>
                </details>
              </Field>
            </div>
          </Section>
          <div className="grid gap-3 md:grid-cols-2">
            {scores.map((score, index) => (
              <div key={score.id} className="rounded-3xl border bg-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">
                      #{index + 1} · Rendimiento
                    </p>
                    <h3 className="font-heading mt-1 text-xl font-semibold">{score.name}</h3>
                  </div>
                  <span className="text-primary font-heading text-3xl font-bold">
                    {score.totalActions}
                  </span>
                </div>
                <div className="bg-muted mt-4 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{
                      width: `${scores[0]?.totalActions ? Math.max(3, (score.totalActions / scores[0].totalActions) * 100) : 0}%`,
                    }}
                  />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <strong className="block text-lg">{score.approved}</strong>Aprobó
                  </div>
                  <div>
                    <strong className="block text-lg">{score.rejected}</strong>Rechazó
                  </div>
                  <div>
                    <strong className="block text-lg">{score.reversed}</strong>Revirtió
                  </div>
                </div>
                <p className="text-muted-foreground mt-3 text-xs">
                  {score.ticketsAdded} boletos agregados · {score.ticketsRemoved} quitados
                </p>
                <div className="text-muted-foreground mt-4 flex items-center gap-2 border-t pt-3 text-xs">
                  <Activity className="size-4" />
                  {hours(score.activeSeconds)} activo · {score.averageDailyHours} h/día en{" "}
                  {score.activeDays} días
                </div>
                {score.dailyActivity.length ? (
                  <div
                    className="mt-3 flex h-12 items-end gap-1"
                    role="img"
                    aria-label="Actividad diaria"
                  >
                    {score.dailyActivity.slice(-30).map((day) => (
                      <div
                        key={day.day}
                        title={`${day.day}: ${hours(day.activeSeconds)}`}
                        className="bg-primary/70 min-w-1 flex-1 rounded-t-sm"
                        style={{
                          height: `${Math.max(4, Math.min(100, (day.activeSeconds / 28800) * 100))}%`,
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {tab === "audit" ? (
        <Section
          title="Registro de acciones"
          subtitle="Cada cambio se atribuye a una cuenta. Explora el historial por persona o rifa."
        >
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <NativeSelect label="Filtrar por persona" value={auditPerson} onChange={setAuditPerson}>
              <option value="">Todas las personas</option>
              {data.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect label="Filtrar por rifa" value={auditRaffle} onChange={setAuditRaffle}>
              <option value="">Todas las rifas</option>
              {raffles.map((raffle) => (
                <option key={raffle.id} value={raffle.id}>
                  {raffle.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="divide-y">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 py-3">
                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                  <ArrowUpRight className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <strong>{event.actorName ?? "Cuenta eliminada"}</strong> ·{" "}
                    {actionLabels[event.action] ?? event.action}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {[
                      event.raffleId ? `Rifa #${event.raffleId}` : null,
                      event.purchaseId ? `Compra #${event.purchaseId}` : null,
                      formatDate(event.createdAt),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            ))}
            {auditHasMore ? (
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams()
                  if (auditPerson) params.set("userId", auditPerson)
                  if (auditRaffle) params.set("raffleId", auditRaffle)
                  params.set("before", String(events.at(-1)?.id ?? 0))
                  void api<Event[]>(`/api/admin/workforce/audit?${params}`)
                    .then((rows) => {
                      setEvents((current) => [...current, ...rows])
                      setAuditHasMore(rows.length === 100)
                    })
                    .catch((error) => toast.error(error.message))
                }}
              >
                Ver eventos anteriores
              </Button>
            ) : null}
            {events.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">Aún no hay eventos.</p>
            ) : null}
          </div>
        </Section>
      ) : null}
    </div>
  )
}
