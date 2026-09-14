/**
 * The nudge to make an account, and the rules that keep it a nudge.
 *
 * Cards live in local storage until there is an account, and local storage is
 * one cleared browser away from gone. That is worth saying. It is not worth
 * saying in a dialog that has to be dismissed before the app can be used, so
 * this is a toast: it appears beside the work, it never takes focus, and it
 * carries its own off switch.
 *
 * Three rules, so it stays welcome:
 *
 * - **Never while signed in.** There is nothing to remind anyone of.
 * - **Never twice in a week**, unless the user asked to be reminded later.
 * - **Never again once they say so.** A choice that is not honoured is not a
 *   choice, and this is the kind of prompt people learn to resent.
 *
 * First visit is the exception to the second rule: it fires with no cards,
 * because that is the moment to explain where cards are about to be kept.
 */

const SEEN_KEY = 'juka.signin.lastShown'
const NEVER_KEY = 'juka.signin.never'
const GREETED_KEY = 'juka.signin.greeted'

/** A week. Often enough to matter, rare enough not to nag. */
const QUIET_PERIOD = 7 * 24 * 60 * 60 * 1000

/** A few seconds in, so it lands after the page has settled rather than over it. */
const DELAY = 2500

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  }
  catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  }
  catch { /* private mode; the reminder simply repeats next session */ }
}

export function useSignInReminder() {
  const { t } = useI18n()
  const toast = useToast()
  const session = useSession()
  const store = useCardStore()

  let timer: ReturnType<typeof setTimeout> | undefined
  /** Opened by the toast's own action, read by the header's auth dialog. */
  const requested = useState('juka:signin-requested', () => false)

  function silence() {
    write(NEVER_KEY, '1')
  }

  function remindLater() {
    // Recorded as shown now, so the quiet period restarts from this moment.
    write(SEEN_KEY, String(Date.now()))
  }

  function show(firstVisit: boolean) {
    toast.add({
      title: firstVisit ? t('reminder.welcomeTitle') : t('reminder.title'),
      description: firstVisit
        ? t('reminder.welcomeBody')
        : t('reminder.body', { count: store.cards.value.length }),
      icon: 'i-lucide-cloud-upload',
      // Long enough to read and act on, short enough that ignoring it works.
      duration: 12000,
      actions: [
        {
          label: t('auth.signIn'),
          color: 'primary',
          onClick: () => {
            remindLater()
            requested.value = true
          }
        },
        {
          label: t('reminder.later'),
          color: 'neutral',
          variant: 'ghost',
          onClick: remindLater
        },
        {
          label: t('reminder.never'),
          color: 'neutral',
          variant: 'ghost',
          onClick: silence
        }
      ]
    })

    write(SEEN_KEY, String(Date.now()))
  }

  /** Decides whether to nudge, and when. Safe to call on every page load. */
  function schedule() {
    if (import.meta.server) {
      return
    }

    clearTimeout(timer)

    timer = setTimeout(() => {
      if (session.signedIn.value || read(NEVER_KEY)) {
        return
      }

      const firstVisit = !read(GREETED_KEY)

      if (firstVisit) {
        write(GREETED_KEY, '1')
        show(true)
        return
      }

      // Nothing to lose yet, so nothing to warn about.
      if (store.cards.value.length === 0) {
        return
      }

      const last = Number(read(SEEN_KEY) ?? 0)
      if (Number.isFinite(last) && Date.now() - last < QUIET_PERIOD) {
        return
      }

      show(false)
    }, DELAY)
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return { schedule, requested }
}
