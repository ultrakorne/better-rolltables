import { BRTCONFIG } from '../core/config.js'
import VersionCheck from './version-check.js'

/**
 * Based on https://github.com/Moerill/mess
 * modified by Forien
 */
class WelcomeScreen extends Application {
  static get defaultOptions () {
    const title = game.modules.get(BRTCONFIG.NAMESPACE).data.title
    return mergeObject(super.defaultOptions, {
      template: `modules/${BRTCONFIG.NAMESPACE}/templates/welcome-screen.html`,
      resizable: true,
      width: 450,
      height: 636,
      classes: ['welcome-screen'],
      title: `${title} - Welcome Screen`
    })
  }

  getData (options = {}) {
    options = super.getData(options)
    options.isChecked = !VersionCheck.check(BRTCONFIG.NAMESPACE)
    return options
  }

  activateListeners (html) {
    super.activateListeners(html)

    html.find('.show-again').on('change', event => {
      let version = '0.0.0'
      if (event.currentTarget.checked) { version = VersionCheck.get(BRTCONFIG.NAMESPACE) }
      VersionCheck.set(BRTCONFIG.NAMESPACE, version)
    })
  }
}

export default function renderWelcomeScreen () {
  (new WelcomeScreen()).render(true)
}
