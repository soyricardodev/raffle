import { Link } from "@tanstack/react-router"
import {
  CaretUpDownIcon,
  DesktopIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
} from "@phosphor-icons/react"
import type { AuthSession, UserRole } from "@/features/auth/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { adminNavItems } from "@/features/admin/nav"
import { type ThemeMode, useTheme } from "@/stores/theme"

type AdminSidebarNavProps = {
  session: AuthSession
  siteName: string
  pathname: string
  onLogout: () => void
}

const themeOptions: Array<{ value: ThemeMode; label: string; icon: typeof SunIcon }> = [
  { value: "light", label: "Claro", icon: SunIcon },
  { value: "dark", label: "Oscuro", icon: MoonIcon },
  { value: "system", label: "Sistema", icon: DesktopIcon },
]

function isNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function userInitials(username: string) {
  const parts = username.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}

function roleLabel(role: UserRole) {
  switch (role) {
    case "super_admin":
      return "Super admin"
    case "admin":
      return "Administrador"
  }
}

function AdminSidebarUserMenu({
  session,
  onLogout,
}: {
  session: AuthSession
  onLogout: () => void
}) {
  const { user } = session
  const { mode, setMode } = useTheme()
  const initials = userInitials(user.username)
  const role = roleLabel(user.role)

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            tooltip={user.username}
            className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
          >
            <Avatar size="sm">
              <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate font-medium">{user.username}</span>
              <span className="text-muted-foreground truncate text-xs">{role}</span>
            </div>
            <CaretUpDownIcon className="ml-auto opacity-60" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-64"
          side="top"
          align="start"
          sideOffset={10}
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex flex-col gap-3 p-3">
              <div className="flex items-center gap-3">
                <Avatar size="lg">
                  <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 gap-1">
                  <span className="truncate font-semibold">{user.username}</span>
                  <Badge variant="secondary" className="w-fit">
                    {role}
                  </Badge>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">Sesión activa · Usuario #{user.id}</p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-muted-foreground px-3 py-1.5 text-xs font-medium">
              Apariencia
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={mode} onValueChange={(value) => setMode(value as ThemeMode)}>
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onSelect={onLogout}>
              <SignOutIcon />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

export function AdminSidebarNav({
  session,
  siteName,
  pathname,
  onLogout,
}: AdminSidebarNavProps) {
  const { setOpenMobile, isMobile } = useSidebar()

  function handleNavigate() {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={siteName}>
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">
                {siteName.slice(0, 1).toUpperCase()}
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">{siteName}</span>
                <span className="text-muted-foreground truncate text-xs">Panel admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => {
                const Icon = item.icon
                const active = isNavActive(pathname, item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.name}>
                      <Link to={item.href} onClick={handleNavigate}>
                        <Icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <AdminSidebarUserMenu session={session} onLogout={onLogout} />
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
