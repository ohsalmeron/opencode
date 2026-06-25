import { createEffect, createMemo, Suspense, type ParentProps } from "solid-js"
import { useNavigate, useParams } from "@solidjs/router"
import { DebugBar } from "@/components/debug-bar"
import { HelpButton } from "@/components/help-button"
import { Titlebar, type TitlebarUpdate } from "@/components/titlebar"
import { useCommand } from "@/context/command"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { useGlobal } from "@/context/global"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { useNotification } from "@/context/notification"
import { PermissionProvider } from "@/context/permission"
import { usePlatform } from "@/context/platform"
import { ServerConnection } from "@/context/server"
import { ServerSDKProvider } from "@/context/server-sdk"
import { ServerSyncProvider } from "@/context/server-sync"
import { setNavigate } from "@/utils/notification-click"
import { setV2Toast, ToastRegion } from "@/utils/toast"

export default function NewLayout(props: ParentProps) {
  const command = useCommand()
  const dialog = useDialog()
  const global = useGlobal()
  const language = useLanguage()
  const layout = useLayout()
  const platform = usePlatform()
  const notification = useNotification()
  const navigate = useNavigate()
  const params = useParams<{ id?: string }>()
  setNavigate(navigate)

  const settingsServer = createMemo(() => {
    const route = layout.route()
    if (route.type === "home") return undefined
    const key = route.server
    if (!key) return undefined
    return global.servers.list().find((item) => ServerConnection.key(item) === key)
  })
  const settingsSessionID = createMemo(() => {
    const route = layout.route()
    if (route.type !== "session") return undefined
    return route.sessionId
  })

  createEffect(() => setV2Toast(true))
  createEffect(() => {
    if (!notification.ready() || !params.id) return
    if (notification.session.unseenCount(params.id) === 0) return
    notification.session.markViewed(params.id)
  })

  command.register("layout", () => [
    {
      id: "settings.open",
      title: language.t("command.settings.open"),
      category: language.t("command.category.settings"),
      keybind: "mod+comma",
      onSelect: () => {
        void import("@/components/settings-v2").then((x) => {
          void dialog.show(() => (
            <ServerSDKProvider server={settingsServer}>
              <ServerSyncProvider server={settingsServer}>
                <PermissionProvider>
                  <x.DialogSettings sessionID={settingsSessionID()} />
                </PermissionProvider>
              </ServerSyncProvider>
            </ServerSDKProvider>
          ))
        })
      },
    },
  ])

  const update: TitlebarUpdate = {
    version: () => {
      const state = platform.updater?.state()
      if (state?.status !== "ready") return
      return state.version
    },
    installing: () => platform.updater?.state().status === "installing",
    install: () => void platform.updater?.install(),
  }

  return (
    <div
      class="relative bg-v2-background-bg-deep flex-1 min-h-0 min-w-0 flex flex-col select-none [&_input]:select-text [&_textarea]:select-text [&_[contenteditable]]:select-text"
      style={{
        "padding-top": "env(safe-area-inset-top, 0px)",
        "padding-bottom": "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <Titlebar update={update} />
      <main class="flex-1 min-h-0 min-w-0 overflow-x-hidden flex flex-col items-start contain-strict">
        <Suspense>{props.children}</Suspense>
      </main>
      {import.meta.env.DEV && <DebugBar />}
      <HelpButton />
      <ToastRegion v2 />
    </div>
  )
}
